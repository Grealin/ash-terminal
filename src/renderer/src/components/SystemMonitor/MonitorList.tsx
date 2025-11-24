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
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-r border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const MonitorListContent: React.FC = () => {
  return (
    <div className="flex flex-col h-full p-3 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <div className=" text-gray-900 dark:text-gray-100">This is the MonitorList content</div>
    </div>
  )
}
