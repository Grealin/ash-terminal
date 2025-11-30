import { useBatchCommand } from '@/hooks'
import { useCommandList } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const CommandListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useCommandList()

  if (!visible) {
    return null
  }

  return (
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-gray-300 dark:border-gray-700',
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

  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value > 0) {
      setInterval(value)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 工具栏 */}
      <div className="flex items-center justify-between h-[41px] px-2 border-b border-gray-200 dark:border-gray-700">
        {/* 左侧按钮组 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={start}
            disabled={!canStart || status === 'running'}
            className={twMerge(
              'px-3 py-1 text-xs rounded transition-colors',
              canStart && status !== 'running'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
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
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
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
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
            title="清除所有命令"
          >
            清除
          </button>

          {/* 状态指示 */}
          {status !== 'idle' && (
            <div className="flex items-center space-x-2 ml-2 pl-2 border-l border-gray-300 dark:border-gray-600">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {currentIndex} / {totalCommands}
              </span>
              {status === 'running' && (
                <svg
                  className="w-3 h-3 animate-spin text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* 右侧间隔设置 */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-gray-600 dark:text-gray-400">间隔</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={interval}
            onChange={handleIntervalChange}
            disabled={status === 'running'}
            className="w-16 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400">秒</span>
        </div>
      </div>

      {/* 命令输入区域 */}
      <div className="flex-1 overflow-hidden">
        <textarea
          value={commandText}
          onChange={(e) => setCommandText(e.target.value)}
          placeholder="在此输入批量命令，每行一个命令..."
          disabled={status === 'running'}
          className="w-full h-full px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none overflow-auto disabled:opacity-50 disabled:cursor-not-allowed"
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
