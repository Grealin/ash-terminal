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
          'relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl',
          'dark:bg-slate-800 dark:shadow-slate-900/50'
        )}
      >
        {/* 标题 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">终端设置</h3>
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
          {/* 字体大小 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                  'h-2 w-full appearance-none rounded-lg bg-slate-200 dark:bg-slate-600',
                  'slider-thumb:h-4 slider-thumb:w-4 slider-thumb:rounded-full slider-thumb:bg-blue-500'
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
                  'w-16 rounded border border-slate-300 px-2 py-1 text-center text-sm',
                  'dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200'
                )}
              />
            </div>
          </div>

          {/* 提示：需重启后生效 */}
          <p className={twMerge('text-xs text-slate-500', 'dark:text-slate-400')}>
            修改设置后重启后生效
          </p>

          {/* 其它配置项（字体族、时间戳、行号）已取消 */}
        </div>

        {/* 按钮 */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700',
              'hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'
            )}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className={twMerge(
              'rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white',
              'hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500',
              'dark:bg-blue-500 dark:hover:bg-blue-600'
            )}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
