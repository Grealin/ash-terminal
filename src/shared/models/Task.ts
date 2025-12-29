import { ChatCompletionMessage } from './OpenAICompatible'

/**
 * AI 任务模型
 */
export interface Task {
  /**
   * 任务唯一标识符
   */
  id: string

  /**
   * 关联的 Session ID
   */
  sessionId: string

  /**
   * 任务名称
   */
  name: string

  /**
   * 任务创建时间（时间戳，毫秒）
   */
  createdAt: number

  /**
   * 任务相关的消息列表（从数据库查询时填充）
   * 注意：此字段不存储在数据库中，而是通过 taskId 关联查询
   */
  messages?: Message[]
}

/**
 * 消息模型（继承自 ChatCompletionMessage）
 */
export interface Message extends ChatCompletionMessage {
  /**
   * 消息唯一标识符
   */
  id: string

  /**
   * 关联的 Task ID
   */
  taskId: string

  /**
   * 消息创建时间（时间戳，毫秒）
   */
  createdAt: number

  /**
   * 消息在任务中的索引序号
   */
  index: number
}

/**
 * 数据库存储的消息模型（用于数据库操作）
 * 将 tool_calls 序列化为 JSON 字符串存储
 */
export interface MessageDB {
  id: string
  taskId: string
  createdAt: number
  index: number
  role: string
  content: string | null
  name?: string
  tool_calls?: string // JSON 字符串
  tool_call_id?: string
}
