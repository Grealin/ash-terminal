import { getActiveProvider, getAiConfig } from '@/lib/AiConfigStore'
import { AgentConfig, AiMode, MessageRole } from '@shared/models/AI'
import {
  ChatCompletionChunk,
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionResponse
} from '@shared/models/OpenAICompatible'
import { EventEmitter } from 'events'
import OpenAI from 'openai'
import { getPTYWorkingDirectory } from '@/lib/WorkingDirectory'
import { taskStoreManager } from '../storage/TaskStore'
import { ToolContext } from '../tools/BaseTool'
import { toolManager } from '../tools/ToolManager'
import { classifyApiError, createUserStopError } from './AiErrorHandler'
import { PromptProvider } from './Prompt'

/**
 * Agent 事件类型
 */
export enum AgentEvent {
  /** 接收到消息流片段 */
  STREAM = 'stream',
  /** 思考过程 */
  THOUGHT = 'thought',
  /** 工具调用 */
  TOOL_CALL = 'tool-call',
  /** 工具执行结果 */
  TOOL_RESULT = 'tool-result',
  /** 最终回答 */
  ANSWER = 'answer',
  /** 错误 */
  ERROR = 'error',
  /** 完成 */
  DONE = 'done'
}

/**
 * 智能 Agent 核心类
 * 使用 OpenAI SDK 实现 AI 对话和工具调用
 */
export class Agent extends EventEmitter {
  private config: AgentConfig
  private openai: OpenAI | null = null
  private conversationHistory: ChatCompletionMessage[] = []
  private promptProvider: PromptProvider
  private isRunning: boolean = false
  private taskStore: ReturnType<typeof taskStoreManager.getStore>
  private currentAbortController: AbortController | null = null

  constructor(config: AgentConfig) {
    super()
    this.config = config
    this.promptProvider = new PromptProvider()
    this.taskStore = taskStoreManager.getStore(config.sessionId)
    this.initializeOpenAI()
  }

  /**
   * 初始化 OpenAI 客户端
   */
  private initializeOpenAI(): void {
    let provider: ReturnType<typeof getActiveProvider> = null
    try {
      provider = getActiveProvider()
      if (!provider) {
        throw new Error('未配置 AI Provider')
      }

      if (!provider.apiKey) {
        throw new Error('API Key 未配置')
      }

      this.openai = new OpenAI({
        apiKey: provider.apiKey,
        baseURL: provider.baseUrl,
        timeout: 120000,
        maxRetries: 0
      })
    } catch (error) {
      this.emit(AgentEvent.ERROR, classifyApiError(error, provider))
    }
  }

  /**
   * 获取系统提示词
   * @param mode 可选，指定使用的 AI 模式（优先级高于 config.mode）
   */
  private async getSystemPrompt(mode?: AiMode): Promise<string> {
    const provider = getActiveProvider()
    const toolList = this.getToolListDescription()
    const aiConfig = getAiConfig()
    const userExtraPrompt = aiConfig.userSettings.userExtraPrompt
    const workingDirectory = await getPTYWorkingDirectory(this.config.sessionId)

    const params = {
      toolList,
      operatingSystem: this.config.operatingSystem,
      workingDirectory,
      userExtraPrompt: userExtraPrompt || undefined
    }

    // 使用传入的 mode 或 config.mode
    const currentMode = mode ?? this.config.mode

    // 根据工具调用协议选择合适的提示词
    if (currentMode === AiMode.ASK) {
      return this.promptProvider.getAskPrompt(params)
    }

    // Agent 模式
    if (provider?.toolCallProtocol === 'XML') {
      return this.promptProvider.getXMLAgentPrompt(params)
    } else {
      return this.promptProvider.getNativeAgentPrompt(params)
    }
  }

  /**
   * 获取工具列表描述
   */
  private getToolListDescription(): string {
    const tools = toolManager.getAllTools()
    return tools
      .map((tool) => {
        const def = tool.getDefinition()
        return `- **${def.name}**: ${def.description}`
      })
      .join('\n')
  }

