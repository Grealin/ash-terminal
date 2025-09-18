import { darkStateAtom } from '@/store'
import { useAtom } from 'jotai'

export const useDarkTheme = () => {
  const [isDark, setDark] = useAtom(darkStateAtom)

  const toggleTheme = () => {
    setDark(!isDark)
  }

  const setTheme = (dark: boolean) => {
    setDark(dark)
  }

  return {
    isDark,
    toggleTheme,
    setTheme
  }
}
