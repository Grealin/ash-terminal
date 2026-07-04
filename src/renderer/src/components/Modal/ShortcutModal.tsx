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
          'relative w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-bg-primary)] p-6 shadow-[var(--shadow-md)]'
        )}
      >
        {/* 标题和关闭按钮 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">快捷键说明</h3>
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-full p-1 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)]'
            )}
          >
            <Icon name="x" size="md" />
          </button>
        </div>

        {/* 内容 */}
        <div className="space-y-4">
          {/* 标题说明 */}
          <div className="mb-4">
            <p className="text-sm text-[var(--color-text-tertiary)]">
              以下是终端编辑的常用快捷键：
            </p>
          </div>

          {/* 快捷键列表 */}
          <div className="space-y-3">
            {/* 全选 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3'
              )}
            >
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">全选</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  A
                </kbd>
              </div>
            </div>

            {/* 复制 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3'
              )}
            >
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">复制</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  C
                </kbd>
              </div>
            </div>

            {/* 粘贴 */}
            <div
              className={twMerge(
                'flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)] p-3'
              )}
            >
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">粘贴</span>
              <div className="flex items-center space-x-1">
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Shift
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
                  )}
                >
                  Ctrl
                </kbd>
                <span className="text-[var(--color-text-tertiary)]">+</span>
                <kbd
                  className={twMerge(
                    'rounded border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-2 py-1 text-xs font-semibold text-[var(--color-text-secondary)] shadow-sm'
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
              'mt-4 rounded-[var(--radius-lg)] border border-[var(--ash-accent)]-subtle bg-[var(--ash-accent)]-subtle p-3'
            )}
          >
            <p className="text-xs text-[var(--ash-accent)]">
              <Icon
                name="lightbulb"
                size="sm"
                className="mr-1 inline-block text-[var(--ash-accent)]"
              />
              提示：这些快捷键仅在终端窗口中有效
            </p>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleClose}
            className={twMerge(
              'rounded-[var(--radius-lg)] px-4 py-2 text-sm font-medium text-white',
              'bg-[var(--ash-accent)] hover:opacity-90 transition-colors'
            )}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
