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
 * 用户提问
 */
export interface UserQuestion {
  mode: AiMode
  question: string
}

/**
 * Agent 配置
 */
export interface AgentConfig {
  sessionId: string
  mode: AiMode
  operatingSystem: string
}

/**
 * Agent 事件枚举
 */
export enum AgentEvent {
  /** 接收到消息流片段 */
  STREAM = 'stream',
  /** 思考过程 */
  THOUGHT = 'thought',
  /** 工具调用 */
  TOOL_CALL = 'tool-call',
  /** 工具执行结果 */
  TOOL_RESULT = 'tool-result',
  /** 最终回答 */
  ANSWER = 'answer',
  /** 错误 */
  ERROR = 'error',
  /** 完成 */
  DONE = 'done'
}
