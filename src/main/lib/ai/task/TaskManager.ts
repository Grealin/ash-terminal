import type {
  AiMessage,
  AiMode,
  AiProviderConfig,
  AiTask,
  CreateTaskParams,
  MessageRole,
  StreamChunk,
  ToolCall
} from '@shared/models'
import { ToolCallStatus } from '@shared/models'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { getAiConfig, getProviders } from '../../aiConfigStore'
import * as TaskStoreAPI from '../storage/TaskStore'
import { ProviderFactory } from '../providers'
import { ToolRegistry } from '../tools'

/**
 * 任务管理器：负责 AI 任务的完整生命周期管理
 *
 * 核心职责
 * - Agent 模式：工具调用、多轮对话、自动执行
 * - Ask 模式：单轮问答、无工具调用
 * - 上下文管理：token 限制、消息裁剪
 * - 流式响应：实时输出、事件通知
 */
export class TaskManager extends EventEmitter {
  private toolRegistry: ToolRegistry

  constructor() {
    super()
    this.toolRegistry = new ToolRegistry()
  }

  /**
   * 创建新任务（Agent  Ask 模式）
   */
  async createTask(params: CreateTaskParams): Promise<AiTask> {
    const taskId = uuidv4()
    const task: AiTask = {
      id: taskId,
      sessionId: params.sessionId,
      mode: params.mode,
      title: params.title || this._generateTaskTitle(params.mode, params.initialMessage),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDraft: params.isDraft ?? false,
      archived: false
    }

    // 添加初始用户消息
    if (params.initialMessage) {
      const userMessage: AiMessage = {
        id: uuidv4(),
        taskId,
        role: 'user' as MessageRole,
        content: params.initialMessage,
        timestamp: Date.now()
      }
      task.messages.push(userMessage)
    }

    await TaskStoreAPI.createTask(task)
    this.emit('task:created', task)
    return task
  }

  /**
   * 执行 Agent 模式任务（带工具调用）
   */
  async runAgentTask(taskId: string, userMessage?: string): Promise<void> {
    const task = await TaskStoreAPI.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.mode !== 'agent') {
      throw new Error('Task mode must be "agent"')
    }

    // 添加新用户消息（如果有）
    if (userMessage) {
      await this._addUserMessage(taskId, userMessage)
    }

    // 获取 AI 配置
    const aiConfig = await getAiConfig()
    if (!aiConfig || !aiConfig.activeProviderId) {
      throw new Error('No active AI provider configured')
    }

    const providers = await getProviders()
    const activeProvider = providers.find(
      (p: AiProviderConfig) => p.id === aiConfig.activeProviderId
    )
    if (!activeProvider) {
      throw new Error('Active provider not found')
    }

    const provider = ProviderFactory.createProvider(activeProvider)
    const tools = this.toolRegistry.getAllDefinitions()

    // 准备上下文消息（裁剪）
    const messages = await this._prepareContextMessages(
      taskId,
      aiConfig.userSettings.context.maxMessages
    )

    // 添加系统提示（包含用户自定义提示）
    const systemPrompt = this._buildSystemPrompt(task.sessionId, aiConfig.userSettings.userPrompt)
    messages.unshift({
      id: uuidv4(),
      taskId,
      role: 'system' as MessageRole,
      content: systemPrompt,
      timestamp: Date.now()
    })

    // 开 AI 对话循环
    let iterationCount = 0
    const maxIterations = 10 // 防止无限循环

    while (iterationCount < maxIterations) {
      iterationCount++

      try {
        // 调用 AI（流式响应）
        const assistantMessage = await this._streamAIResponse(provider, messages, tools, taskId)

        // 检查是否有工具调用
        if (!assistantMessage.toolCalls || assistantMessage.toolCalls.length === 0) {
          // 无工具调用，任务完成
          break
        }

        // 执行工具调用
        const toolResults = await this._executeToolCalls(
          task.sessionId,
          assistantMessage.toolCalls,
          taskId,
          aiConfig.userSettings.autoApproval.enabled
        )

        // 将工具结果添加到消息列表
        for (const result of toolResults) {
          const toolMessage: AiMessage = {
            id: uuidv4(),
            taskId,
            role: 'tool' as MessageRole,
            content: JSON.stringify(result),
            toolCallId: result.id,
            timestamp: Date.now()
          }
          messages.push(toolMessage)
          await TaskStoreAPI.addMessage(taskId, toolMessage)
        }

        // 继续下一轮对话
      } catch (error) {
        this.emit('task:error', { taskId, error })
        throw error
      }
    }

