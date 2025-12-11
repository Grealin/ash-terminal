import { darkStateAtom } from '@/store'
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { useConfig } from './Config'

export const useDarkTheme = (): {
  isDark: boolean | undefined
  toggleTheme: () => void
  setTheme: (dark: boolean) => void
} => {
  const [isDark, setDark] = useAtom(darkStateAtom)

  const toggleTheme = (): void => {
    setDark(!isDark)
  }

  const setTheme = (dark: boolean): void => {
    setDark(dark)
  }

  return {
    isDark,
    toggleTheme,
    setTheme
  }
}

export const useThemeConfig = (): {
  updateThemeConfig: (defaultDarkMode: boolean) => Promise<void>
} => {
  const { updateConfigField } = useConfig()

  // 更新主题配置到配置文件
  const updateThemeConfig = useCallback(
    async (defaultDarkMode: boolean) => {
      try {
        await updateConfigField('theme.defaultDarkMode', defaultDarkMode)
      } catch (error) {
        console.error('Failed to update theme config:', error)
        throw error
      }
    },
    [updateConfigField]
  )

  return {
    updateThemeConfig
  }
}
