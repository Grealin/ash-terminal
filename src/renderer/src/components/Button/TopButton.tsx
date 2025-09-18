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
        'px-3 py-2 text-sm text-slate-700',
        'hover:bg-slate-200 rounded transition-all duration-150',
        'dark:text-slate-300 dark:hover:bg-slate-800/50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
