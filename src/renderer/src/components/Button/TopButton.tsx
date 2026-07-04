import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const TopButton: React.FC<ComponentProps<'button'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={twMerge(
        'text-[var(--color-text-secondary)] text-[13px] px-3 py-2',
        'border-b-2 border-transparent hover:border-[var(--ash-accent)]',
        'hover:text-[var(--color-text-primary)] transition-all duration-150',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
