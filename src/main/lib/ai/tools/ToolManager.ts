import { getAiConfig } from '@/lib/AiConfigStoreT'
import { ChatCompletionTool } from '@shared/models/OpenAICompatible'
import { EventEmitter } from 'events'
import {
  BaseTool,
  CommandTool,
  DirectoryTool,
  FileCreateTool,
  FileModifyTool,
  FileReadTool,
  FileSearchTool,
  SudoCommandTool,
  ToolContext,
  ToolResult
} from './index'

/**
 * 批准请求结构
 */
export interface ApprovalRequest {
  requestId: string
  sessionId: string
  toolName: string
  params: Record<string, any>
  reason: string
}

/**
 * 批准响应结构
 */
export interface ApprovalResponse {
  requestId: string
  approved: boolean
  reason?: string
}

/**
 * 工具管理器
 * 管理所有可用的 AI 工具，提供统一的工具注册、查找和执行接口
 */
export class ToolManager extends EventEmitter {
  private tools: Map<string, BaseTool>
  private pendingApprovals: Map<string, (response: ApprovalResponse) => void>
  private pendingTimeouts: Map<string, NodeJS.Timeout> // 修复问题3：保存超时定时器引用

  constructor() {
    super()
    this.tools = new Map()
    this.pendingApprovals = new Map()
    this.pendingTimeouts = new Map()
    this.registerDefaultTools()
  }

  /**
   * 注册默认工具
   */
  private registerDefaultTools(): void {
    this.registerTool(new FileReadTool())
    this.registerTool(new FileCreateTool())
    this.registerTool(new FileModifyTool())
    this.registerTool(new FileSearchTool())
    this.registerTool(new DirectoryTool())
    this.registerTool(new CommandTool())
    this.registerTool(new SudoCommandTool())
  }

  /**
   * 注册一个工具
   */
  registerTool(tool: BaseTool): void {
    const definition = tool.getDefinition()
    this.tools.set(definition.name, tool)
  }

  /**
   * 注销一个工具
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name)
  }

  /**
   * 获取指定工具
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有工具
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 获取所有工具的 OpenAI 兼容格式定义
   */
  getOpenAITools(): ChatCompletionTool[] {
    return this.getAllTools().map((tool) => tool.toOpenAITool())
  }

  /**
   * 获取指定工具列表的 OpenAI 兼容格式定义
   */
  getOpenAIToolsByNames(names: string[]): ChatCompletionTool[] {
    return names
      .map((name) => this.getTool(name))
      .filter((tool): tool is BaseTool => tool !== undefined)
      .map((tool) => tool.toOpenAITool())
  }

