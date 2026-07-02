import { Icon } from '@/components/Icon'
import { isModalShortcutOpenAtom } from '@/store'
import { useAtom } from 'jotai'
import { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'

export const ShortcutModal: React.FC = () => {
  const [isOpen, setIsOpen] = useAtom(isModalShortcutOpenAtom)

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
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">快捷键说明</h3>
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600',
              'dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
            )}
          >
            <Icon name="x" size="md" />
          </button>
        </div>

        {/* 内容 */}
        <div className="space-y-4">
          {/* 标题说明 */}
          <div className="mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              以下是终端编辑的常用快捷键：
            </p>
          </div>

          {/* 快捷键列表 */}
          <div className="space-y-3">
            {/* 全选 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3',
                'dark:border-slate-700 dark:bg-slate-700/50'
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">全选</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  A
                </kbd>
              </div>
            </div>

            {/* 复制 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3',
                'dark:border-slate-700 dark:bg-slate-700/50'
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">复制</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  C
                </kbd>
              </div>
            </div>

            {/* 粘贴 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3',
                'dark:border-slate-700 dark:bg-slate-700/50'
              )}
            >
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">粘贴</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-slate-400">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm',
                    'dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  V
                </kbd>
              </div>
            </div>
          </div>

          {/* 提示信息 */}
          <div
            className={twMerge(
              'mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3',
              'dark:border-blue-800 dark:bg-blue-900/30'
            )}
          >
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <Icon name="lightbulb" size="sm" className="mr-1 inline-block text-blue-500" />
              提示：这些快捷键仅在终端窗口中有效
            </p>
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
