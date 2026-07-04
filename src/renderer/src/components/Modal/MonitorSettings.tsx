import { useConfig } from '@/hooks'
import { isModalMonitorSettingsOpenAtom, monitorRefreshIntervalAtom } from '@/store'
import { MonitorConfig } from '@shared/models'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export const MonitorSettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isModalMonitorSettingsOpenAtom)
  const { config, updateConfigField, loading } = useConfig()
  const setMonitorRefreshInterval = useSetAtom(monitorRefreshIntervalAtom)
  const [localSettings, setLocalSettings] = useState<MonitorConfig>(() => ({
    refreshInterval: 3000
  }))

  // 当 Modal 打开时，重置本地状态为配置文件中的实际值
  useEffect(() => {
    if (isOpen && !loading && config) {
      setLocalSettings({
        refreshInterval: Math.max(3000, config.monitor?.refreshInterval || 3000)
      })
    }
  }, [isOpen, loading, config])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const handleSave = useCallback(async () => {
    try {
      // 先更新配置文件
      await updateConfigField('monitor.refreshInterval', localSettings.refreshInterval)
      // 再更新原子状态
      setMonitorRefreshInterval(localSettings.refreshInterval)
      handleClose()
    } catch (error) {
      console.error('Failed to save monitor settings:', error)
    }
  }, [localSettings, updateConfigField, setMonitorRefreshInterval, handleClose])

  const handleRefreshIntervalChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    // 确保最小值为3000
    if (!isNaN(value) && value >= 3000 && value <= 60000) {
      setLocalSettings((prev) => ({ ...prev, refreshInterval: value }))
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70">
      <div
        className={twMerge(
          'relative w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-bg-primary)] p-6 shadow-[var(--shadow-md)]'
        )}
      >
        {/* 标题 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">性能监视器设置</h3>
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]'
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
          {/* 刷新间隔 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              刷新间隔（毫秒）
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="3000"
                max="60000"
                step="1000"
                value={localSettings.refreshInterval}
                onChange={handleRefreshIntervalChange}
                spellCheck={false}
                className={twMerge(
                  'h-2 w-full appearance-none rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]',
                  'slider-thumb:h-4 slider-thumb:w-4 slider-thumb:rounded-full slider-thumb:bg-[var(--ash-accent)]'
                )}
              />
              <input
                type="number"
                min="3000"
                max="60000"
                step="1000"
                value={localSettings.refreshInterval}
                onChange={handleRefreshIntervalChange}
                spellCheck={false}
                className={twMerge(
                  'w-20 rounded border border-[var(--color-border-primary)] px-2 py-1 text-center text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
                )}
              />
            </div>
            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
              最小值：3000 毫秒（3 秒）
            </p>
          </div>

          {/* 提示 */}
          <p className="text-xs text-[var(--color-text-tertiary)]">修改刷新间隔后立即生效</p>
        </div>

        {/* 按钮 */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-[var(--radius-md)] border border-[var(--color-border-primary)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)]',
              'hover:bg-[var(--color-bg-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)]'
            )}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className={twMerge(
              'rounded-[var(--radius-md)] bg-[var(--ash-accent)] px-4 py-2 text-sm font-medium text-white',
              'hover:opacity-90 focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)]'
            )}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
