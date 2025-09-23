import { useCommandList } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const CommandListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useCommandList()

  if (!visible) {
    return null
  }

  return (
    <div className={twMerge('flex-1', className)} {...props}>
      {children}
    </div>
  )
}
