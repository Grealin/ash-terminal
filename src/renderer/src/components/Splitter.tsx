import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export interface SplitterProps extends ComponentProps<'div'> {
  direction?: 'horizontal' | 'vertical'
}

export const Splitter: React.FC<SplitterProps> = ({
  direction = 'horizontal',
  className,
  style,
  ...props
}) => {
  const isHorizontal = direction === 'horizontal'
  return (
    <div
      className={twMerge(
        'shrink-0 transition-colors duration-150',
        'bg-[var(--color-border-primary)]',
        'hover:bg-[var(--ash-accent)]',
        'active:bg-[var(--ash-accent)]',
        isHorizontal ? 'w-0.5 cursor-col-resize hover:w-1' : 'h-0.5 cursor-row-resize hover:h-1',
        className
      )}
      style={{ ...(isHorizontal ? { width: '2px' } : { height: '2px' }), ...style }}
      {...props}
    />
  )
}
