import { AppConfig } from '@shared/models'
import { app } from 'electron'

// 动态导入 electron-store
let Store: any = null
let store: any = null

// 初始化配置存储
export const initConfigStore = async (): Promise<void> => {
  if (!store) {
    if (!Store) {
      // 动态导入 electron-store
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    store = new Store({
      name: 'config',
      cwd: app.getPath('userData'),
      defaults: {
        theme: {
          defaultDarkMode: false
        }
      }
    })
  }
}

// 获取配置
export const getConfig = (): AppConfig => {
  if (!store) {
    throw new Error('Config store not initialized')
  }
  return store.store
}

// 保存配置
export const saveConfig = (config: AppConfig): void => {
  if (!store) {
    throw new Error('Config store not initialized')
  }
  store.store = config
}
