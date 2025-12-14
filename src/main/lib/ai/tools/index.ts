import { ToolDefinition } from '@shared/models'
import { BaseTool } from './BaseTool'
import { CommandTool } from './CommandTool'
import { DirectoryTool } from './DirectoryTool'
import { FileReadTool } from './FileReadTool'
import { FileSearchTool } from './FileSearchTool'
import { FileWriteTool } from './FileWriteTool'
import { SudoCommandTool } from './SudoCommandTool'

/**
 * 工具注册表
 * 管理所有可用的工具
 */
export class ToolRegistry {
  private tools: Map<string, BaseTool> = new Map()

  constructor() {
    this.registerDefaultTools()
  }

  /**
   * 注册默认工具
   */
  private registerDefaultTools(): void {
    this.register(new FileReadTool())
    this.register(new FileWriteTool())
    this.register(new FileSearchTool())
    this.register(new DirectoryTool())
    this.register(new CommandTool())
    this.register(new SudoCommandTool())
  }

  /**
   * 注册工具
   */
  register(tool: BaseTool): void {
    const definition = tool.getDefinition()
    this.tools.set(definition.name, tool)
  }

  /**
   * 获取工具
   */
  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name)
  }

  /**
   * 获取所有工具定义
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => tool.getDefinition())
  }

  /**
   * 获取工具定义（按分类筛选）
   */
  getDefinitionsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return this.getAllDefinitions().filter((def) => def.category === category)
  }

  /**
   * 检查工具是否需要批准
   */
  requiresApproval(toolName: string): boolean {
    const tool = this.getTool(toolName)
    return tool?.getDefinition().requiresApproval ?? false
  }

  /**
   * 检查工具是否存在
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName)
  }

  /**
   * 获取工具数量
   */
  size(): number {
    return this.tools.size
  }
}

// 导出单例
export const toolRegistry = new ToolRegistry()

// 导出所有工具类
export {
  BaseTool,
  CommandTool,
  DirectoryTool,
  FileReadTool,
  FileSearchTool,
  FileWriteTool,
  SudoCommandTool
}
