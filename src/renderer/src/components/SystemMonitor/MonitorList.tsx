import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const MonitorListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={twMerge('flex-1', className)} {...props}>
      {children}
    </div>
  )
}
