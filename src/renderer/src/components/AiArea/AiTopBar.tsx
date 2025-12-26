import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

interface AiTopBarProps extends ComponentProps<'div'> {
  onViewChange: (view: 'chat' | 'history' | 'settings') => void
  currentView: 'chat' | 'history' | 'settings'
}

export const AiTopBar: React.FC<AiTopBarProps> = ({
  onViewChange,
  currentView,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'flex items-center justify-between h-[41px] px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        className
      )}
      {...props}
    >
      {/* 左侧标题 */}
      <div className="flex items-center">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Ash Agent</h2>
      </div>

      {/* 右侧按钮组 */}
      <div className="flex items-center space-x-1">
        {/* 创建任务按钮 */}
        <button
          onClick={() => onViewChange('chat')}
          className={twMerge(
            'p-1.5 rounded transition-colors',
            currentView === 'chat'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
          title="创建任务"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* 历史记录按钮 */}
        <button
          onClick={() => onViewChange('history')}
          className={twMerge(
            'p-1.5 rounded transition-colors',
            currentView === 'history'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
          title="历史记录"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* 设置按钮 */}
        <button
          onClick={() => onViewChange('settings')}
          className={twMerge(
            'p-1.5 rounded transition-colors',
            currentView === 'settings'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
          title="设置"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
