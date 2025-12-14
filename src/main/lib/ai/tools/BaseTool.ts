import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'

/**
 * 工具基类
 * 所有工具的抽象接口
 */
export abstract class BaseTool {
  /**
   * 获取工具定义
   */
  abstract getDefinition(): ToolDefinition

  /**
   * 执行工具
   */
  abstract execute(
    context: ToolExecutionContext,
    params: Record<string, any>
  ): Promise<ToolExecutionResult>

  /**
   * 验证参数
   */
  protected validateParams(params: Record<string, any>, definition: ToolDefinition): void {
    const requiredParams = definition.parameters.filter((p) => p.required)

    for (const param of requiredParams) {
      if (!(param.name in params)) {
        throw new Error(`Missing required parameter: ${param.name}`)
      }

      const value = params[param.name]
      const type = typeof value

      // 基本类型检查
      if (param.type === 'string' && type !== 'string') {
        throw new Error(`Parameter ${param.name} must be a string`)
      }
      if (param.type === 'number' && type !== 'number') {
        throw new Error(`Parameter ${param.name} must be a number`)
      }
      if (param.type === 'boolean' && type !== 'boolean') {
        throw new Error(`Parameter ${param.name} must be a boolean`)
      }
      if (param.type === 'array' && !Array.isArray(value)) {
        throw new Error(`Parameter ${param.name} must be an array`)
      }
      if (param.type === 'object' && (type !== 'object' || Array.isArray(value))) {
        throw new Error(`Parameter ${param.name} must be an object`)
      }

      // 枚举检查
      if (param.enum && !param.enum.includes(value)) {
        throw new Error(`Parameter ${param.name} must be one of: ${param.enum.join(', ')}`)
      }
    }
  }

  /**
   * 格式化执行结果
   */
  protected formatSuccess(data: any, duration?: number): ToolExecutionResult {
    return {
      success: true,
      data,
      duration
    }
  }

  /**
   * 格式化错误结果
   */
  protected formatError(error: string, duration?: number): ToolExecutionResult {
    return {
      success: false,
      error,
      duration
    }
  }
}
