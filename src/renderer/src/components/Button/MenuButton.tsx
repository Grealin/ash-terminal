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
        'py-1 rounded-md text-slate-700 hover:bg-slate-300/60',
        'text-left text-sm pl-3',
        'dark:hover:bg-slate-600/60 dark:text-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
