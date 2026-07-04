import { useConfig, useDarkTheme } from '@/hooks'
import { AiConfigService } from '@/services'
import {
  accentColorAtom,
  activeProviderIdAtom,
  backupOnAiModifyAtom,
  backupOnManualEditAtom,
  monitorRefreshIntervalAtom
} from '@/store'
import { useSetAtom } from 'jotai'
import { useEffect, useRef } from 'react'
import { applyAccentCss } from '../useAccentColor'

export const useInitializeConfig = (): { loading: boolean } => {
  const { config, loading } = useConfig()
  const { setTheme } = useDarkTheme()
  const setActiveProviderId = useSetAtom(activeProviderIdAtom)
  const setMonitorRefreshInterval = useSetAtom(monitorRefreshIntervalAtom)
  const setBackupOnAiModify = useSetAtom(backupOnAiModifyAtom)
  const setBackupOnManualEdit = useSetAtom(backupOnManualEditAtom)
  const setAccentColorAtom = useSetAtom(accentColorAtom)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!loading && config && !initializedRef.current) {
      // 从配置文件读取默认主题设置（仅在首次加载时）
      setTheme(config.theme.defaultDarkMode)

      // 从配置文件读取强调色（仅在首次加载时）
      const savedAccent = config.theme.accentColor || 'blue'
      setAccentColorAtom(savedAccent)
      // 立即应用，不等待 useAccentColor hook 渲染
      applyAccentCss(savedAccent, config.theme.defaultDarkMode)

      // 从配置文件读取监控刷新间隔
      if (config.monitor?.refreshInterval) {
        const interval = Math.max(3000, config.monitor.refreshInterval)
        setMonitorRefreshInterval(interval)
      }

      // 从配置文件读取文件管理备份设置
      if (config.file) {
        setBackupOnAiModify(config.file.backupOnAiModify)
        setBackupOnManualEdit(config.file.backupOnManualEdit)
      }

      // 从配置文件读取激活的 AI Provider ID（仅在首次加载时）
      const initActiveProvider = async (): Promise<void> => {
        try {
          const aiConfig = await AiConfigService.getAiConfig()
          if (aiConfig.activeProviderId) {
            setActiveProviderId(aiConfig.activeProviderId)
          }
        } catch (error) {
          console.error('Failed to load active provider:', error)
        }
      }
      initActiveProvider()

      initializedRef.current = true
    }
  }, [
    config,
    loading,
    setTheme,
    setActiveProviderId,
    setMonitorRefreshInterval,
    setBackupOnAiModify,
    setBackupOnManualEdit,
    setAccentColorAtom
  ])

  return { loading }
}
