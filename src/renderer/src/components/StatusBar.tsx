import { useSSHConnection } from '@/hooks/SSHConnection'
import { currentSessionIdAtom } from '@/store'
import { useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const StatusBar: React.FC<ComponentProps<'footer'>> = ({ className, ...props }) => {
  const { connectionStatus } = useSSHConnection()
  const currentSessionId = useAtomValue(currentSessionIdAtom)

  const isConnected = connectionStatus === 'connected'
  const statusColor = isConnected ? 'var(--color-success)' : 'var(--color-text-tertiary)'
  const statusText = isConnected ? '已连接' : currentSessionId ? '连接中...' : '未连接'

  return (
    <footer
      className={twMerge(
        'flex items-center justify-between h-[25px] px-3 shrink-0',
        'bg-[var(--color-bg-secondary)]',
        'border-t border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-[11px] leading-none" style={{ color: 'var(--color-text-secondary)' }}>
          {statusText}
        </span>
      </div>
      <span className="text-[11px] leading-none" style={{ color: 'var(--color-text-tertiary)' }}>
        ASH Terminal v1.1.0
      </span>
    </footer>
  )
}
