import { AiConfig, AiProviderConfig } from '@shared/models'
import { app } from 'electron'
import './Env'

let Store: any = null
let aiConfigStore: any = null

/**
 * 初始化 AI 配置存储（加密）
 */
export const initAiConfigStore = async (): Promise<void> => {
  if (!aiConfigStore) {
    if (!Store) {
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    const encryptionKey = process.env.SECRET_KEY
    if (!encryptionKey) {
      throw new Error('SECRET_KEY not found in environment variables')
    }

    aiConfigStore = new Store({
      name: 'ai-config',
      cwd: app.getPath('userData'),
      encryptionKey,
      defaults: {
        providers: [
          {
            id: 'default-openai',
            configName: 'Default',
            providerType: 'OpenAI Compatible',
            baseUrl: 'https://api.openai.com/v1',
            apiKey: '',
            model: 'gpt-4',
            streaming: true,
            temperature: 0.7,
            maxContextTokens: 409600,
            toolCallProtocol: 'Native JSON'
          }
        ],
        activeProviderId: 'default-openai',
        userSettings: {
          autoApproval: {
            enabled: false,
            allowedTools: [],
            commandFilter: {
              allowedCommandPrefixes: [],
              deniedCommandPrefixes: []
            }
          },
          userExtraPrompt: ''
        }
      }
    })
  }
}

/**
 * 获取 AI 配置
 */
export const getAiConfig = (): AiConfig => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  return aiConfigStore.store
}

/**
 * 保存完整 AI 配置
 */
export const saveAiConfig = (config: AiConfig): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  aiConfigStore.store = config
}

/**
 * 更新 AI 配置字段（支持深度路径）
 * @example updateAiConfigField('provider.apiKey', 'sk-xxx')
 */
export const updateAiConfigField = (path: string, value: any): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  aiConfigStore.set(path, value)
}

/**
 * 重置 AI 配置为默认值
 */
export const resetAiConfig = (): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  aiConfigStore.clear()
}

/**
 * 获取所有供应商配置
 */
export const getProviders = (): AiProviderConfig[] => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  return aiConfigStore.get('providers', [])
}

/**
 * 获取当前激活的供应商配置
 */
export const getActiveProvider = (): AiProviderConfig | null => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  const providers = getProviders()
  const activeId = aiConfigStore.get('activeProviderId')
  return providers.find((p) => p.id === activeId) || null
}

/**
 * 添加新的供应商配置
 */
export const addProvider = (provider: AiProviderConfig): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  const providers = getProviders()
  // 检查 ID 是否已存在
  if (providers.some((p) => p.id === provider.id)) {
    throw new Error(`Provider with id "${provider.id}" already exists`)
  }
  providers.push(provider)
  aiConfigStore.set('providers', providers)
}

/**
 * 更新供应商配置
 */
export const updateProvider = (providerId: string, updates: Partial<AiProviderConfig>): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  const providers = getProviders()
  const index = providers.findIndex((p) => p.id === providerId)
  if (index === -1) {
    throw new Error(`Provider with id "${providerId}" not found`)
  }
  providers[index] = { ...providers[index], ...updates, id: providerId } // 保持 id 不变
  aiConfigStore.set('providers', providers)
}

/**
 * 删除供应商配置
 */
export const removeProvider = (providerId: string): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  const providers = getProviders()
  const filtered = providers.filter((p) => p.id !== providerId)

  if (filtered.length === providers.length) {
    throw new Error(`Provider with id "${providerId}" not found`)
  }

  // 如果删除的是当前激活的供应商，切换到第一个
  const activeId = aiConfigStore.get('activeProviderId')
  if (activeId === providerId && filtered.length > 0) {
    aiConfigStore.set('activeProviderId', filtered[0].id)
  }

  aiConfigStore.set('providers', filtered)
}

/**
 * 设置激活的供应商
 */
export const setActiveProvider = (providerId: string): void => {
  if (!aiConfigStore) {
    throw new Error('AI config store not initialized')
  }
  const providers = getProviders()
  if (!providers.some((p) => p.id === providerId)) {
    throw new Error(`Provider with id "${providerId}" not found`)
  }
  aiConfigStore.set('activeProviderId', providerId)
}
