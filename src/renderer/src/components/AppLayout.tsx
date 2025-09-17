import { darkStateAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout: React.FC<ComponentProps<'main'>> = ({ children, className, ...props }) => {
  const isDark = useAtomValue(darkStateAtom)

  return (
    <main
      className={twMerge(
        'flex h-screen flex-col m-0 p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen overflow-auto',
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

export const MainContent: React.FC<ComponentProps<'div'>> = ({ children, className, ...props }) => {
  return (
    <div className={twMerge('flex flex-row flex-1 m-0 p-0 ', className)} {...props}>
      {children}
    </div>
  )
}

export const LeftSideBar: React.FC<ComponentProps<'aside'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <aside
      className={twMerge(
        'flex flex-col flex-[1] h-full m-0 p-0 bg-gradient-to-b from-sky-50 via-cyan-50 to-blue-50 border-r border-sky-200/60 dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:border-slate-700/50',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

export const CentralBar: React.FC<ComponentProps<'section'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <section
      className={twMerge(
        'flex flex-col flex-[3] h-full m-0 p-0 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 shadow-inner dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export const RightSideBar: React.FC<ComponentProps<'aside'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <aside
      className={twMerge(
        'flex flex-col flex-[1] h-full m-0 p-0 bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 border-l border-emerald-200/60 dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:border-slate-700/50',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}
