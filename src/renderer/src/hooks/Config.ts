import { AppConfig } from '@shared/models'
import { useCallback, useEffect, useState } from 'react'

export const useConfig = () => {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [loading, setLoading] = useState(true)

  // 加载配置
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const loadedConfig = await window.context.getConfig()
      setConfig(loadedConfig)
    } catch (error) {
      console.error('Failed to load config:', error)
      // 如果加载失败，使用默认配置
      const defaultConfig: AppConfig = {
        theme: {
          defaultDarkMode: false
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
      await window.context.saveConfig(newConfig)
      setConfig(newConfig)
    } catch (error) {
      console.error('Failed to save config:', error)
      throw error
    }
  }, [])

  // 更新主题配置
  const updateThemeConfig = useCallback(
    async (defaultDarkMode: boolean) => {
      if (!config) return

      const newConfig: AppConfig = {
        ...config,
        theme: {
          ...config.theme,
          defaultDarkMode
        }
      }

      await saveConfig(newConfig)
    },
    [config, saveConfig]
  )

  // 初始化时加载配置
  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  return {
    config,
    loading,
    loadConfig,
    saveConfig,
    updateThemeConfig
  }
}
