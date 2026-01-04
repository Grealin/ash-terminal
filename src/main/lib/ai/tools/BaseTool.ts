import { ChatCompletionTool } from '@shared/models/OpenAICompatible'
import { ToolParametersSchema } from '@shared/models/ToolParameter'

/**
 * 工具定义
 */
export interface ToolDefinition {
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 工具参数的 JSON Schema */
  parameters: ToolParametersSchema
}

/**
 * 工具执行上下文
 */
export interface ToolContext {
  /** SSH 会话 ID */
  sessionId: string
  /** 其他上下文信息 */
  [key: string]: any
}

/**
 * 工具执行结果
 */
export interface ToolResult {
  /** 是否成功 */
  success: boolean
  /** 结果数据 */
  data?: any
  /** 错误信息 */
  error?: string
  /** 附加消息 */
  message?: string
  /** 元数据信息 */
  metadata?: Record<string, any>
}

/**
 * 工具基类
 */
export abstract class BaseTool {
  /**
   * 获取工具定义（供 OpenAI API 使用）
   */
  abstract getDefinition(): ToolDefinition

  /**
   * 将工具定义转换为 OpenAI 兼容格式
   */
  toOpenAITool(): ChatCompletionTool {
    const definition = this.getDefinition()
    return {
      type: 'function',
      function: {
        name: definition.name,
        description: definition.description,
        parameters: definition.parameters
      }
    }
  }

  /**
   * 执行工具
   * @param context 执行上下文
   * @param params 工具参数
   */
  abstract execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult>
}
