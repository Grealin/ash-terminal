import { Icon } from '@/components/Icon'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export type SheetWidth = 'sm' | 'md' | 'lg'

const widthMap: Record<SheetWidth, string> = {
  sm: '400px',
  md: '480px',
  lg: '560px'
}

export interface SheetModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  width?: SheetWidth
  children: ReactNode
  footer?: ReactNode
  closeOnBackdrop?: boolean
}

export const SheetModal: React.FC<SheetModalProps> = ({
  isOpen,
  onClose,
  title,
  width = 'md',
  children,
  footer,
  closeOnBackdrop = false
}) => {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      requestAnimationFrame(() => setAnimating(true))
      return
    }
    setAnimating(false)
    const t = setTimeout(() => setVisible(false), 150)
    return () => clearTimeout(t)
  }, [isOpen])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.3)' }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className={twMerge(
          'relative flex flex-col bg-[var(--color-bg-elevated)] rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)] transition-all duration-150 ease-out'
        )}
        style={{
          width: widthMap[width],
          maxHeight: '80vh',
          opacity: animating ? 1 : 0,
          transform: animating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(8px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-primary)]">
            <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{title}</h3>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--ash-accent)] transition-colors"
            >
              <Icon name="x" size="sm" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--color-border-primary)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
