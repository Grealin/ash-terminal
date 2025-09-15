import { darkStateAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout: React.FC<ComponentProps<'main'>> = ({ children, className, ...props }) => {
  const isDark = useAtomValue(darkStateAtom)

  return (
    <main
      className={twMerge(
        'flex h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen overflow-auto',
        isDark && 'dark', // 主题切换关键
        'dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900', // 暗色背景渐变
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}
