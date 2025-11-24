import { AppConfig } from '@shared/models'
import { useCallback, useEffect, useState } from 'react'
import { ContextService } from '@/services'

export const useConfig = () => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const loadedConfig = await ContextService.getConfig()
      setConfig(loadedConfig)
    } catch (error) {
      console.error('Failed to load config:', error)
      // 如果加载失败，使用默认配置
      const defaultConfig: AppConfig = {
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
        },
        terminal: {
          fontSize: 14
        }
      }
      setConfig(defaultConfig)
    } finally {
      setLoading(false)
    }
  }, [])

  // 保存配置
  const saveConfig = useCallback(async (newConfig: AppConfig) => {
    try {
      await ContextService.saveConfig(newConfig)
      setConfig(newConfig)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  }, [])

  // 更新配置字段（部分更新）
  const updateConfigField = useCallback(async (path: string, value: any) => {
    try {
      await ContextService.updateConfigField(path, value)
      // 重新加载配置以确保状态同步
      const updatedConfig = await ContextService.getConfig()
      setConfig(updatedConfig)
    } catch (error) {
      console.error('Failed to update config field:', error)
      throw error
    }
  }, [])

  // 初始化时加载配置
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return {
    config,
    loading,
    loadConfig,
    saveConfig,
    updateConfigField
  }
}
