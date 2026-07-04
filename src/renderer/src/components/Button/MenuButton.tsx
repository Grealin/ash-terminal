import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const MenuButton: React.FC<ComponentProps<'button'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={twMerge(
        'text-[var(--color-text-secondary)] text-[13px] text-left pl-3 py-1',
        'hover:bg-[var(--ash-accent)]-subtle hover:text-[var(--color-text-primary)]',
        'border-l-[3px] border-l-transparent hover:border-l-[var(--ash-accent)]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
