import { AiProviderConfig } from '@shared/models'
import { BaseProvider } from './BaseProvider'
import { OpenAIProvider } from './OpenAIProvider'

/**
 * Provider 工厂
 * 根据配置创建对应的 Provider 实例
 */
export class ProviderFactory {
  /**
   * 创建 Provider 实例
   */
  static createProvider(config: AiProviderConfig): BaseProvider {
    switch (config.type) {
      case 'openai':
        return new OpenAIProvider(config)
      default:
        throw new Error(`Unsupported provider type: ${config.type}`)
    }
  }
}

export type { ChatRequest, ProviderMessage, ProviderTool, StreamChunk } from './BaseProvider'
export { BaseProvider, OpenAIProvider }