  /**
   * 处理用户问题
   * @param question 用户问题
   * @param mode AI 模式（AGENT 可使用工具，ASK 仅回答问题），如不传则使用 Agent 配置的默认模式
   */
  async ask(question: string, mode?: AiMode): Promise<void> {
    if (this.isRunning) {
      this.emit(AgentEvent.ERROR, { message: 'Agent 正在运行中' })
      return
    }

    if (!this.openai) {
      this.emit(AgentEvent.ERROR, { message: 'OpenAI 客户端未初始化' })
      return
    }

    this.isRunning = true

    try {
      // 创建 AbortController 用于超时和用户中止
      this.currentAbortController = new AbortController()

      // 使用传入的 mode 或默认的 config.mode
      const currentMode = mode ?? this.config.mode
      // 如果没有激活的任务，创建新任务
      if (!this.taskStore.hasActiveTask()) {
        this.taskStore.createNewTask(question)
      }

      // 初始化对话历史
      if (this.conversationHistory.length === 0) {
        // 从数据库加载历史消息
        const savedMessages = this.taskStore.getMessages()

        if (savedMessages.length > 0) {
          // 有历史消息，直接加载
          this.conversationHistory = savedMessages
        } else {
          // 没有历史消息，添加系统提示（使用当前模式生成提示词）
          const systemMessage = {
            role: MessageRole.SYSTEM,
            content: await this.getSystemPrompt(currentMode)
          }
          this.conversationHistory.push(systemMessage)
          // 保存系统消息到数据库
          this.taskStore.addMessage(systemMessage)
        }
      }

      // 检查并更新系统提示词（确保与当前模式匹配）
      await this.ensureSystemPromptMatchesMode(currentMode)

      // 添加用户消息
      const userMessage = {
        role: MessageRole.USER,
        content: question
      }
      this.conversationHistory.push(userMessage)
      // 保存用户消息到数据库
      this.taskStore.addMessage(userMessage)

      const provider = getActiveProvider()
      if (!provider) {
        throw new Error('未找到激活的 Provider')
      }

      // 根据模式处理
      if (currentMode === AiMode.ASK) {
        await this.handleAskMode(provider.model, provider.streaming ?? false)
      } else {
        await this.handleAgentMode(provider.model, provider.streaming ?? false)
      }
    } catch (error) {
      const provider = getActiveProvider()
      this.emit(AgentEvent.ERROR, classifyApiError(error, provider))
    } finally {
      this.currentAbortController = null
      this.isRunning = false
      this.emit(AgentEvent.DONE)
    }
  }

  /**
   * 处理 Ask 模式（仅回答问题）
   */
  private async handleAskMode(model: string, streaming: boolean): Promise<void> {
    const request: ChatCompletionRequest = {
      model,
      messages: this.conversationHistory,
      stream: streaming
    }

    if (streaming) {
      await this.handleStreamingResponse(request)
    } else {
      await this.handleNonStreamingResponse(request)
    }
  }

  /**
   * 处理 Agent 模式（可以使用工具）
   */
  private async handleAgentMode(model: string, streaming: boolean): Promise<void> {
    const provider = getActiveProvider()
    const isXMLMode = provider?.toolCallProtocol === 'XML'

    if (isXMLMode) {
      // XML 模式：使用文本解析
      await this.handleXMLAgentMode(model, streaming)
    } else {
      // Native JSON 模式：使用原生工具调用
      await this.handleNativeAgentMode(model, streaming)
    }
  }

