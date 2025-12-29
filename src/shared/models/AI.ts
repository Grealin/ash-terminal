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
