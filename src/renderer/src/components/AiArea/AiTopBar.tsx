import { Icon } from '@/components/Icon'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

interface AiTopBarProps extends ComponentProps<'div'> {
  onViewChange: (view: 'chat' | 'history' | 'settings') => void
  currentView: 'chat' | 'history' | 'settings'
  onNewTask?: () => void
  onApiError?: (error: string) => void
}

export const AiTopBar: React.FC<AiTopBarProps> = ({
  onViewChange,
  currentView,
  onNewTask,
  className,
  ...props
}) => {
  const handleChatView = (): void => {
    // 切换到对话视图
    onViewChange('chat')
  }

  return (
    <div
      className={twMerge(
        'flex min-w-[280px] items-center justify-between h-[41px] px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
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
        {/* 新建任务按钮 */}
        <button
          onClick={onNewTask}
          className="p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
          title="新建任务"
        >
          <Icon name="file-plus" size="md" />
        </button>

        {/* 对话按钮 */}
        <button
          onClick={handleChatView}
          className={twMerge(
            'p-1.5 rounded transition-colors',
            currentView === 'chat'
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          )}
          title="对话"
        >
          <Icon name="message-circle" size="md" />
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
          <Icon name="clock" size="md" />
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
          <Icon name="settings" size="md" />
        </button>
      </div>
    </div>
  )
}
