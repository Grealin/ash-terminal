import { AiConfig, AiProviderConfig } from '@shared/models'

export class AiConfigService {
  // AI 配置管理
  static async getAiConfig(): Promise<AiConfig> {
    return window.aiConfig.getAiConfig()
  }

  static async saveAiConfig(config: AiConfig): Promise<void> {
    return window.aiConfig.saveAiConfig(config)
  }

  static async updateAiConfigField(path: string, value: any): Promise<void> {
    return window.aiConfig.updateAiConfigField(path, value)
  }

  static async resetAiConfig(): Promise<void> {
    return window.aiConfig.resetAiConfig()
  }

  // 供应商管理
  static async getProviders(): Promise<AiProviderConfig[]> {
    return window.aiConfig.getProviders()
  }

  static async getActiveProvider(): Promise<AiProviderConfig | null> {
    return window.aiConfig.getActiveProvider()
  }

  static async addProvider(provider: AiProviderConfig): Promise<void> {
    return window.aiConfig.addProvider(provider)
  }

  static async updateProvider(
    providerId: string,
    updates: Partial<AiProviderConfig>
  ): Promise<void> {
    return window.aiConfig.updateProvider(providerId, updates)
  }

  static async removeProvider(providerId: string): Promise<void> {
    return window.aiConfig.removeProvider(providerId)
  }

  static async setActiveProvider(providerId: string): Promise<void> {
    return window.aiConfig.setActiveProvider(providerId)
  }

  // 工具管理
  static async getAvailableTools(): Promise<string[]> {
    return window.aiConfig.getAvailableTools()
  }

  static async getAvailableToolsWithInfo(): Promise<Array<{ name: string; description: string }>> {
    return window.aiConfig.getAvailableToolsWithInfo()
  }
}
