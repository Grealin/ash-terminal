import { useSSHConnection } from '@/hooks'
import { useMonitorList } from '@/hooks/AreaClosed'
import { SSHService } from '@/services'
import { currentSessionIdAtom } from '@/store'
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
  const currentSessionId = useAtomValue(currentSessionIdAtom)
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
    const radius = 35
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percent / 100) * circumference

    return (
      <div className="flex items-center">
        <div className="w-full aspect-square flex flex-col items-center justify-center">
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
      // 设置定时刷新（每3秒）
      const interval = setInterval(loadMonitorData, 3000)
      return () => clearInterval(interval)
    } else {
      setMonitorData(null)
      setError(null)
    }
    return undefined
  }, [currentSessionId, isConnected])

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
      <div className="flex flex-col h-full p-3 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p className="text-sm">
              {!currentSessionId ? '选择 SSH 会话以查看系统监控' : '等待 SSH 连接建立...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={loadMonitorData}
            disabled={loading}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="刷新"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setViewMode('system')}
            className="w-6 h-6 rounded-md text-slate-600 hover:text-slate-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center group dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-gray-700"
            title="性能监控"
          >
            {viewMode === 'system' ? (
              // 性能图标（已选中）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            ) : (
              // 性能图标（未选中）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setViewMode('process')}
            className="w-6 h-6 rounded-md text-slate-600 hover:text-slate-700 hover:bg-gray-200 transition-all duration-200 flex items-center justify-center group dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-gray-700"
            title="进程列表"
          >
            {viewMode === 'process' ? (
              // 进程图标（已选中）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform text-blue-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              // 进程图标（未选中）
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                  clipRule="evenodd"
                />
              </svg>
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
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-xs">加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-red-500">
              <svg
                className="w-5 h-5 mx-auto mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : monitorData ? (
          <div className="space-y-3  h-full w-full">
            {viewMode === 'system' ? (
              // 性能占用情况
              <>
                {/* 时间信息 */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">当前时间</span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {monitorData.systemInfo.currentTime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">运行时间</span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {monitorData.systemInfo.uptime}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">CPU 占用</span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {formatPercent(monitorData.systemInfo.cpuUsage)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">内存占用</span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {formatMemory(monitorData.systemInfo.usedMemory)}/
                      {formatMemory(monitorData.systemInfo.totalMemory)}
                    </span>
                  </div>
                </div>

                {/* CPU 和内存使用率饼图 */}
                <div>
                  <div className="grid grid-cols-2 gap-3 h-full w-full">
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
              </>
            ) : (
              // 进程展示情况
              <>
                {/* 进程状态 */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded  p-2 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">总进程数</span>
                    <span className="text-xs font-mono text-gray-900 dark:text-gray-100">
                      {monitorData.processStats.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">运行中</span>
                    <span className="text-xs font-mono text-green-600 dark:text-green-400">
                      {monitorData.processStats.running}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">已停止</span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                      {monitorData.processStats.stopped}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600 dark:text-gray-400">僵尸进程</span>
                    <span className="text-xs font-mono text-red-600 dark:text-red-400">
                      {monitorData.processStats.zombie}
                    </span>
                  </div>
                </div>

                {/* 进程列表 */}
                <div>
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    CPU 占用 Top 5
                  </div>
                  <div className="space-y-1">
                    {monitorData.topProcesses.length > 0 ? (
                      monitorData.topProcesses.map((proc, index) => (
                        <div
                          key={`${proc.pid}-${index}`}
                          className="bg-gray-50 dark:bg-gray-800 rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-0.5">
                            <span className="text-xs font-mono text-gray-900 dark:text-gray-100 truncate flex-1">
                              {proc.command}
                            </span>
                            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 ml-2">
                              {formatPercent(proc.cpuPercent)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-gray-500 dark:text-gray-400">
                              PID: {proc.pid} • {proc.user}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              MEM: {formatPercent(proc.memPercent)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-4">
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
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-xs">暂无监控数据</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
