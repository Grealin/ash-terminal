import { Icon } from '@/components/Icon'
import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

export interface CollapsiblePanelProps {
  title: string
  badge?: number
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
}

export const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  badge,
  expanded,
  onToggle,
  children,
  className
}) => (
  <div className={twMerge('flex flex-col', className)}>
    <button
      onClick={onToggle}
      className="flex items-center h-9 px-3 shrink-0 cursor-pointer text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
    >
      <Icon
        name={expanded ? 'chevron-down' : 'chevron-right'}
        size="xs"
        className="mr-2 transition-transform duration-150"
      />
      <span className="text-[13px] font-medium flex-1 text-left">{title}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[11px] text-[var(--color-text-tertiary)] ml-2">{badge}</span>
      )}
    </button>
    <div
      className={twMerge(
        'overflow-hidden transition-all duration-200',
        expanded ? 'opacity-100' : 'max-h-0 opacity-0'
      )}
    >
      {children}
    </div>
  </div>
)
