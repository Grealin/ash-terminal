import { ConfirmModal } from '@/components/Modal/GeneralModal'
import { useModalSession, useSSHConnection, useToast } from '@/hooks'
import { useSessionList } from '@/hooks/AreaClosed'
import { SSHService } from '@/services'
import { currentSessionIdAtom, editingSessionAtom, sessionsAtom } from '@/store'
import { SSHConfig } from '@shared/models'
import { useAtom } from 'jotai'
import type { ComponentProps } from 'react'
import { useEffect, useRef, useState } from 'react'
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

export const SessionListContent: React.FC = () => {
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)
  const [, setEditingSession] = useAtom(editingSessionAtom)
  const { openModal } = useModalSession()
  const { setConnecting, setConnected, setDisconnected, isConnecting, isConnected } =
    useSSHConnection()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteSession, setPendingDeleteSession] = useState<SSHConfig | null>(null)
  const [connectingId, setConnectingId] = useState<SSHConfig['id'] | null>(null)
  const toast = useToast()
  // 用于检测 isConnected 上升沿（只在从 false -> true 时触发提示）
  const prevConnectedRef = useRef<boolean>(false)

  // 初始化加载会话列表
  useEffect(() => {
    const loadSessions = async (): Promise<void> => {
      try {
        const sessionList = await SSHService.getSessions()
        setSessions(sessionList)
      } catch (error) {
        console.error('Failed to load sessions:', error)
      }
    }
    loadSessions()
  }, [setSessions])

  const handleCreateSession = (): void => {
    setEditingSession(null)
    openModal()
  }

  const handleEditSession = (session: SSHConfig): void => {
    setEditingSession(session)
    openModal()
  }

  // 触发删除确认
  const handleAskDelete = (session: SSHConfig): void => {
    // 如果待删除会话为当前激活（连接中或已连接）的会话，则取消删除
    if (session.id === currentSessionId && (isConnected || isConnecting)) {
      console.info('当前激活会话不能删除')
      return
    }
    setPendingDeleteSession(session)
    setConfirmOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDeleteSession) return
    const sessionId = pendingDeleteSession.id
    // 二次防护：如果待删除会话为当前激活（连接中或已连接）的会话，则取消删除
    if (sessionId === currentSessionId && (isConnected || isConnecting)) {
      setConfirmOpen(false)
      setPendingDeleteSession(null)
      console.info('当前激活会话不能删除')
      return
    }
    try {
      await SSHService.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    } finally {
      setConfirmOpen(false)
      setPendingDeleteSession(null)
    }
  }

  const handleConnectSession = async (session: SSHConfig): Promise<void> => {
    try {
      // 如果已有连接，禁止再连接其他会话，给出提示
      if (isConnected && currentSessionId) {
        // 如果是当前已连接的会话，忽略；否则提示先断开
        if (currentSessionId !== session.id) {
          toast.simple('请先断开当前会话链接', { type: 'warning' })
        } else {
          toast.simple('当前会话已连接', { type: 'info' })
        }
        return
      }
      setConnectingId(session.id)
      setConnecting()
      const result = await SSHService.connectSSH(session)
      if (result.success) {
        setCurrentSessionId(session.id)
        setConnected()
        console.log('Connected to session:', session.name)
      } else {
        setDisconnected()
        console.error('Connection failed:', result.error)
        // 通过全局 Toast 提示错误
        toast.simple(`连接失败: ${result.error}`, { type: 'error' })
      }
    } catch (error) {
      setDisconnected()
      console.error('Failed to connect:', error)
      toast.simple(`连接失败: ${(error as Error).message}`, { type: 'error' })
    } finally {
      setConnectingId(null)
    }
  }

  // 监听连接状态，上升沿触发一次 Toast
  useEffect(() => {
    if (!prevConnectedRef.current && isConnected && currentSessionId) {
      // 连接刚刚建立 -> 全局 Toast
      toast.simple('会话已成功连接', { type: 'success' })
    }
    prevConnectedRef.current = isConnected
  }, [isConnected, currentSessionId, toast])

  return (
    <div className="flex flex-col h-full p-3 pb-0 bg-white dark:bg-gray-900 ">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">SSH 会话</h3>
        <button
          onClick={handleCreateSession}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500 hover:bg-blue-600 text-white transition-colors"
          title="创建新会话"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-2 -mr-3 pr-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={twMerge(
              'p-2 rounded-lg border transition-all cursor-pointer',
              currentSessionId === session.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                  {session.name}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.username}@{session.host}:{session.port}
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={(): Promise<void> => handleConnectSession(session)}
                  disabled={
                    // 连接过程中所有按钮都禁用（包括正在连接的那一个）
                    isConnecting
                  }
                  className={twMerge(
                    'p-1 rounded transition-colors',
                    isConnecting
                      ? connectingId === session.id
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-300 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                  )}
                  title={
                    isConnecting
                      ? connectingId === session.id
                        ? '连接中...'
                        : '等待当前连接完成...'
                      : '连接'
                  }
                >
                  {isConnecting && connectingId === session.id ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleEditSession(session)}
                  className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="编辑"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleAskDelete(session)}
                  className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  title="删除"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            暂无 SSH 会话配置
          </div>
        )}
      </div>
      {/* 确认删除对话框 */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPendingDeleteSession(null)
        }}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        message={`确定要删除会话${pendingDeleteSession ? `「${pendingDeleteSession.name}」` : ''}吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
      />
      {/* 全局 Toast 已接管，无需本地 SimpleToast */}
    </div>
  )
}
