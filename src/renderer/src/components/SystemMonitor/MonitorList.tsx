import { useMonitorList } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const MonitorListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useMonitorList()

  if (!visible) {
    return null
  }

  return (
    <div className={twMerge('flex flex-col flex-1 min-h-0', className)} {...props}>
      {children}
    </div>
  )
}

export const MonitorListContent: React.FC = () => {
  return <div className="flex flex-col gap-2 p-4">This is the MonitorList content</div>
}
