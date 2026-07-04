import { Icon } from '@/components/Icon'
import { useSSHConnection } from '@/hooks'
import { useMonitorList } from '@/hooks/AreaClosed'
import { SSHService } from '@/services'
import { currentSessionIdAtom, monitorRefreshIntervalAtom } from '@/store'
import { SystemMonitorData } from '@shared/models'
import { useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type ViewMode = 'system' | 'process'

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
        'flex flex-col flex-1 min-h-0 border-b border-r border-[var(--color-border-primary)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const MonitorListContent: React.FC = () => {
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const refreshInterval = useAtomValue(monitorRefreshIntervalAtom)
  const { isConnected, isDisconnected } = useSSHConnection()
  const [monitorData, setMonitorData] = useState<SystemMonitorData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('system')

  // 饼图组件
  const PieChart: React.FC<{ title: string; percent: number; color: string }> = ({
    title,
    percent,
    color
  }) => {
    const radius = 30
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference

    return (
      <div className="flex items-center">
        <div className="w-full flex flex-col items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="transform -rotate-90 w-full h-full max-w-[120px] max-h-[120px]"
          >
            <title>{title}</title>
            {/* 背景圆环 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              className="text-gray-200 dark:text-gray-700"
            />
            {/* 进度圆环 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
            {/* 中心文字 */}
            <text
              x="50"
              y="50"
              textAnchor="middle"
              dominantBaseline="middle"
              className="transform rotate-90 text-xs font-bold fill-gray-900 dark:fill-gray-100"
              style={{ transformOrigin: 'center' }}
            >
              {percent.toFixed(1)}%
            </text>
          </svg>
        </div>
      </div>
    )
  }

  // 加载监控数据
  const loadMonitorData = async (): Promise<void> => {
    if (!currentSessionId || !isConnected) {
      setMonitorData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const data = await SSHService.getSystemMonitorData(currentSessionId)
      setMonitorData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monitor data')
      setMonitorData(null)
    } finally {
      setLoading(false)
    }
  }

  // 当会话变化或连接状态变化时重新加载数据
  useEffect(() => {
    if (currentSessionId && isConnected) {
      loadMonitorData()
      // 使用配置的刷新间隔
      const interval = setInterval(loadMonitorData, refreshInterval)
      return () => clearInterval(interval)
    } else {
      setMonitorData(null)
      setError(null)
    }
    return undefined
  }, [currentSessionId, isConnected, refreshInterval]) // eslint-disable-line react-hooks/exhaustive-deps

  // 当连接断开时重置状态
  useEffect(() => {
    if (isDisconnected) {
      setMonitorData(null)
      setError(null)
      setLoading(false)
    }
  }, [isDisconnected])

  // 格式化内存大小（KB转为更易读的格式）
  const formatMemory = (kb: number): string => {
    if (kb >= 1024 * 1024) {
      return `${(kb / (1024 * 1024)).toFixed(2)} GB`
    } else if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`
    } else {
      return `${kb.toFixed(0)} KB`
    }
  }

  // 格式化百分比
  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  if (!currentSessionId || !isConnected) {
    return (
      <div className="flex flex-col h-full p-3 bg-[var(--color-bg-primary)]">
        <div className="flex items-center justify-center h-full text-[var(--color-text-tertiary)]">
          <div className="text-center">
            <Icon name="bar-chart-3" size="xl" className="mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {!currentSessionId ? '选择 SSH 会话以查看系统监控' : '等待 SSH 连接建立...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-[var(--color-border-primary)]">
        <div className="flex items-center space-x-2">
          <button
            onClick={loadMonitorData}
            disabled={loading}
            className="p-1 rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] transition-colors disabled:opacity-50"
            title="刷新"
          >
            <Icon name="refresh-cw" size="sm" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('system')}
            className="w-6 h-6 rounded-[var(--radius-md)] text-slate-600 hover:text-slate-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center group dark:text-[var(--color-text-tertiary)] dark:hover:text-slate-300 dark:hover:bg-gray-700"
            title="性能监控"
          >
            {viewMode === 'system' ? (
              <Icon
                name="bar-chart-3"
                size="sm"
                className="group-hover:scale-110 transition-transform text-[var(--ash-accent)]"
              />
            ) : (
              <Icon
                name="bar-chart-3"
                size="sm"
                className="group-hover:scale-110 transition-transform"
              />
            )}
          </button>
          <button
            onClick={() => setViewMode('process')}
            className="w-6 h-6 rounded-[var(--radius-md)] text-slate-600 hover:text-slate-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center group dark:text-[var(--color-text-tertiary)] dark:hover:text-slate-300 dark:hover:bg-gray-700"
            title="进程列表"
          >
            {viewMode === 'process' ? (
              <Icon
                name="list"
                size="sm"
                className="group-hover:scale-110 transition-transform text-[var(--ash-accent)]"
              />
            ) : (
              <Icon name="list" size="sm" className="group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div
        className={`flex-1 p-3 ${viewMode === 'process' ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        {loading && !monitorData ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center space-x-2 text-[var(--color-text-tertiary)]">
              <Icon name="loader-2" size="xs" className="animate-spin" />
              <span className="text-xs">加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-[var(--color-error)]">
              <Icon name="alert-circle" size="md" className="mx-auto mb-1" />
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : monitorData ? (
          <div className="h-full w-full flex flex-col">
            {viewMode === 'system' ? (
              // 性能占用情况
              <>
                {/* CPU 和内存使用率饼图 */}
                <div className="flex-1 flex items-center justify-center">
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <PieChart
                      title="CPU"
                      percent={monitorData.systemInfo.cpuUsage}
                      color="#3b82f6"
                    />
                    <PieChart
                      title="内存"
                      percent={
                        (monitorData.systemInfo.usedMemory / monitorData.systemInfo.totalMemory) *
                        100
                      }
                      color="#f97316"
                    />
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="flex-[4] bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] p-2 space-y-1 overflow-y-auto">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">当前时间</span>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">
                      {monitorData.systemInfo.currentTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">运行时间</span>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">
                      {monitorData.systemInfo.uptime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">CPU 占用</span>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">
                      {formatPercent(monitorData.systemInfo.cpuUsage)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">内存占用</span>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">
                      {formatMemory(monitorData.systemInfo.usedMemory)}/
                      {formatMemory(monitorData.systemInfo.totalMemory)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              // 进程展示情况
              <>
                {/* 进程状态 */}
                <div className="bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)]  p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">总进程数</span>
                    <span className="text-xs font-mono text-[var(--color-text-primary)]">
                      {monitorData.processStats.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">运行中</span>
                    <span className="text-xs font-mono text-green-600 dark:text-green-400">
                      {monitorData.processStats.running}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">已停止</span>
                    <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
                      {monitorData.processStats.stopped}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--color-text-secondary)]">僵尸进程</span>
                    <span className="text-xs font-mono text-red-600 dark:text-red-400">
                      {monitorData.processStats.zombie}
                    </span>
                  </div>
                </div>

                {/* 进程列表 */}
                <div>
                  <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">
                    CPU 占用 Top 5
                  </div>
                  <div className="space-y-1">
                    {monitorData.topProcesses.length > 0 ? (
                      monitorData.topProcesses.map((proc, index) => (
                        <div
                          key={`${proc.pid}-${index}`}
                          className="bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="text-xs font-mono text-[var(--color-text-primary)] truncate flex-1">
                              {proc.command}
                            </span>
                            <span className="text-xs font-mono font-bold text-[var(--ash-accent)] ml-2">
                              {formatPercent(proc.cpuPercent)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-[var(--color-text-tertiary)]">
                              PID: {proc.pid} • {proc.user}
                            </span>
                            <span className="text-[var(--color-text-tertiary)]">
                              MEM: {formatPercent(proc.memPercent)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-[var(--color-text-tertiary)] py-4">
                        暂无进程数据
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-[var(--color-text-tertiary)]">
              <p className="text-xs">暂无监控数据</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
