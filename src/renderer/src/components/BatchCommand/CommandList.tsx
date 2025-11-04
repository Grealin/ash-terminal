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
    <div className={twMerge('flex-1 min-h-0 overflow-hidden', className)} {...props}>
      {children}
    </div>
  )
}

export const CommandListContent: React.FC = () => {
  return (
    <div className="flex flex-col gap-2 p-4 h-full overflow-auto">
      This is the CommandList content
    </div>
  )
}
