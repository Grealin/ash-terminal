import { AiMessage } from './AI'

/**
 * AI 任务（对话单元）
 * 任务是用户与 AI 交互的基本单位，包含一系列消息记录
 */
export interface AiTask {
  /** 任务唯一标识（UUID） */
  uuid: string
  /** 任务标题 */
  title: string
  /** 关联的 SSH 会话 ID */
  sessionId: string
  /** 消息列表 */
  messages: AiMessage[]
  /** 创建时间 */
  createdAt: number
}

/**
 * 任务创建参数
 */
export interface CreateTaskParams {
  /** 关联的 SSH 会话 ID */
  sessionId: string
  /** 初始消息 */
  initialMessage?: string
}

/**
 * 任务更新参数
 */
export interface UpdateTaskParams {
  /** 任务标题 */
  title?: string
}

/**
 * 任务查询参数
 */
export interface TaskQueryParams {
  /** 筛选特定会话（可选） */
  sessionId?: string
  /** 返回数量限制 */
  limit?: number
  /** 分页偏移 */
  offset?: number
  /** 搜索关键词（搜索标题和消息内容） */
  searchQuery?: string
}

/**
 * 任务统计信息
 */
export interface TaskStatistics {
  /** 总任务数 */
  totalTasks: number
  /** 总消息数 */
  totalMessages: number
  /** 总工具调用次数 */
  totalToolCalls: number
  /** 成功的工具调用 */
  successfulToolCalls: number
  /** 失败的工具调用 */
  failedToolCalls: number
}
