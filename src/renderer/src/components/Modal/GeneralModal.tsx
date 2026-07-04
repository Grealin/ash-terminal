import { Icon } from '@/components/Icon'
import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface GeneralModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  // 是否允许点击遮罩关闭，默认不允许
  closeOnBackdropClick?: boolean
}

export const GeneralModal: React.FC<GeneralModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
  width = 'md',
  showCloseButton = true,
  closeOnBackdropClick = false
}) => {
  if (!isOpen) return null

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl'
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={closeOnBackdropClick ? onClose : undefined}
    >
      {/* 背景遮罩 */}
      {/* <div className="absolute inset-0 bg-black/30 backdrop-blur-sm dark:bg-black/30" /> */}

      {/* 对话框内容 */}
      <div
        className={twMerge(
          'relative w-full rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] transition-all duration-200',
          'bg-[var(--color-bg-primary)] backdrop-blur-sm border border-[var(--color-border-primary)]',
          widthClasses[width],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-2 border-b border-[var(--color-border-primary)]">
            {title && (
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
            )}
            {!title && <div />}

            {showCloseButton && (
              <button
                onClick={onClose}
                className={twMerge(
                  'w-8 h-8 rounded-[var(--radius-md)] transition-all duration-200',
                  'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]',
                  'flex items-center justify-center group'
                )}
                title="关闭"
              >
                <Icon name="x" size="sm" className="group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        )}

        {/* 内容区域 */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// 简单的确认对话框组件
export const ConfirmModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title = '确认',
  message,
  confirmText = '确认',
  cancelText = '取消'
}) => {
  const handleConfirm = (): void => {
    onConfirm()
    onClose()
  }

  return (
    <GeneralModal isOpen={isOpen} onClose={onClose} title={title} width="sm" closeOnBackdropClick>
      <div className="space-y-4">
        <p className="text-[var(--color-text-secondary)] leading-relaxed">{message}</p>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className={twMerge(
              'px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-200',
              'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
            )}
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            className={twMerge(
              'px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-200',
              'text-white bg-[var(--ash-accent)] hover:opacity-90'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </GeneralModal>
  )
}
