/**
 * AI API 错误分类枚举
 */
export enum AiErrorType {
  /** 401 - API Key 无效或未配置 */
  AUTHENTICATION = 'authentication',
  /** 403 - 访问被拒绝 */
  PERMISSION_DENIED = 'permission_denied',
  /** 404 - 端点不存在 */
  NOT_FOUND = 'not_found',
  /** 404 - 模型名称错误 */
  MODEL_NOT_FOUND = 'model_not_found',
  /** 400 - 请求参数错误 */
  INVALID_REQUEST = 'invalid_request',
  /** 429 - 请求频率超限 */
  RATE_LIMIT = 'rate_limit',
  /** 5xx - 服务端错误 */
  SERVER_ERROR = 'server_error',
  /** 网络连接失败 */
  CONNECTION_ERROR = 'connection_error',
  /** 请求超时 */
  TIMEOUT = 'timeout',
  /** 用户主动中止 */
  USER_ABORT = 'user_abort',
  /** 未知错误 */
  UNKNOWN = 'unknown'
}

/**
 * 错误严重级别
 */
export enum AiErrorSeverity {
  /** 配置问题，需用户修复（如 API Key 错误、Base URL 不可达） */
  CONFIGURATION = 'configuration',
  /** 临时问题，可重试（如 429 限流、5xx 服务错误） */
  TRANSIENT = 'transient',
  /** 用户中止 */
  CANCELLED = 'cancelled',
  /** 未知级别 */
  UNKNOWN = 'unknown'
}

/**
 * 结构化的 AI 错误对象
 * 从主进程通过 IPC 发送到渲染进程
 */
export interface AiTaskError {
  /** 错误类型枚举 */
  type: AiErrorType
  /** 错误严重级别 */
  severity: AiErrorSeverity
  /** 面向用户的中文错误标题（简短，用于 Toast） */
  title: string
  /** 面向用户的中文错误描述（详细，用于错误气泡） */
  message: string
  /** 面向用户的修复建议 */
  suggestion: string
  /** 原始 HTTP 状态码（如有） */
  statusCode?: number
  /** 原始错误码（如 "invalid_api_key"） */
  code?: string | null
  /** 出错的 provider 配置名 */
  providerName?: string
  /** 出错的 baseUrl */
  baseUrl?: string
  /** 出错的模型名 */
  model?: string
  /** 是否建议跳转到设置页 */
  suggestNavigateToSettings?: boolean
}
