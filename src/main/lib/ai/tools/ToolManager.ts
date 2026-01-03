import { ChatCompletionTool } from '@shared/models/OpenAICompatible'
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
 * 工具管理器
 * 管理所有可用的 AI 工具，提供统一的工具注册、查找和执行接口
 */
export class ToolManager {
  private tools: Map<string, BaseTool>

  constructor() {
    this.tools = new Map()
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
      return await tool.execute(context, params)
    } catch (error) {
      return {
        success: false,
        error: `工具执行异常: ${error instanceof Error ? error.message : String(error)}`
      }
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
