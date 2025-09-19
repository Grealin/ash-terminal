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
