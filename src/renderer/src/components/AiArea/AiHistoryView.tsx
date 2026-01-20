import { AIService } from '@/services'
import { currentSessionIdAtom } from '@/store/SessionStore'
import { currentTaskAtom, tasksAtom } from '@/store/TaskStore'
import { Task } from '@shared/models/Task'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface AiHistoryViewProps {
  onViewChange?: (view: 'chat' | 'history' | 'settings') => void
  onApiError?: (error: string) => void
}

export const AiHistoryView: React.FC<AiHistoryViewProps> = ({ onViewChange, onApiError }) => {
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [tasks, setTasks] = useAtom(tasksAtom)
  const setCurrentTask = useSetAtom(currentTaskAtom)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleNewTask = async (): Promise<void> => {
    // 清空当前任务状态并切换到 chat 视图
    setCurrentTask(null)
    onViewChange?.('chat')

    // 只有在存在 SSH 连接时才创建新任务
    if (!currentSessionId) return

    try {
      await AIService.prepareNewTask(currentSessionId)
    } catch (error) {
      console.error('Failed to prepare new task:', error)
      // 检查是否是 API Key 配置错误
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (
        errorMessage.includes('API Key 未配置') ||
        errorMessage.includes('API Key') ||
        errorMessage.includes('OpenAI 客户端失败')
      ) {
        onApiError?.('API 配置有误，请检查您的 API Key 配置')
      }
    }
  }

  // 加载任务列表
  useEffect(() => {
    if (!currentSessionId) {
      setTasks([])
      return
    }

    const loadTasks = async (): Promise<void> => {
      try {
        const taskList = await AIService.getTaskList(currentSessionId)
        setTasks(taskList)
      } catch (error) {
        console.error('Failed to load tasks:', error)
      }
    }

    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  // 监听任务切换事件
  useEffect(() => {
    if (!currentSessionId) return

    const unsubscribe = AIService.onTaskSwitched(currentSessionId, () => {
      // 刷新任务列表
      AIService.getTaskList(currentSessionId).then((taskList) => {
        setTasks(taskList)
      })
    })
    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  const handleSwitchTask = async (taskId: string): Promise<void> => {
    if (!currentSessionId || isLoading) return
    try {
      setIsLoading(true)
      const task = await AIService.switchTask(currentSessionId, taskId)
      // 更新当前任务状态，触发对话视图加载消息
      setCurrentTask(task)
      setSelectedTaskId(taskId)
      // 自动切换到对话视图
      onViewChange?.('chat')
    } catch (error) {
      console.error('Failed to switch task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    if (!currentSessionId) return
    if (!confirm('确定要删除这个任务吗？')) return

    try {
      const deleted = await AIService.deleteTask(currentSessionId, taskId)
      if (deleted) {
        // 刷新任务列表
        const taskList = await AIService.getTaskList(currentSessionId)
        setTasks(taskList)
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null)
          setCurrentTask(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const handleStartEdit = (task: Task): void => {
    setEditingTaskId(task.id)
    setEditingName(task.name)
  }

  const handleCancelEdit = (): void => {
    setEditingTaskId(null)
    setEditingName('')
  }

  const handleSaveEdit = async (taskId: string): Promise<void> => {
    if (!currentSessionId || !editingName.trim()) {
      handleCancelEdit()
      return
    }

    try {
      const updated = await AIService.updateTaskName(currentSessionId, taskId, editingName.trim())
      if (updated) {
        // 刷新任务列表
        const taskList = await AIService.getTaskList(currentSessionId)
        setTasks(taskList)
        handleCancelEdit()
      }
    } catch (error) {
      console.error('Failed to update task name:', error)
      handleCancelEdit()
    }
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  }

  const getMessageCount = (task: Task): number => {
    return task.messageCount ?? task.messages?.length ?? 0
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">历史任务</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{tasks.length} 个任务</span>
          {/* 创建新任务按钮 */}
          <button
            onClick={handleNewTask}
            className="p-1 text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
            title="创建新任务"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto relative">
        {/* 加载遮罩 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="loading loading-spinner loading-md text-blue-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">加载任务中...</span>
            </div>
          </div>
        )}

        {!currentSessionId ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">请先连接 SSH 会话</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400">暂无历史任务</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={twMerge(
                  'p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800',
                  selectedTaskId === task.id && 'bg-blue-50 dark:bg-blue-900/20',
                  isLoading && 'pointer-events-none opacity-60'
                )}
                onClick={() => {
                  // 编辑模式下不触发切换任务
                  if (editingTaskId !== task.id && !isLoading) {
                    handleSwitchTask(task.id)
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-2">
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveEdit(task.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(task.id)
                          } else if (e.key === 'Escape') {
                            handleCancelEdit()
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-sm border border-blue-500 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {task.name}
                      </h4>
                    )}
                    <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(task.createdAt)}</span>
                      <span>•</span>
                      <span>{getMessageCount(task)} 条消息</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    {/* 编辑按钮 */}
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="重命名"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    </button>
                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
          </div>
        )}
      </div>
    </div>
  )
}
