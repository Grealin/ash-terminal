import { useConfig } from '@/hooks'
import { isModalTerminalSettingsOpenAtom } from '@/store'
import { TerminalConfig } from '@shared/models'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export const TerminalSettingsModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isModalTerminalSettingsOpenAtom)
  const { config, updateConfigField, loading } = useConfig()
  const [localSettings, setLocalSettings] = useState<TerminalConfig>(() => ({
    fontSize: 14
  }))

  // 当 Modal 打开时，重置本地状态为配置文件中的实际值
  useEffect(() => {
    if (isOpen && !loading && config) {
      setLocalSettings({
        fontSize: config.terminal?.fontSize || 14
      })
    }
  }, [isOpen, loading, config])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [setIsOpen])

  const handleSave = useCallback(async () => {
    try {
      await updateConfigField('terminal.fontSize', localSettings.fontSize)
      handleClose()
    } catch (error) {
      console.error('Failed to save terminal settings:', error)
    }
  }, [localSettings, updateConfigField, handleClose])

  const handleFontSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value >= 8 && value <= 32) {
      setLocalSettings((prev) => ({ ...prev, fontSize: value }))
    }
  }, [])

  // 其它配置项已移除

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
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">终端设置</h3>
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
          {/* 字体大小 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--color-text-secondary)]">
              字体大小
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="8"
                max="32"
                value={localSettings.fontSize}
                onChange={handleFontSizeChange}
                className={twMerge(
                  'h-2 w-full appearance-none rounded-[var(--radius-lg)] bg-[var(--color-bg-tertiary)]',
                  'slider-thumb:h-4 slider-thumb:w-4 slider-thumb:rounded-full slider-thumb:bg-[var(--ash-accent)]'
                )}
              />
              <input
                type="number"
                min="8"
                max="32"
                value={localSettings.fontSize}
                onChange={handleFontSizeChange}
                spellCheck={false}
                className={twMerge(
                  'w-16 rounded border border-[var(--color-border-primary)] px-2 py-1 text-center text-sm bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]'
                )}
              />
            </div>
          </div>

          {/* 提示：需重启后生效 */}
          <p className="text-xs text-[var(--color-text-tertiary)]">修改设置后重启后生效</p>

          {/* 其它配置项（字体族、时间戳、行号）已取消 */}
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
