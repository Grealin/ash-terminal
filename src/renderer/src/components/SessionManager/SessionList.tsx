import { useSessionList } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const SessionListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useSessionList()

  if (!visible) {
    return null
  }

  return (
    <div className={twMerge('flex-1 border-2 border-amber-400', className)} {...props}>
      {children}
    </div>
  )
}

export const SessionListContent: React.FC = () => {
  return <div className="flex flex-col gap-2 p-4">This is the session list content</div>
}
