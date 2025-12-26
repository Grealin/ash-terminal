/**
 * AI 助手模式
 */
export enum AiMode {
  /** Agent 模式：AI 拥有操作权限，可以使用工具 */
  AGENT = 'agent',
  /** Ask 模式：AI 仅回答问题，不执行操作 */
  ASK = 'ask'
}

/**
 * 消息角色
 */
export enum MessageRole {
  /** 用户消息 */
  USER = 'user',
  /** AI 助手消息 */
  ASSISTANT = 'assistant',
  /** 系统消息 */
  SYSTEM = 'system',
  /** 工具调用结果 */
  TOOL = 'tool'
}

/**
 * 工具调用状态
 */
export enum ToolCallStatus {
  /** 等待批准 */
  PENDING = 'pending',
  /** 已批准，执行中 */
  EXECUTING = 'executing',
  /** 执行成功 */
  SUCCESS = 'success',
  /** 执行失败 */
  FAILED = 'failed',
  /** 用户拒绝 */
  REJECTED = 'rejected'
}

/**
 * 工具调用记录
 */
export interface ToolCall {
  /** 工具调用唯一标识 */
  id: string
  /** 工具名称 */
  name: string
  /** 工具参数 */
  arguments: Record<string, any>
  /** 执行结果 */
  result?: string
  /** 错误信息 */
  error?: string
  /** 创建时间 */
  timestamp: number
}

/**
 * AI 消息
 */
export interface AiMessage {
  /** 消息唯一标识（UUID） */
  uuid: string
  /** 所属任务 ID */
  taskId: string
  /** 消息角色 */
  role: MessageRole
  /** 消息内容 */
  content: string
  /** 工具调用列表（仅 assistant 角色） */
  toolCalls?: ToolCall[]
  /** 工具调用 UUID（仅 tool 角色） */
  toolCallId?: string
  /** 时间戳 */
  timestamp: number
  // 调用模式（仅 'user' 角色）
  mode: AiMode
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  /** 参数类型（JSON Schema 类型） */
  type: 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array'
  /** 参数描述 */
  description: string
  /** 默认值（可选） */
  default?: any
}

/**
 * JSON Schema for tool parameters (OpenAI compatible)
 */
export interface ToolParametersSchema {
  type: 'object'
  properties: Record<string, ToolParameter>
  required?: string[] // 可选，因为可以没有必填参数（虽然罕见）
}

/**
 * 工具定义接口（符合 OpenAI tool_calls 规范）
 */
export interface ToolDefinition {
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 参数定义 —— 必须是 JSON Schema 对象 */
  parameters: ToolParametersSchema
}

/**
 * 工具执行结果
 */
export interface ToolExecutionResult {
  /** 是否成功 */
  success: boolean
  /** 执行结果数据 */
  data?: any
  /** 错误信息 */
  error?: string
}
