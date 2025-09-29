import { useModalSession, useSSHConnection } from '@/hooks'
import { useSessionList } from '@/hooks/AreaClosed'
import { SSHService, currentSessionIdAtom, sessionsAtom } from '@/services'
import { editingSessionAtom } from '@/store'
import { SSHConfig } from '@shared/models'
import { useAtom } from 'jotai'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
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
      className={twMerge('flex-1 border-b-1 border-gray-300 dark:border-gray-700', className)}
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
  const { setConnecting, setConnected, setDisconnected, isConnecting } = useSSHConnection()

  // 初始化加载会话列表
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessionList = await SSHService.getSessions()
        setSessions(sessionList)
      } catch (error) {
        console.error('Failed to load sessions:', error)
      }
    }
    loadSessions()
  }, [setSessions])

  const handleCreateSession = () => {
    setEditingSession(null)
    openModal()
  }

  const handleEditSession = (session: SSHConfig) => {
    setEditingSession(session)
    openModal()
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await SSHService.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const handleConnectSession = async (session: SSHConfig) => {
    try {
      setConnecting()
      const result = await SSHService.connectSSH(session)
      if (result.success) {
        setCurrentSessionId(session.id)
        setConnected()
        console.log('Connected to session:', session.name)
      } else {
        setDisconnected()
        console.error('Connection failed:', result.error)
      }
    } catch (error) {
      setDisconnected()
      console.error('Failed to connect:', error)
    }
  }

  return (
    <div className="flex flex-col h-full p-3 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
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
      <div className="flex-1 overflow-y-auto space-y-2">
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
                  onClick={() => handleConnectSession(session)}
                  disabled={isConnecting}
                  className={twMerge(
                    'p-1 rounded transition-colors',
                    isConnecting
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20'
                  )}
                  title={isConnecting ? '连接中...' : '连接'}
                >
                  {isConnecting ? (
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
                  onClick={() => handleDeleteSession(session.id)}
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
    </div>
  )
}
