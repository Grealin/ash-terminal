import { AppConfig } from '@shared/models'
import { app } from 'electron'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'

// 动态导入 electron-store
let Store: any = null
let store: any = null

const defaultConfig: AppConfig = {
  theme: {
    defaultDarkMode: false,
    accentColor: 'blue'
  },
  layout: {
    leftSideBarVisible: true,
    rightSideBarVisible: true,
    components: {
      // 左侧栏功能组件
      aiInterfaceVisible: true,
      // 右侧栏功能组件
      sessionListVisible: true,
      fileListVisible: true,
      monitorListVisible: true,
      // 中央区域功能组件
      commandListVisible: true
    }
  },
  terminal: {
    fontSize: 14
  },
  monitor: {
    refreshInterval: 3000
  },
  file: {
    backupOnAiModify: true,
    backupOnManualEdit: true
  }
}

// 初始化配置存储
export const initConfigStore = async (): Promise<void> => {
  if (!store) {
    if (!Store) {
      // 动态导入 electron-store
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    try {
      store = new Store({
        name: 'config',
        cwd: app.getPath('userData'),
        defaults: defaultConfig
      })
      // 尝试访问以验证文件是否有效
      store.get('theme')
    } catch (error) {
      console.error('Failed to initialize config store:', error)
      // 如果是 JSON 解析错误，删除损坏的配置文件
      if (error instanceof SyntaxError || (error as any).message?.includes('JSON')) {
        const configPath = join(app.getPath('userData'), 'config.json')
        if (existsSync(configPath)) {
          console.log('Deleting corrupted config file:', configPath)
          try {
            unlinkSync(configPath)
          } catch (unlinkError) {
            console.error('Failed to delete corrupted config file:', unlinkError)
          }
        }
        // 重新创建
        store = new Store({
          name: 'config',
          cwd: app.getPath('userData'),
          defaults: defaultConfig
        })
        console.log('Config store reinitialized successfully')
      } else {
        throw error
      }
    }
  }

  // 启动配置迁移，补全旧版配置文件缺失的字段
  migrateConfig()
}

// 获取配置
export const getConfig = (): AppConfig => {
  if (!store) {
    throw new Error('Config store not initialized')
  }
  return store.store
}

// 保存完整配置
export const saveConfig = (config: AppConfig): void => {
  if (!store) {
    throw new Error('Config store not initialized')
  }
  store.store = config
}

// 更新配置字段（支持深度路径）
export const updateConfigField = (path: string, value: any): void => {
  if (!store) {
    throw new Error('Config store not initialized')
  }

  // 直接在 electron-store 实例上设置值，避免完整对象替换
  store.set(path, value)
}

// 配置迁移：深度比对 defaultConfig 与现有配置，缺失字段自动补全（仅首次加载时调用）
export const migrateConfig = (): void => {
  if (!store) {
    throw new Error('Config store not initialized')
  }

  let migrated = false

  // 递归补全缺失字段
  const deepMerge = (stored: unknown, defaults: unknown, prefix: string): void => {
    if (stored === undefined || stored === null) {
      store.set(prefix.replace(/^\./, ''), defaults)
      migrated = true
      return
    }

    if (
      typeof defaults === 'object' &&
      defaults !== null &&
      !Array.isArray(defaults) &&
      typeof stored === 'object' &&
      stored !== null &&
      !Array.isArray(stored)
    ) {
      for (const key of Object.keys(defaults as Record<string, unknown>)) {
        const storedVal = (stored as Record<string, unknown>)[key]
        const defaultVal = (defaults as Record<string, unknown>)[key]
        if (storedVal === undefined) {
          store.set(`${prefix}.${key}`, defaultVal)
          migrated = true
        } else if (
          typeof defaultVal === 'object' &&
          defaultVal !== null &&
          !Array.isArray(defaultVal)
        ) {
          deepMerge(storedVal, defaultVal, `${prefix}.${key}`)
        }
      }
    }
  }

  const current = store.store as AppConfig
  deepMerge(current, defaultConfig, '')

  if (migrated) {
    console.log('[Config] Migrated: missing fields filled with defaults')
  }
}
