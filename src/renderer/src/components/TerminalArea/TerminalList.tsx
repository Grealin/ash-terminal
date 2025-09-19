import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const TerminalListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={twMerge('flex-2 border-2 border-amber-400', className)} {...props}>
      {children}
    </div>
  )
}