    if (iterationCount >= maxIterations) {
      this.emit('task:warning', { taskId, message: 'Max iterations reached' })
    }

    this.emit('task:completed', { taskId })
  }

  /**
   * 执行 Ask 模式任务（纯问答）
   */
  async runAskTask(taskId: string, userMessage?: string): Promise<void> {
    const task = await TaskStoreAPI.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.mode !== 'ask') {
      throw new Error('Task mode must be "ask"')
    }

    // 添加新用户消息（如果有）
    if (userMessage) {
      await this._addUserMessage(taskId, userMessage)
    }

    // 获取 AI 配置
    const aiConfig = await getAiConfig()
    if (!aiConfig || !aiConfig.activeProviderId) {
      throw new Error('No active AI provider configured')
    }

    const providers = await getProviders()
    const activeProvider = providers.find(
      (p: AiProviderConfig) => p.id === aiConfig.activeProviderId
    )
    if (!activeProvider) {
      throw new Error('Active provider not found')
    }

    const provider = ProviderFactory.createProvider(activeProvider)

    // 准备上下文消息（裁剪）
    const messages = await this._prepareContextMessages(
      taskId,
      aiConfig.userSettings.context.maxMessages
    )

    // 添加系统提示
    const systemPrompt = this._buildSystemPrompt(task.sessionId, aiConfig.userSettings.userPrompt)
    messages.unshift({
      id: uuidv4(),
      taskId,
      role: 'system' as MessageRole,
      content: systemPrompt,
      timestamp: Date.now()
    })

    try {
      // 调用 AI（不传工具，纯问答）
      await this._streamAIResponse(provider, messages, undefined, taskId)
      this.emit('task:completed', { taskId })
    } catch (error) {
      this.emit('task:error', { taskId, error })
      throw error
    }
  }

  /**
   * 流式调用 AI 并保存响
   */
  private async _streamAIResponse(
    provider: any,
    messages: AiMessage[],
    tools: any[] | undefined,
    taskId: string
  ): Promise<AiMessage> {
    const assistantMessageId = uuidv4()
    let accumulatedContent = ''
    const toolCalls: ToolCall[] = []

    // 监听流式数据
    provider.on('data', (chunk: StreamChunk) => {
      if (chunk.type === 'content') {
        accumulatedContent += chunk.data
        this.emit('task:stream', { taskId, messageId: assistantMessageId, content: chunk.data })
      } else if (chunk.type === 'tool_call') {
        const toolCall: ToolCall = {
          id: chunk.data.id,
          name: chunk.data.name,
          arguments: chunk.data.arguments,
          status: ToolCallStatus.PENDING,
          timestamp: Date.now()
        }
        toolCalls.push(toolCall)
        this.emit('task:tool_call', { taskId, toolCall })
      }
    })

    // 等待流式响应完成
    await provider.chat(messages, tools)

    // 保存助手消息
    const assistantMessage: AiMessage = {
      id: assistantMessageId,
      taskId,
      role: 'assistant' as MessageRole,
      content: accumulatedContent,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      timestamp: Date.now()
    }

    messages.push(assistantMessage)
    await TaskStoreAPI.addMessage(taskId, assistantMessage)

    return assistantMessage
  }

  /**
   * 执行工具调用（带自动批准逻辑）
   */
  private async _executeToolCalls(
    sessionId: string,
    toolCalls: ToolCall[],
    taskId: string,
    autoApproval: boolean
  ): Promise<ToolCall[]> {
    const results: ToolCall[] = []

    for (const toolCall of toolCalls) {
      try {
        const tool = this.toolRegistry.getTool(toolCall.name)
        if (!tool) {
          toolCall.status = ToolCallStatus.FAILED
          toolCall.result = `Unknown tool: ${toolCall.name}`
          results.push(toolCall)
          continue
        }

        // 检查是否需要用户批准
        if (tool.getDefinition().requiresApproval && !autoApproval) {
          toolCall.status = ToolCallStatus.PENDING
          this.emit('tool:approval_required', { taskId, toolCall })
          // 等待用户批准（通过外部调用 approveToolCall）
          continue
        }

        // 执行工具
        const context = { sessionId, toolCallId: toolCall.id, autoApprove: autoApproval }
        const result = await tool.execute(context, toolCall.arguments)
        toolCall.status = ToolCallStatus.SUCCESS
        toolCall.result = JSON.stringify(result)
        results.push(toolCall)
        this.emit('tool:executed', { taskId, toolCall })
      } catch (error) {
        toolCall.status = ToolCallStatus.FAILED
        toolCall.result = error instanceof Error ? error.message : String(error)
        results.push(toolCall)
        this.emit('tool:failed', { taskId, toolCall, error })
      }
    }

    return results
  }

  /**
   * 手动批准工具调用
   */
  async approveToolCall(taskId: string, toolCallId: string): Promise<void> {
    const task = await TaskStoreAPI.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // 查找 pending 状态的工具调用
    const lastAssistantMessage = [...task.messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.toolCalls)

    if (!lastAssistantMessage || !lastAssistantMessage.toolCalls) {
      throw new Error('No tool calls found')
    }

    const toolCall = lastAssistantMessage.toolCalls.find((tc) => tc.id === toolCallId)
    if (!toolCall) {
      throw new Error(`Tool call ${toolCallId} not found`)
    }

    if (toolCall.status !== 'pending') {
      throw new Error(`Tool call ${toolCallId} is not pending`)
    }

    // 执行工具
    const tool = this.toolRegistry.getTool(toolCall.name)
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found`)
    }

    try {
      const context = { sessionId: task.sessionId, toolCallId, autoApprove: true }
      const result = await tool.execute(context, toolCall.arguments)
      toolCall.status = ToolCallStatus.SUCCESS
      toolCall.result = JSON.stringify(result)

      // 更新消息（由于没有 updateMessage，这里跳过或重新添加）
      // // Update not supported in current TaskStore

      // 添加工具结果消息
      const toolMessage: AiMessage = {
        id: uuidv4(),
        taskId,
        role: 'tool' as MessageRole,
        content: JSON.stringify(toolCall),
        toolCallId: toolCall.id,
        timestamp: Date.now()
      }
      await TaskStoreAPI.addMessage(taskId, toolMessage)

      this.emit('tool:approved', { taskId, toolCall })

      // 继续执行任务
      await this.runAgentTask(taskId)
    } catch (error) {
      toolCall.status = ToolCallStatus.FAILED
      toolCall.result = error instanceof Error ? error.message : String(error)
      // Update not supported in current TaskStore
      this.emit('tool:failed', { taskId, toolCall, error })
      throw error
    }
  }

  /**
   * 拒绝工具调用
   */
  async rejectToolCall(taskId: string, toolCallId: string, reason?: string): Promise<void> {
    const task = await TaskStoreAPI.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const lastAssistantMessage = [...task.messages]
      .reverse()
      .find((m) => m.role === 'assistant' && m.toolCalls)

    if (!lastAssistantMessage || !lastAssistantMessage.toolCalls) {
      throw new Error('No tool calls found')
    }

    const toolCall = lastAssistantMessage.toolCalls.find((tc) => tc.id === toolCallId)
    if (!toolCall) {
      throw new Error(`Tool call ${toolCallId} not found`)
    }

    toolCall.status = ToolCallStatus.REJECTED
    toolCall.result = reason || 'Rejected by user'

    // Update not supported in current TaskStore

    // 添加工具结果消息
    const toolMessage: AiMessage = {
      id: uuidv4(),
      taskId,
      role: 'tool' as MessageRole,
      content: JSON.stringify(toolCall),
      toolCallId: toolCall.id,
      timestamp: Date.now()
    }
    await TaskStoreAPI.addMessage(taskId, toolMessage)

    this.emit('tool:rejected', { taskId, toolCall })

    // 继续执行任务（AI 会看到被拒绝的工具调用）
    await this.runAgentTask(taskId)
  }

  /**
   * 准备上下文消息（裁剪）
   */
  private async _prepareContextMessages(taskId: string, contextSize: number): Promise<AiMessage[]> {
    const task = await TaskStoreAPI.getTask(taskId)
    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // 简单裁剪：保留最 N 条消
    const messages = task.messages.slice(-contextSize)
    return messages
  }

  /**
   * 构建系统提示
   */
  private _buildSystemPrompt(sessionId: string, userPrompt?: string): string {
    const basePrompt = `你是一个专业的 Linux 系统管理助手 
你正在通过 SSH 连接到远程服务器（Session ID: ${sessionId}） 
你可以执行文件操作、目录浏览、命令执行等任务 

工作原则 
1. 在执行操作前，先思考是否需要额外信息
2. 使用工具时，提供清晰的参数和理由
3. 命令执行失败时，分析原因并尝试替代方案
4. 涉及文件修改时，先备份重要文件
5. 权限不足时，询问是否使用 sudo`

    if (userPrompt) {
      return `${basePrompt}\n\n用户自定义要求：\n${userPrompt}`
    }

    return basePrompt
  }

  /**
   * 生成任务标题
   */
  private _generateTaskTitle(mode: AiMode, initialMessage?: string): string {
    if (initialMessage) {
      return initialMessage.slice(0, 30) + (initialMessage.length > 30 ? '...' : '')
    }
    return mode === 'agent' ? 'New Agent Task' : 'New Ask'
  }

  /**
   * 添加用户消息
   */
  private async _addUserMessage(taskId: string, content: string): Promise<void> {
    const message: AiMessage = {
      id: uuidv4(),
      taskId,
      role: 'user' as MessageRole,
      content,
      timestamp: Date.now()
    }
    await TaskStoreAPI.addMessage(taskId, message)
  }

  /**
   * 获取任务统计
   */
  async getStatistics(): Promise<any> {
    return await TaskStoreAPI.getTaskStatistics({})
  }

  /**
   * 获取任务（代理方法）
   */
  async getTask(taskId: string): Promise<AiTask | null> {
    return await TaskStoreAPI.getTask(taskId)
  }

  /**
   * 获取任务列表（代理方法）
   */
  async getTasks(params: any): Promise<AiTask[]> {
    const result = await TaskStoreAPI.getTasks(params)
    return result.tasks
  }

  /**
   * 更新任务（代理方法）
   */
  async updateTask(taskId: string, updates: Partial<AiTask>): Promise<void> {
    await TaskStoreAPI.updateTask(taskId, updates)
  }

  /**
   * 删除任务（代理方法）
   */
  async deleteTask(taskId: string): Promise<void> {
    await TaskStoreAPI.deleteTask(taskId)
  }

  /**
   * 归档任务（代理方法）
   */
  async archiveTask(taskId: string): Promise<void> {
    await TaskStoreAPI.archiveTask(taskId, true)
  }

  /**
   * 添加消息（代理方法）
   */
  async addMessage(taskId: string, message: AiMessage): Promise<void> {
    await TaskStoreAPI.addMessage(taskId, message)
  }

  /**
   * 更新消息（代理方法）
   * Note: TaskStore doesn't support updateMessage, would need to implement via delete+add
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateMessage(_taskId: string, _messageId: string, _message: AiMessage): Promise<void> {
    // TODO: Implement as delete + add when needed
    throw new Error('updateMessage not yet implemented')
  }

  /**
   * 删除消息（代理方法）
   */
  async deleteMessage(taskId: string, messageId: string): Promise<void> {
    await TaskStoreAPI.deleteMessage(taskId, messageId)
  }
}
