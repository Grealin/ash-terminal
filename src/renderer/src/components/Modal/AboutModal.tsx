import icon from '@/assets/images/icon.png'
import { isModalAboutOpenAtom } from '@/store'
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'

export const AboutModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isModalAboutOpenAtom)

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div
        className={twMerge(
          'relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
          'dark:bg-slate-800 dark:shadow-slate-900/50'
        )}
      >
        {/* 标题和关闭按钮 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">关于</h3>
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600',
              'dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
            )}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="space-y-6">
          {/* 应用图标和名称 */}
          <div className="flex flex-col items-center justify-center space-y-3">
            <img src={icon} alt="ASH Terminal" className="h-20 w-20" />
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">ASH Terminal</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">版本 1.0.0</p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* 描述信息 */}
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p>
              <span className="font-semibold">ASH Terminal</span> 是一款基于 Electron 的智能 SSH
              终端，支持多会话管理、文件传输、系统监控和 AI 助手集成。
            </p>
            <p>
              通过集成先进的 AI 技术，ASH Terminal
              能够帮助您更高效地管理远程服务器，执行复杂的运维任务。
            </p>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-slate-200 dark:border-slate-700" />

          {/* 技术信息 */}
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span>作者：</span>
              <span className="font-medium">LinFeng</span>
            </div>
            <div className="flex justify-between">
              <span>开源协议：</span>
              <span className="font-medium">MIT</span>
            </div>
            <div className="flex justify-between">
              <span>技术栈：</span>
              <span className="font-medium">Electron + React + TypeScript</span>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-lg px-4 py-2 text-sm font-medium text-white',
              'bg-blue-500 hover:bg-blue-600 transition-colors',
              'dark:bg-blue-600 dark:hover:bg-blue-700'
            )}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
