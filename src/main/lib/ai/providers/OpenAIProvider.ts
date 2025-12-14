import { AiProviderConfig } from '@shared/models'
import { BaseProvider, ChatRequest, StreamChunk } from './BaseProvider'

/**
 * OpenAI Compatible Provider
 * 支持所有兼容 OpenAI API 的服务
 */
export class OpenAIProvider extends BaseProvider {
  private abortController: AbortController | null = null

  constructor(config: AiProviderConfig) {
    super(config)
  }

  /**
   * 流式聊天
   */
  async chatStream(request: ChatRequest): Promise<void> {
    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          tools: request.tools,
          stream: true,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096
        }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        const error = await response.text()
        this.emit('data', {
          type: 'error',
          error: `API Error: ${response.status} - ${error}`
        } as StreamChunk)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '' || line.trim() === 'data: [DONE]') {
            continue
          }

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              const delta = data.choices?.[0]?.delta

              if (delta?.content) {
                this.emit('data', {
                  type: 'content',
                  content: delta.content
                } as StreamChunk)
              }

              if (delta?.tool_calls) {
                for (const toolCall of delta.tool_calls) {
                  if (toolCall.function) {
                    this.emit('data', {
                      type: 'tool_call',
                      toolCall: {
                        id: toolCall.id,
                        name: toolCall.function.name,
                        arguments: JSON.parse(toolCall.function.arguments || '{}')
                      }
                    } as StreamChunk)
                  }
                }
              }

              if (data.choices?.[0]?.finish_reason) {
                this.emit('data', {
                  type: 'done'
                } as StreamChunk)
              }
            } catch (error) {
              console.error('Failed to parse SSE data:', error)
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        this.emit('data', {
          type: 'error',
          error: 'Request aborted'
        } as StreamChunk)
      } else {
        this.emit('data', {
          type: 'error',
          error: error.message || 'Unknown error'
        } as StreamChunk)
      }
    } finally {
      this.abortController = null
    }
  }

  /**
   * 非流式聊天
   */
  async chat(request: ChatRequest): Promise<{
    content: string
    toolCalls?: Array<{
      id: string
      name: string
      arguments: Record<string, any>
    }>
  }> {
    this.abortController = new AbortController()

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          tools: request.tools,
          stream: false,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096
        }),
        signal: this.abortController.signal
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`API Error: ${response.status} - ${error}`)
      }

      const data = await response.json()
      const message = data.choices?.[0]?.message

      if (!message) {
        throw new Error('No message in response')
      }

      return {
        content: message.content || '',
        toolCalls: message.tool_calls?.map((tc: any) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}')
        }))
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('Request aborted')
      }
      throw error
    } finally {
      this.abortController = null
    }
  }

  /**
   * 取消请求
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }
  }

  /**
   * 验证配置
   */
  async validateConfig(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`
        },
        signal: AbortSignal.timeout(5000)
      })

      return response.ok
    } catch (error) {
      console.error('Failed to validate config:', error)
      return false
    }
  }
}
