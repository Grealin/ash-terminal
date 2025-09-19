import { useAiInterface } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const AiInterfaceMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useAiInterface()

  if (!visible) {
    return null
  }

  return (
    <div className={twMerge('flex-1 border-2 border-amber-400', className)} {...props}>
      {children}
    </div>
  )
}