  /**
   * 处理 Native JSON 工具调用模式
   */
  private async handleNativeAgentMode(model: string, streaming: boolean): Promise<void> {
    while (true) {
      // 检查是否被停止
      if (!this.isRunning) {
        const provider = getActiveProvider()
        this.emit(AgentEvent.ERROR, createUserStopError(provider))
        return
      }

      const request: ChatCompletionRequest = {
        model,
        messages: this.conversationHistory,
        stream: streaming,
        tools: toolManager.getOpenAITools(),
        tool_choice: 'auto'
      }

      let response: ChatCompletionResponse

      if (streaming) {
        response = await this.handleStreamingResponseWithTools(request)
      } else {
        response = await this.handleNonStreamingResponseWithTools(request)
      }

      const choice = response.choices[0]
      if (!choice) break

      // 检查是否有工具调用
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        // 添加 assistant 消息到历史
        this.addMessageToHistory(choice.message)

        // 执行工具调用
        await this.executeToolCalls(choice.message.tool_calls)
      } else {
        // 没有工具调用，任务完成
        this.addMessageToHistory(choice.message)
        if (choice.message.content) {
          this.emit(AgentEvent.ANSWER, { content: choice.message.content })
        }
        break
      }

      // 检查是否达到停止条件
      if (choice.finish_reason === 'stop') {
        break
      }
    }
  }

  /**
   * 处理非流式响应
   */
  private async handleNonStreamingResponse(request: ChatCompletionRequest): Promise<void> {
    if (!this.openai) throw new Error('OpenAI 客户端未初始化')

    const response = (await this.openai.chat.completions.create(request as any, {
      signal: this.currentAbortController?.signal
    })) as ChatCompletionResponse

    const choice = response.choices[0]
    if (choice && choice.message.content) {
      // 检测并提取 thought（XML 模式）
      const provider = getActiveProvider()
      const isXMLMode = provider?.toolCallProtocol === 'XML'
      if (isXMLMode) {
        const thought = this.extractXMLThought(choice.message.content)
        if (thought) {
          this.emit(AgentEvent.THOUGHT, { content: thought })
        }
      }

      this.addMessageToHistory(choice.message)
      this.emit(AgentEvent.ANSWER, { content: choice.message.content })
    }
  }

  /**
   * 处理流式响应
   */
  private async handleStreamingResponse(request: ChatCompletionRequest): Promise<void> {
    if (!this.openai) throw new Error('OpenAI 客户端未初始化')

    const stream = await this.openai.chat.completions.create(request as any, {
      signal: this.currentAbortController?.signal
    })

    let fullContent = ''
    const provider = getActiveProvider()
    const isXMLMode = provider?.toolCallProtocol === 'XML'

    for await (const chunk of stream as any) {
      const typedChunk = chunk as ChatCompletionChunk
      const delta = typedChunk.choices[0]?.delta

      if (delta?.content) {
        fullContent += delta.content
        this.emit(AgentEvent.STREAM, { content: delta.content })

        // XML 模式下，检测并提取 thought
        if (isXMLMode) {
          const thought = this.extractXMLThought(fullContent)
          if (thought) {
            this.emit(AgentEvent.THOUGHT, { content: thought })
          }
        }
      }
    }

    // 将完整消息添加到历史
    this.addMessageToHistory({
      role: MessageRole.ASSISTANT,
      content: fullContent
    })

    this.emit(AgentEvent.ANSWER, { content: fullContent })
  }

  /**
   * 处理带工具的非流式响应
   */
  private async handleNonStreamingResponseWithTools(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.openai) throw new Error('OpenAI 客户端未初始化')

    return (await this.openai.chat.completions.create(request as any, {
      signal: this.currentAbortController?.signal
    })) as ChatCompletionResponse
  }

  /**
   * 处理带工具的流式响应
   */
  private async handleStreamingResponseWithTools(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.openai) throw new Error('OpenAI 客户端未初始化')

    const stream = await this.openai.chat.completions.create(request as any, {
      signal: this.currentAbortController?.signal
    })

    let fullContent = ''
    const toolCalls: any[] = []

    for await (const chunk of stream as any) {
      const typedChunk = chunk as ChatCompletionChunk
      const delta = typedChunk.choices[0]?.delta

      // 处理内容流
      if (delta?.content) {
        fullContent += delta.content
        this.emit(AgentEvent.STREAM, { content: delta.content })
      }

      // 处理工具调用流
      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls as any) {
          const index = toolCallDelta.index
          if (index !== undefined) {
            if (!toolCalls[index]) {
              toolCalls[index] = {
                id: toolCallDelta.id || '',
                type: 'function',
                function: {
                  name: toolCallDelta.function?.name || '',
                  arguments: toolCallDelta.function?.arguments || ''
                }
              }
            } else {
              if (toolCallDelta.function?.arguments) {
                toolCalls[index].function.arguments += toolCallDelta.function.arguments
              }
            }
          }
        }
      }
    }

    // 构造完整的响应对象
    const message: ChatCompletionMessage = {
      role: MessageRole.ASSISTANT,
      content: fullContent || null,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined
    }

    return {
      id: 'stream-response',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          index: 0,
          message,
          logprobs: null,
          finish_reason: toolCalls.length > 0 ? 'tool_calls' : 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    }
  }

  /**
   * 执行工具调用
   */
  private async executeToolCalls(toolCalls: any[]): Promise<void> {
    // 解析 PTY Shell 的当前工作目录，注入工具上下文
    const workingDirectory = await getPTYWorkingDirectory(this.config.sessionId)
    const context: ToolContext = {
      sessionId: this.config.sessionId,
      workingDirectory
    }

    for (const toolCall of toolCalls) {
      // 检查是否被停止
      if (!this.isRunning) {
        return
      }

      const toolName = toolCall.function.name
      let params: Record<string, any> = {}

      try {
        params = JSON.parse(toolCall.function.arguments)
      } catch (error) {
        this.emit(AgentEvent.ERROR, {
          message: `解析工具参数失败: ${toolCall.function.arguments}, 错误: ${error instanceof Error ? error.message : String(error)}`
        })
        continue
      }

      // 发送工具调用事件
      this.emit(AgentEvent.TOOL_CALL, {
        name: toolName,
        params
      })

      // 执行工具
      const result = await toolManager.executeTool(toolName, context, params)

      // 发送工具执行结果事件
      this.emit(AgentEvent.TOOL_RESULT, {
        name: toolName,
        result
      })

      // 将工具执行结果添加到对话历史
      this.addMessageToHistory({
        role: MessageRole.TOOL,
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      })
    }
  }

  /**
   * 重置对话历史（清空当前任务的所有消息）
   */
  reset(): void {
    this.conversationHistory = []
    // 清空数据库中的消息
    this.taskStore.clearCurrentTask()
  }

  /**
   * 清空内存中的对话历史（不删除数据库记录）
   * 用于准备创建新任务时，避免删除历史任务的记录
   */
  clearConversationHistory(): void {
    this.conversationHistory = []
  }

  /**
   * 切换到指定任务（加载历史消息）
   */
  switchTask(taskId: string): void {
    const task = this.taskStore.switchToTask(taskId)

    // 加载任务的历史消息
    this.conversationHistory = this.taskStore.getMessages()

    // 触发事件通知前端
    this.emit('task-switched', {
      taskId: task.id,
      taskName: task.name,
      messages: task.messages || []
    })
  }

  /**
   * 创建新任务
   */
  createNewTask(taskName: string): void {
    this.taskStore.createNewTask(taskName)
    this.conversationHistory = []
  }

  /**
   * 获取任务列表
   */
  getTaskList(): any[] {
    return this.taskStore.getTaskList()
  }

  /**
   * 获取当前任务信息
   */
  getCurrentTask(): any {
    return this.taskStore.getCurrentTask()
  }

  /**
   * 添加消息到对话历史和数据库
   */
  private addMessageToHistory(message: ChatCompletionMessage): void {
    this.conversationHistory.push(message)
    // 持久化到数据库
    try {
      this.taskStore.addMessage(message)
    } catch (error) {
      console.error('保存消息到数据库失败:', error)
    }
  }

  /**
   * 获取对话历史
   */
  getHistory(): ChatCompletionMessage[] {
    return [...this.conversationHistory]
  }

  /**
   * 停止当前运行
   */
  stop(): void {
    this.isRunning = false
    this.currentAbortController?.abort()
  }

  /**
   * 确保系统提示词与当前模式匹配
   * 如果不匹配，则更新系统提示词（修复问题1：模式切换时提示词不一致）
   */
  private async ensureSystemPromptMatchesMode(currentMode: AiMode): Promise<void> {
    if (this.conversationHistory.length === 0) {
      return
    }

    const firstMessage = this.conversationHistory[0]
    if (firstMessage.role !== MessageRole.SYSTEM) {
      return
    }

    // 生成当前模式应该使用的系统提示词
    const expectedSystemPrompt = await this.getSystemPrompt(currentMode)

    // 如果系统提示词不匹配，则更新
    if (firstMessage.content !== expectedSystemPrompt) {
      // 更新内存中的系统提示词
      firstMessage.content = expectedSystemPrompt

      // 更新数据库中的系统提示词
      const currentTask = this.taskStore.getCurrentTask()
      if (currentTask?.messages && currentTask.messages.length > 0) {
        const firstDbMessage = currentTask.messages[0]
        if (firstDbMessage.role === MessageRole.SYSTEM) {
          // 通过清空并重新添加来更新（简单实现）
          this.taskStore.updateSystemPrompt(expectedSystemPrompt)
        }
      }
    }
  }

  /**
   * 处理 XML 工具调用模式
   */
  private async handleXMLAgentMode(model: string, streaming: boolean): Promise<void> {
    while (true) {
      // 检查是否被停止
      if (!this.isRunning) {
        const provider = getActiveProvider()
        this.emit(AgentEvent.ERROR, createUserStopError(provider))
        return
      }

      const request: ChatCompletionRequest = {
        model,
        messages: this.conversationHistory,
        stream: streaming
        // XML 模式不使用 tools 参数
      }

      // 获取响应
      let response: ChatCompletionResponse
      if (streaming) {
        response = await this.handleXMLStreamingResponse(request)
      } else {
        response = await this.handleNonStreamingResponseWithTools(request)
      }

      const choice = response.choices[0]
      if (!choice || !choice.message.content) break

      // 检测并提取 thought
      const thought = this.extractXMLThought(choice.message.content)
      if (thought) {
        this.emit(AgentEvent.THOUGHT, { content: thought })
      }

      // 解析 XML 格式的工具调用
      const xmlToolCalls = this.parseXMLToolCalls(choice.message.content)

      if (xmlToolCalls.length > 0) {
        // 添加 assistant 消息到历史
        this.addMessageToHistory({
          role: MessageRole.ASSISTANT,
          content: choice.message.content
        })

        // 执行工具调用
        await this.executeXMLToolCalls(xmlToolCalls)

        // 工具执行完成后，继续循环让 AI 根据 observation 生成下一步响应
        continue
      } else {
        // 检查是否有 final_answer
        const finalAnswer = this.extractXMLFinalAnswer(choice.message.content)
        if (finalAnswer) {
          this.addMessageToHistory(choice.message)
          // 清理 XML 标签后发送
          this.emit(AgentEvent.ANSWER, { content: this.cleanXMLTags(choice.message.content) })
          break
        } else {
          // 普通回复，清理 XML 标签后发送
          this.addMessageToHistory(choice.message)
          this.emit(AgentEvent.ANSWER, { content: this.cleanXMLTags(choice.message.content) })
          break
        }
      }
    }
  }

  /**
   * 解析 XML 格式的工具调用
   * 格式: <action><name>tool_name</name><params>params_json</params></action>
   */
  private parseXMLToolCalls(content: string): Array<{ name: string; params: any }> {
    const toolCalls: Array<{ name: string; params: any }> = []

    // 匹配 <action>...</action> 标签
    const actionRegex = /<action>([\s\S]*?)<\/action>/g
    let match

    while ((match = actionRegex.exec(content)) !== null) {
      const actionContent = match[1]

      // 提取 name
      const nameMatch = /<name>([\s\S]*?)<\/name>/.exec(actionContent)
      const name = nameMatch ? nameMatch[1].trim() : ''

      // 提取 params
      const paramsMatch = /<params>([\s\S]*?)<\/params>/.exec(actionContent)
      const paramsStr = paramsMatch ? paramsMatch[1].trim() : '{}'

      if (name) {
        try {
          // 尝试解析 JSON 参数
          const params = JSON.parse(paramsStr)
          toolCalls.push({ name, params })
        } catch (error) {
          // 如果不是 JSON，尝试作为单个参数
          console.warn(
            `解析 JSON 参数失败，使用原始字符串: ${error instanceof Error ? error.message : String(error)}`
          )
          toolCalls.push({ name, params: { value: paramsStr } })
        }
      }
    }

    return toolCalls
  }

  /**
   * 提取 XML 格式的 thought（思考过程）
   */
  private extractXMLThought(content: string): string | null {
    const thoughtMatch = /<thought>([\s\S]*?)<\/thought>/.exec(content)
    return thoughtMatch ? thoughtMatch[1].trim() : null
  }

  /**
   * 提取 XML 格式的 final_answer
   */
  private extractXMLFinalAnswer(content: string): string | null {
    const answerMatch = /<final_answer>([\s\S]*?)<\/final_answer>/.exec(content)
    return answerMatch ? answerMatch[1].trim() : null
  }

  /**
   * 执行 XML 格式的工具调用
   */
  private async executeXMLToolCalls(
    toolCalls: Array<{ name: string; params: any }>
  ): Promise<void> {
    // 解析 PTY Shell 的当前工作目录，注入工具上下文
    const workingDirectory = await getPTYWorkingDirectory(this.config.sessionId)
    const context: ToolContext = {
      sessionId: this.config.sessionId,
      workingDirectory
    }

    for (const toolCall of toolCalls) {
      // 检查是否被停止
      if (!this.isRunning) {
        return
      }

      const { name, params } = toolCall

      // 发送工具调用事件
      this.emit(AgentEvent.TOOL_CALL, {
        name,
        params
      })

      // 执行工具
      const result = await toolManager.executeTool(name, context, params)

      // 发送工具执行结果事件
      this.emit(AgentEvent.TOOL_RESULT, {
        name,
        result
      })

      // 将工具执行结果添加到对话历史（XML 格式）
      const observationContent = `<observation>${JSON.stringify(result)}</observation>`
      this.addMessageToHistory({
        role: MessageRole.USER, // XML 模式下使用 USER 角色返回 observation
        content: observationContent
      })
    }
  }

  /**
   * 清理 XML 标签
   * - 删除 <action>...</action> 及其内容
   * - 去掉 <thought> 和 </thought> 标签，保留内容
   * - 去掉 <final_answer> 和 </final_answer> 标签，保留内容
   * - 去掉 <observation> 和 </observation> 标签（如果有）
   */
  private cleanXMLTags(content: string): string {
    let cleaned = content

    // 1. 删除 <action>...</action> 及其内容
    cleaned = cleaned.replace(/<action>[\s\S]*?<\/action>/g, '')

    // 2. 去掉 <thought> 标签，保留内容
    cleaned = cleaned.replace(/<thought>/g, '').replace(/<\/thought>/g, '')

    // 3. 去掉 <final_answer> 标签，保留内容
    cleaned = cleaned.replace(/<final_answer>/g, '').replace(/<\/final_answer>/g, '')

    // 4. 去掉 <observation> 标签（如果有）
    cleaned = cleaned.replace(/<observation>/g, '').replace(/<\/observation>/g, '')

    return cleaned.trim()
  }

  /**
   * 处理 XML 模式的流式响应
   * 专门为 XML 模式设计，在发送流式内容时清理 XML 标签
   */
  private async handleXMLStreamingResponse(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    if (!this.openai) throw new Error('OpenAI 客户端未初始化')

    const stream = await this.openai.chat.completions.create(request as any, {
      signal: this.currentAbortController?.signal
    })

    let fullContent = ''
    let buffer = '' // 缓冲区，用于处理可能被分割的标签
    let inAction = false // 是否在 <action> 标签内
    let inThought = false // 是否在 <thought> 标签内
    let inFinalAnswer = false // 是否在 <final_answer> 标签内

    for await (const chunk of stream as any) {
      const typedChunk = chunk as ChatCompletionChunk
      const delta = typedChunk.choices[0]?.delta

      if (delta?.content) {
        fullContent += delta.content
        buffer += delta.content

        // 处理缓冲区中的内容
        const result = this.processXMLStreamBuffer(buffer, inAction, inThought, inFinalAnswer)
        buffer = result.buffer
        inAction = result.inAction
        inThought = result.inThought
        inFinalAnswer = result.inFinalAnswer

        // 发送清理后的内容
        if (result.output) {
          this.emit(AgentEvent.STREAM, { content: result.output })
        }
      }
    }

    // 处理剩余缓冲区（如果不在 action 标签内）
    if (buffer && !inAction) {
      this.emit(AgentEvent.STREAM, { content: buffer })
    }

    // 构造完整的响应对象
    const message: ChatCompletionMessage = {
      role: MessageRole.ASSISTANT,
      content: fullContent || null
    }

    return {
      id: 'stream-response',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [
        {
          index: 0,
          message,
          logprobs: null,
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    }
  }

  /**
   * 处理 XML 流式缓冲区
   * 使用状态机处理分批到达的 XML 标签
   */
  private processXMLStreamBuffer(
    buffer: string,
    inAction: boolean,
    inThought: boolean,
    inFinalAnswer: boolean
  ): {
    buffer: string
    output: string
    inAction: boolean
    inThought: boolean
    inFinalAnswer: boolean
  } {
    let output = ''
    let remaining = buffer

    while (remaining.length > 0) {
      // 处理 action 标签（完全隐藏）
      if (inAction) {
        const endIndex = remaining.indexOf('</action>')
        if (endIndex !== -1) {
          // 找到结束标签，跳过 action 内容
          remaining = remaining.substring(endIndex + '</action>'.length)
          inAction = false
          continue
        } else {
          // 还没找到结束标签，清空缓冲区（不输出）
          return { buffer: '', output, inAction: true, inThought, inFinalAnswer }
        }
      }

      const actionStart = remaining.indexOf('<action>')
      if (actionStart !== -1) {
        // 输出 action 标签之前的内容
        output += remaining.substring(0, actionStart)
        remaining = remaining.substring(actionStart + '<action>'.length)
        inAction = true
        continue
      }

      // 处理 thought 标签（隐藏标签，保留内容）
      if (inThought) {
        const endIndex = remaining.indexOf('</thought>')
        if (endIndex !== -1) {
          // 输出 thought 内容（不包括标签）
          output += remaining.substring(0, endIndex)
          remaining = remaining.substring(endIndex + '</thought>'.length)
          inThought = false
          continue
        } else {
          // 可能还在接收 thought 内容，输出当前内容但保留可能的结束标签
          if (this.hasIncompleteClosingTag(remaining, '</thought>')) {
            return { buffer: remaining, output, inAction, inThought: true, inFinalAnswer }
          }
          output += remaining
          return { buffer: '', output, inAction, inThought: true, inFinalAnswer }
        }
      }

      const thoughtStart = remaining.indexOf('<thought>')
      if (thoughtStart !== -1) {
        output += remaining.substring(0, thoughtStart)
        remaining = remaining.substring(thoughtStart + '<thought>'.length)
        inThought = true
        continue
      }

      // 处理 final_answer 标签（隐藏标签，保留内容）
      if (inFinalAnswer) {
        const endIndex = remaining.indexOf('</final_answer>')
        if (endIndex !== -1) {
          output += remaining.substring(0, endIndex)
          remaining = remaining.substring(endIndex + '</final_answer>'.length)
          inFinalAnswer = false
          continue
        } else {
          if (this.hasIncompleteClosingTag(remaining, '</final_answer>')) {
            return { buffer: remaining, output, inAction, inThought, inFinalAnswer: true }
          }
          output += remaining
          return { buffer: '', output, inAction, inThought, inFinalAnswer: true }
        }
      }

      const finalAnswerStart = remaining.indexOf('<final_answer>')
      if (finalAnswerStart !== -1) {
        output += remaining.substring(0, finalAnswerStart)
        remaining = remaining.substring(finalAnswerStart + '<final_answer>'.length)
        inFinalAnswer = true
        continue
      }

      // 检查是否有不完整的开始标签
      if (this.hasIncompleteOpeningTag(remaining)) {
        // 保留在缓冲区，等待更多数据
        return { buffer: remaining, output, inAction, inThought, inFinalAnswer }
      }

      // 没有标签，输出所有内容
      output += remaining
      remaining = ''
    }

    return {
      buffer: remaining,
      output,
      inAction,
      inThought,
      inFinalAnswer
    }
  }

  /**
   * 检查是否有不完整的开始标签
   */
  private hasIncompleteOpeningTag(text: string): boolean {
    const tags = ['<action>', '<thought>', '<final_answer>']

    for (const tag of tags) {
      // 检查 text 是否以 tag 的前缀结尾
      for (let i = 1; i < tag.length; i++) {
        if (text.endsWith(tag.substring(0, i))) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 检查是否有不完整的结束标签
   */
  private hasIncompleteClosingTag(text: string, closingTag: string): boolean {
    // 检查 text 是否以 closingTag 的前缀结尾
    for (let i = 1; i < closingTag.length; i++) {
      if (text.endsWith(closingTag.substring(0, i))) {
        return true
      }
    }
    return false
  }
}
