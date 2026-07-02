import { Icon } from '@/components/Icon'
import {
  useAiInterface,
  useFileList,
  useInitializeConfig,
  useLeftSideBar,
  useMonitorList,
  useRightSideBar,
  useSessionList
} from '@/hooks'
import { darkStateAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout: React.FC<ComponentProps<'main'>> = ({ children, className, ...props }) => {
  const { loading } = useInitializeConfig()
  const isDark = useAtomValue(darkStateAtom)

  // 如果正在加载，显示加载状态防止闪烁
  if (loading) {
    return (
      <main
        className={twMerge(
          'flex h-screen flex-col m-0 p-0 bg-slate-400 min-h-screen overflow-hidden',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-center h-full">
          <div className="flex items-center justify-center">
            <Icon name="loader-2" size="xl" className="animate-spin text-slate-300" />
          </div>
        </div>
      </main>
    )
  }

  return (
    <main
      className={twMerge(
        'flex h-screen flex-col m-0 p-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen overflow-hidden',
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
    <div
      className={twMerge('flex flex-row flex-1 m-0 p-0 min-h-0 overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const LeftSideBar: React.FC<ComponentProps<'aside'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useLeftSideBar()
  const { visible: aiInterfaceVisible } = useAiInterface()

  // 如果不可见，返回null
  if (!visible || !aiInterfaceVisible) return null

  return (
    <aside
      className={twMerge(
        'flex flex-col flex-[1] h-full m-0 p-0 bg-gradient-to-b from-sky-50 via-cyan-50 to-blue-50 border-r  border-emerald-200/60  dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:border-slate-700/50',
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
        'flex flex-col flex-[3] h-full min-h-0 m-0 p-0 overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50/30 shadow-inner dark:bg-gradient-to-br dark:from-slate-700 dark:via-slate-600 dark:to-slate-700',
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
  const { visible } = useRightSideBar()
  const { visible: sessionListVisible } = useSessionList()
  const { visible: fileListVisible } = useFileList()
  const { visible: monitorListVisible } = useMonitorList()

  // 如果不可见，返回null
  if (!visible || (!sessionListVisible && !fileListVisible && !monitorListVisible)) return null

  return (
    <aside
      className={twMerge(
        'flex flex-col flex-[1] h-full min-h-0 m-0 p-0 overflow-hidden bg-gradient-to-b from-emerald-50 via-teal-50 to-cyan-50 border-l border-emerald-200/60 dark:bg-gradient-to-b dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 dark:border-slate-700/50',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}
