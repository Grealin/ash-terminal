import { useConfig, useDarkTheme } from '@/hooks'
import { useEffect, useRef } from 'react'

export const useInitializeTheme = (): { loading: boolean } => {
  const { config, loading } = useConfig()
  const { setTheme } = useDarkTheme()
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!loading && config && !initializedRef.current) {
      // 从配置文件读取默认主题设置（仅在首次加载时）
      setTheme(config.theme.defaultDarkMode)
      initializedRef.current = true
    }
  }, [config, loading, setTheme])

  return { loading }
}
