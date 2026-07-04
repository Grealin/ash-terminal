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
  const tabs: Array<{ key: 'chat' | 'history' | 'settings'; label: string }> = [
    { key: 'chat', label: '对话' },
    { key: 'history', label: '历史' },
    { key: 'settings', label: '设置' }
  ]

  return (
    <div
      className={twMerge(
        'flex items-center justify-between h-[41px] border-b border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]',
        className
      )}
      {...props}
    >
      {/* 左侧 Tab 栏 */}
      <div className="flex items-center h-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onViewChange(tab.key)}
            className={twMerge(
              'h-full px-4 text-[13px] transition-colors border-b-2',
              currentView === tab.key
                ? 'text-[var(--ash-accent)] border-[var(--ash-accent)]'
                : 'text-[var(--color-text-tertiary)] border-transparent hover:text-[var(--color-text-secondary)]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 右侧新建任务按钮 */}
      <button
        onClick={onNewTask}
        className="p-1.5 mr-1 rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
        title="新建任务"
      >
        <Icon name="file-plus" size="md" />
      </button>
    </div>
  )
}
