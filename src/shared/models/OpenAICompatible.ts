import { MessageRole } from './AI'
import { ToolParametersSchema } from './ToolParameter'

// ==== 消息相关 ====

/**
 * 单条对话消息
 */
export interface ChatCompletionMessage {
  /**
   * 消息角色
   */
  role: MessageRole

  /**
   * 消息内容文本
   * - assistant 调用工具时，content 可为 null
   *   （例如：{"role": "assistant", "content": null, "tool_calls": [...]})
   */
  content: string | null

  /**
   * 可选：消息发送者名称（旧版 function calling 使用，现在较少用）
   */
  name?: string

  /**
   * 仅当 role === "assistant" 时可选：
   * 模型请求调用的工具列表
   */
  tool_calls?: OpenAIToolCall[]

  /**
   * 仅当 role === "tool" 时必填：
   * 对应 assistant 消息中 tool_call 的 id
   */
  tool_call_id?: string
}

/**
 * 模型在 assistant 消息中请求调用的一个工具-模型输出用
 */
export interface OpenAIToolCall {
  /**
   * 工具调用的唯一 ID（由模型生成）
   */
  id: string

  /**
   * 工具类型，目前仅支持 "function"
   */
  type: 'function'

  /**
   * 被调用的函数信息
   */
  function: {
    /**
     * 函数名称
     */
    name: string

    /**
     * 函数参数，**必须是合法的 JSON 字符串**
     * 例如: "{\"location\": \"Beijing\"}"
     */
    arguments: string // JSON string
  }
}

// ==== 请求 ====

/**
 * 客户端提供给模型的可用工具（函数）定义
 */
export interface ChatCompletionTool {
  /**
   * 工具类型，目前仅支持 "function"
   */
  type: 'function'

  /**
   * 函数元数据
   */
  function: {
    /**
     * 函数名称（必须是字母、数字、下划线，且唯一）
     */
    name: string

    /**
     * 函数描述（帮助模型理解用途）
     */
    description?: string

    /**
     * 函数参数的 JSON Schema 定义
     */
    parameters: ToolParametersSchema
  }
}

/**
 * OpenAI 兼容的 Chat Completions 请求体
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export interface ChatCompletionRequest {
  /**
   * 使用的模型 ID
   */
  model: string

  /**
   * 对话消息列表
   */
  messages: ChatCompletionMessage[]

  /**
   * 采样温度，控制输出随机性（0.0 ~ 2.0），默认 1.0
   */
  temperature?: number

  /**
   * 可选：核采样，范围 0-1，默认 1
   * - 只考虑概率质量前 top_p 的 token
   * - 建议只调整 temperature 或 top_p，不要同时调整
   */
  top_p?: number

  /**
   * 生成多少个独立的回复（choices），默认 1
   */
  n?: number

  /**
   * 是否启用流式输出（Server-Sent Events），默认 false
   */
  stream?: boolean

  /**
   * 停止生成的标识符（字符串或字符串数组）
   */
  stop?: string | string[] | null

  /**
   * 生成的最大 token 数（不包括 prompt）
   */
  max_tokens?: number

  /**
   * 存在惩罚（-2.0 ~ 2.0），默认 0.0
   */
  presence_penalty?: number

  /**
   * 频率惩罚（-2.0 ~ 2.0），默认 0.0
   */
  frequency_penalty?: number

  /**
   * 对特定 token 的 logit 偏置（token ID -> bias）
   * 例如：{ "123": 10, "456": -5 }
   */
  logit_bias?: Record<string, number> | null

  /**
   * 用于标识最终用户的唯一 ID（非安全用途，仅用于监控）
   */
  user?: string

  /**
   * 可用的工具（函数）列表，用于 tool calling
   */
  tools?: ChatCompletionTool[]

  /**
   * 可选：控制模型调用工具的方式
   * - "none"：不调用任何工具
   * - "auto"：模型自动决定是否调用工具（默认）
   */
  tool_choice?: 'none' | 'auto' | null
}

// ==== 响应 ====

// ==== 非流式响应 ====

/**
 * 非流式 Chat Completions 响应（完整响应）
 */
export interface ChatCompletionResponse {
  /**
   * 请求的唯一 ID，例如 "chatcmpl-abc123"
   */
  id: string

  /**
   * 对象类型，固定为 "chat.completion"
   */
  object: 'chat.completion'

  /**
   * 创建时间（Unix 时间戳，单位：秒）
   */
  created: number

  /**
   * 使用的模型名称
   */
  model: string

  /**
   * 生成的候选回复列表（长度由 `n` 参数决定）
   */
  choices: ChatCompletionChoice[]

  /**
   * Token 使用统计
   */
  usage: CompletionUsage
}

/**
 * 单个候选回复
 */
export interface ChatCompletionChoice {
  /**
   * 候选项索引（从 0 开始）
   */
  index: number

  /**
   * 模型生成的消息
   */
  message: ChatCompletionMessage

  /**
   * 日志概率信息（仅当请求中设置了 logprobs 相关参数时存在）
   */
  logprobs: null | Record<string, any> // OpenAI 返回结构较复杂，通常为 null

  /**
   * 结束原因
   * - "stop": 模型自然停止（遇到 stop token）
   * - "length": 达到 max_tokens 限制
   * - "tool_calls": 模型调用了工具
   * - "content_filter": 内容被过滤
   * - "null": 流式中未结束（但在非流式中不会为 null）
   */
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
}

/**
 * Token 使用统计
 */
export interface CompletionUsage {
  /**
   * 输入 prompt 的 token 数
   */
  prompt_tokens: number

  /**
   * 生成内容的 token 数
   */
  completion_tokens: number

  /**
   * 总 token 数 = prompt_tokens + completion_tokens
   */
  total_tokens: number
}

// ==== 流式响应 ====

/**
 * 流式响应中的单个数据块（chunk）
 * 通过 Server-Sent Events (SSE) 返回多个 ChatCompletionChunk
 */
export interface ChatCompletionChunk {
  /**
   * 请求 ID（与非流式相同）
   */
  id: string

  /**
   * 对象类型，固定为 "chat.completion.chunk"
   */
  object: 'chat.completion.chunk'

  /**
   * 创建时间（通常与第一个 chunk 一致）
   */
  created: number

  /**
   * 使用的模型名称
   */
  model: string

  /**
   * 候选项增量（通常只有一项，index=0）
   */
  choices: ChatCompletionChunkChoice[]
}

/**
 * 流式 chunk 中的单个候选项
 */
export interface ChatCompletionChunkChoice {
  /**
   * 候选项索引
   */
  index: number

  /**
   * 增量消息内容（只包含新生成的部分）
   * - 首个 chunk 可能包含 role: "assistant"
   * - 后续 chunk 的 delta 通常只有 content 或 tool_calls
   */
  delta: Partial<ChatCompletionMessage>

  /**
   * 结束原因（仅在最后一个 chunk 中非 null）
   */
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null
}

// ==== 错误 ====

/**
 * API 错误响应
 */
export interface ChatCompletionErrorResponse {
  error: {
    /**
     * 错误信息
     */
    message: string

    /**
     * 错误类型
     * 例如: "invalid_request_error", "authentication_error", "rate_limit_error"
     */
    type: string

    /**
     * 导致错误的参数（如果有）
     */
    param: string | null

    /**
     * 错误代码（例如 "invalid_api_key"）
     */
    code: string | null
  }
}
