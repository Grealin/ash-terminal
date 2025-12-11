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
          'relative w-full rounded-xl shadow-2xl transition-all duration-200',
          'bg-white/95 backdrop-blur-sm border border-slate-200/60',
          'dark:bg-slate-900/95 dark:border-slate-700/60',
          widthClasses[width],
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200/60 dark:border-slate-700/60">
            {title && (
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
            )}
            {!title && <div />}

            {showCloseButton && (
              <button
                onClick={onClose}
                className={twMerge(
                  'w-8 h-8 rounded-md transition-all duration-200',
                  'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60',
                  'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/60',
                  'flex items-center justify-center group'
                )}
                title="关闭"
              >
                <svg
                  className="w-4 h-4 group-hover:scale-110 transition-transform"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
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
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{message}</p>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className={twMerge(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'text-slate-600 bg-slate-100 hover:bg-slate-200',
              'dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
            )}
          >
            {cancelText}
          </button>

          <button
            onClick={handleConfirm}
            className={twMerge(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'text-white bg-blue-500 hover:bg-blue-600',
              'dark:bg-blue-600 dark:hover:bg-blue-700'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </GeneralModal>
  )
}
