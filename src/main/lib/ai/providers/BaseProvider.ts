import { AiProviderConfig } from '@shared/models'
import { EventEmitter } from 'events'

/**
 * AI 响应流数据类型
 */
export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done' | 'error'
  content?: string
  toolCall?: {
    id: string
    name: string
    arguments: Record<string, any>
  }
  error?: string
}

/**
 * AI 消息接口
 */
export interface ProviderMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: Array<{
    id: string
    name: string
    arguments: Record<string, any>
  }>
  toolCallId?: string
}

/**
 * 工具定义（OpenAI 格式）
 */
export interface ProviderTool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, any>
      required?: string[]
    }
  }
}

/**
 * 请求参数
 */
export interface ChatRequest {
  messages: ProviderMessage[]
  tools?: ProviderTool[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

/**
 * AI Provider 基类
 * 所有 AI 提供商的抽象接口
 */
export abstract class BaseProvider extends EventEmitter {
  protected config: AiProviderConfig

  constructor(config: AiProviderConfig) {
    super()
    this.config = config
  }

  /**
   * 发送聊天请求（流式）
   */
  abstract chatStream(request: ChatRequest): Promise<void>

  /**
   * 发送聊天请求（非流式）
   */
  abstract chat(request: ChatRequest): Promise<{
    content: string
    toolCalls?: Array<{
      id: string
      name: string
      arguments: Record<string, any>
    }>
  }>

  /**
   * 取消当前请求
   */
  abstract abort(): void

  /**
   * 验证配置是否有效
   */
  abstract validateConfig(): Promise<boolean>

  /**
   * 更新配置
   */
  updateConfig(config: AiProviderConfig): void {
    this.config = config
  }

  /**
   * 获取配置
   */
  getConfig(): AiProviderConfig {
    return this.config
  }
}
