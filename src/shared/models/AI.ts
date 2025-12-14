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
  /** 执行状态 */
  status: ToolCallStatus
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
  id: string
  /** 所属任务 ID */
  taskId: string
  /** 消息角色 */
  role: MessageRole
  /** 消息内容 */
  content: string
  /** 工具调用列表（仅 assistant 角色） */
  toolCalls?: ToolCall[]
  /** 工具调用 ID（仅 tool 角色） */
  toolCallId?: string
  /** 时间戳 */
  timestamp: number
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  /** 参数名称 */
  name: string
  /** 参数类型 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  /** 参数描述 */
  description: string
  /** 是否必需 */
  required: boolean
  /** 枚举值（可选） */
  enum?: string[]
  /** 默认值（可选） */
  default?: any
}

/**
 * 工具定义接口
 */
export interface ToolDefinition {
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 参数定义列表 */
  parameters: ToolParameter[]
  /** 是否需要批准（危险操作） */
  requiresApproval: boolean
  /** 工具分类标签 */
  category: 'file' | 'command' | 'system' | 'search'
}

/**
 * 工具执行上下文
 */
export interface ToolExecutionContext {
  /** SSH 会话 ID */
  sessionId: string
  /** 工具调用 ID */
  toolCallId: string
  /** 是否自动批准 */
  autoApprove: boolean
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
  /** 执行耗时（毫秒） */
  duration?: number
}
