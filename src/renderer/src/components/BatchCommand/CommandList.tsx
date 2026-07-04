import { Icon } from '@/components/Icon'
import { useBatchCommand } from '@/hooks'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const CommandListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-gray-300 dark:border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const CommandListContent: React.FC = () => {
  const {
    commandText,
    setCommandText,
    interval,
    setInterval,
    status,
    currentIndex,
    totalCommands,
    start,
    pause,
    clear,
    canStart,
    canPause,
    canClear
  } = useBatchCommand()

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value > 0) {
      setInterval(value)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      <div className="flex items-center justify-between h-[41px] px-2 border-b border-[var(--color-border-primary)]">
        {/* 左侧按钮组 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={start}
            disabled={!canStart || status === 'running'}
            className={twMerge(
              'px-3 py-1 text-xs rounded transition-colors',
              canStart && status !== 'running'
                ? 'bg-[var(--ash-accent)] hover:opacity-90 text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
            )}
            title="开始执行批量命令"
          >
            {status === 'paused' ? '继续' : '发送'}
          </button>
          <button
            onClick={pause}
            disabled={!canPause}
            className={twMerge(
              'px-3 py-1 text-xs rounded transition-colors',
              canPause
                ? 'bg-[var(--color-warning)] hover:opacity-90 text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
            )}
            title="暂停执行"
          >
            暂停
          </button>
          <button
            onClick={clear}
            disabled={!canClear}
            className={twMerge(
              'px-3 py-1 text-xs rounded transition-colors',
              canClear
                ? 'bg-[var(--color-error)] hover:opacity-90 text-white'
                : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
            )}
            title="清除所有命令"
          >
            清除
          </button>

          {/* 状态指示 */}
          {status !== 'idle' && (
            <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-[var(--color-border-primary)]">
              <span className="text-xs text-[var(--color-text-secondary)]">
                {currentIndex} / {totalCommands}
              </span>
              {status === 'running' && (
                <Icon name="loader-2" size="xs" className="animate-spin text-[var(--ash-accent)]" />
              )}
            </div>
          )}
        </div>

        {/* 右侧间隔设置 */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-[var(--color-text-secondary)]">间隔</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={interval.toFixed(1)}
            onChange={handleIntervalChange}
            disabled={status === 'running'}
            spellCheck={false}
            className="w-16 px-2 py-1 text-xs border border-[var(--color-border-primary)] rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-[var(--color-text-secondary)]">秒</span>
        </div>
      </div>

      {/* 命令输入区域 */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          placeholder="在此输入批量命令，每行一个命令..."
          disabled={status === 'running'}
          spellCheck={false}
          className="w-full h-full px-3 py-2 text-sm font-mono bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] placeholder-gray-400 dark:placeholder-[var(--color-text-tertiary)] focus:outline-none resize-none overflow-auto disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto',
            overflowY: 'auto'
          }}
        />
      </div>
    </div>
  )
}
