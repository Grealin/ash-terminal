/**
 * 工具参数定义（兼容 OpenAI 的 JSON Schema 子集）
 * 既支持简单类型，也支持复杂结构
 */
export type ToolParameter = ToolParameterSimple | ToolParameterObject | ToolParameterArray

// 简单类型（string, number, integer, boolean）
export interface ToolParameterSimple {
  type: 'string' | 'number' | 'integer' | 'boolean'
  description?: string
  default?: any
  enum?: any[]
  // 可继续添加常用字段（如 pattern, min/max）
  [key: string]: any // 允许扩展（如 format, minLength 等）
}

// 对象类型
export interface ToolParameterObject {
  type: 'object'
  description?: string
  properties?: Record<string, ToolParameter> // 递归支持嵌套
  required?: string[]
  additionalProperties?: boolean | ToolParameter
  [key: string]: any
}

// 数组类型
export interface ToolParameterArray {
  type: 'array'
  description?: string
  items?: ToolParameter | ToolParameter[] // 支持元组或统一类型
  minItems?: number
  maxItems?: number
  [key: string]: any
}

export interface ToolParametersSchema {
  type: 'object'
  properties: Record<string, ToolParameter>
  required?: string[]
  [key: string]: any // 允许 additionalProperties 等
}