  /**
   * 执行工具
   */
  async executeTool(
    toolName: string,
    context: ToolContext,
    params: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.getTool(toolName)
    if (!tool) {
      return {
        success: false,
        error: `工具 '${toolName}' 未找到`
      }
    }

    try {
      // 检查是否需要批准
      const needsApproval = await this.checkToolApproval(toolName, params)
      if (needsApproval.needsApproval) {
        // 需要批准，向前端发送批准请求并等待响应
        const approvalResponse = await this.requestApproval(
          context.sessionId,
          toolName,
          params,
          needsApproval.reason || '需要用户批准'
        )

        if (!approvalResponse.approved) {
          return {
            success: false,
            error: approvalResponse.reason || '用户拒绝执行此工具'
          }
        }
      }

      // 批准通过或不需要批准，执行工具
      return await tool.execute(context, params)
    } catch (error) {
      return {
        success: false,
        error: `工具执行异常: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 检查工具是否需要用户批准
   * @returns { needsApproval: boolean, reason?: string }
   */
  private async checkToolApproval(
    toolName: string,
    params: Record<string, any>
  ): Promise<{ needsApproval: boolean; reason?: string }> {
    try {
      const config = getAiConfig()
      const { autoApproval } = config.userSettings

      // 如果未启用自动批准，所有工具都需要批准
      if (!autoApproval.enabled) {
        return {
          needsApproval: true,
          reason: '自动批准未启用，需要用户手动批准'
        }
      }

      // 特殊处理：命令执行工具需要检查命令过滤器
      if (toolName === 'execute_command' || toolName === 'execute_sudo_command') {
        const command = params.command as string
        if (!command) {
          return { needsApproval: false }
        }

        // 检查黑名单（优先级最高）
        for (const deniedPrefix of autoApproval.commandFilter.deniedCommandPrefixes) {
          if (command.trim().startsWith(deniedPrefix)) {
            return {
              needsApproval: true,
              reason: `命令 "${command}" 在黑名单中，拒绝执行`
            }
          }
        }

        // 检查白名单
        const isInWhitelist = autoApproval.commandFilter.allowedCommandPrefixes.some((prefix) =>
          command.trim().startsWith(prefix)
        )
        if (isInWhitelist) {
          return { needsApproval: false } // 白名单中的命令自动批准
        }

        // 不在白名单中，需要用户批准
        return {
          needsApproval: true,
          reason: `命令 "${command}" 不在白名单中，需要用户批准`
        }
      }

      // 其他工具：检查是否在允许列表中
      if (autoApproval.allowedTools.includes(toolName)) {
        return { needsApproval: false } // 自动批准
      }

      // 不在允许列表中，需要批准
      return {
        needsApproval: true,
        reason: `工具 "${toolName}" 不在自动批准列表中，需要用户批准`
      }
    } catch (error) {
      console.error('检查工具批准状态失败:', error)
      // 出错时默认需要批准（安全优先）
      return {
        needsApproval: true,
        reason: '无法检查批准状态，需要用户批准'
      }
    }
  }

  /**
   * 请求用户批准工具执行
   * @returns Promise<ApprovalResponse> 批准响应
   */
  private async requestApproval(
    sessionId: string,
    toolName: string,
    params: Record<string, any>,
    reason: string
  ): Promise<ApprovalResponse> {
    const requestId = `${sessionId}-${toolName}-${Date.now()}`

    const request: ApprovalRequest = {
      requestId,
      sessionId,
      toolName,
      params,
      reason
    }

    // 创建 Promise 等待批准响应
    const approvalPromise = new Promise<ApprovalResponse>((resolve) => {
      this.pendingApprovals.set(requestId, resolve)

      // 设置超时（60秒）- 修复问题3：保存超时定时器引用
      const timeoutId = setTimeout(() => {
        if (this.pendingApprovals.has(requestId)) {
          this.pendingApprovals.delete(requestId)
          this.pendingTimeouts.delete(requestId)
          resolve({
            requestId,
            approved: false,
            reason: '批准请求超时'
          })
        }
      }, 60000)

      // 保存超时定时器引用，以便在正常响应时清除
      this.pendingTimeouts.set(requestId, timeoutId)
    })

    // 发送批准请求事件到前端
    this.emit('approval-request', request)

    return approvalPromise
  }

  /**
   * 处理批准响应（由 IPC handler 调用）
   * 修复问题3：清除超时定时器
   */
  handleApprovalResponse(response: ApprovalResponse): void {
    const resolver = this.pendingApprovals.get(response.requestId)
    if (resolver) {
      this.pendingApprovals.delete(response.requestId)

      // 清除超时定时器
      const timeoutId = this.pendingTimeouts.get(response.requestId)
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.pendingTimeouts.delete(response.requestId)
      }

      resolver(response)
    }
  }

  /**
   * 获取工具数量
   */
  getToolCount(): number {
    return this.tools.size
  }

  /**
   * 获取所有工具名称
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * 检查工具是否存在
   */
  hasTool(name: string): boolean {
    return this.tools.has(name)
  }
}

// 导出单例
export const toolManager = new ToolManager()
