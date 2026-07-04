import { Icon } from '@/components/Icon'
import { ConfirmModal } from '@/components/Modal'
import { useToast } from '@/hooks'
import { AIService } from '@/services'
import { currentSessionIdAtom } from '@/store/SessionStore'
import {
  currentMessagesAtom,
  currentTaskAtom,
  currentThoughtAtom,
  isAiProcessingAtom,
  selectedTaskIdAtom,
  streamingMessageAtom,
  tasksAtom
} from '@/store/TaskStore'
import { Task } from '@shared/models/Task'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

interface AiHistoryViewProps {
  onViewChange?: (view: 'chat' | 'history' | 'settings') => void
  isVisible?: boolean
}

export const AiHistoryView: React.FC<AiHistoryViewProps> = ({ onViewChange, isVisible }) => {
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [tasks, setTasks] = useAtom(tasksAtom)
  const setCurrentTask = useSetAtom(currentTaskAtom)
  const setCurrentMessages = useSetAtom(currentMessagesAtom)
  const setStreamingMessage = useSetAtom(streamingMessageAtom)
  const setCurrentThought = useSetAtom(currentThoughtAtom)
  const isProcessing = useAtomValue(isAiProcessingAtom)
  const setIsProcessing = useSetAtom(isAiProcessingAtom)
  const [selectedTaskId, setSelectedTaskId] = useAtom(selectedTaskIdAtom)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState<Task | null>(null)
  const [searchText, setSearchText] = useState('')
  const [clearAllConfirmOpen, setClearAllConfirmOpen] = useState(false)
  const toast = useToast()

  // 根据搜索文本筛选任务列表
  const filteredTasks = searchText.trim()
    ? tasks.filter((task) => task.name.toLowerCase().includes(searchText.toLowerCase().trim()))
    : tasks

  const handleNewTask = async (): Promise<void> => {
    // 如果当前任务正在执行，先停止它
    if (isProcessing && currentSessionId) {
      try {
        await AIService.stopTask(currentSessionId)
      } catch (error) {
        console.error('Failed to stop current task:', error)
      }
    }

    // 创建临时 Task 对象（使用时间戳生成临时 ID）
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      sessionId: currentSessionId || '',
      name: '新任务',
      createdAt: Date.now(),
      messages: [],
      messageCount: 0
    }

    // 设置临时任务为当前任务
    setCurrentTask(tempTask)
    setSelectedTaskId(null) // 临时任务不在历史列表中，所以 selectedTaskId 为 null
    setCurrentMessages([])
    setStreamingMessage('')
    setCurrentThought('')
    setIsProcessing(false)

    // 如果存在 SSH 连接，清空后端 Agent 的状态
    if (currentSessionId) {
      try {
        await AIService.prepareNewTask(currentSessionId)
      } catch (error) {
        console.error('Failed to prepare new task:', error)
      }
    }

    // 切换到 chat 视图，等待用户输入问题后再创建新任务
    onViewChange?.('chat')
  }

  const handleRefresh = async (): Promise<void> => {
    if (!currentSessionId || isLoading) return

    try {
      setIsLoading(true)
      const taskList = await AIService.getTaskList(currentSessionId)
      setTasks(taskList)
    } catch (error) {
      console.error('Failed to refresh tasks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 加载任务列表
  useEffect(() => {
    if (!currentSessionId) {
      setTasks([])
      setSearchText('')
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

  // 当组件可见时，重新加载任务列表
  useEffect(() => {
    if (isVisible) {
      handleRefresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  const handleSwitchTask = async (taskId: string): Promise<void> => {
    if (!currentSessionId || isLoading) return
    try {
      setIsLoading(true)

      // 如果当前任务正在执行，先停止它
      if (isProcessing) {
        try {
          await AIService.stopTask(currentSessionId)
        } catch (error) {
          console.error('Failed to stop current task:', error)
        }
      }

      const task = await AIService.switchTask(currentSessionId, taskId)
      // 更新当前任务状态，触发对话视图加载消息
      setCurrentTask(task)
      setSelectedTaskId(taskId)
      // 清空临时状态（切换任务时不应有流式输出或思考过程）
      setStreamingMessage('')
      setCurrentThought('')
      setIsProcessing(false)
      // 自动切换到对话视图
      onViewChange?.('chat')
    } catch (error) {
      console.error('Failed to switch task:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 触发删除确认
  const handleAskDelete = (task: Task): void => {
    setPendingDeleteTask(task)
    setConfirmOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async (): Promise<void> => {
    if (!currentSessionId || !pendingDeleteTask) return

    try {
      const deleted = await AIService.deleteTask(currentSessionId, pendingDeleteTask.id)
      if (deleted) {
        // 刷新任务列表
        const taskList = await AIService.getTaskList(currentSessionId)
        setTasks(taskList)
        if (selectedTaskId === pendingDeleteTask.id) {
          setSelectedTaskId(null)
          setCurrentTask(null)
        }
        toast.simple('任务已删除', { type: 'info' })
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
      toast.simple('删除失败', { type: 'error' })
    } finally {
      setConfirmOpen(false)
      setPendingDeleteTask(null)
    }
  }

  const handleClearAllTasks = async (): Promise<void> => {
    if (!currentSessionId) return

    try {
      const deletedCount = await AIService.clearAllTasks(currentSessionId)
      setTasks([])
      setSelectedTaskId(null)
      setCurrentTask(null)
      setCurrentMessages([])
      setSearchText('')
      toast.simple(`已清空 ${deletedCount} 个任务`, { type: 'info' })
    } catch (error) {
      console.error('Failed to clear all tasks:', error)
      toast.simple('清空失败', { type: 'error' })
    } finally {
      setClearAllConfirmOpen(false)
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
    <div className="flex flex-col h-full min-w-[248px] bg-[var(--color-bg-primary)]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-primary)]">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">历史任务</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-[var(--color-text-tertiary)]">{tasks.length} 个任务</span>
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-[var(--color-text-secondary)] hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="刷新任务列表"
          >
            <Icon name="refresh-cw" size="sm" />
          </button>
          {/* 清空全部按钮 */}
          {tasks.length > 0 && (
            <button
              onClick={() => setClearAllConfirmOpen(true)}
              disabled={isLoading}
              className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-error)] dark:hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="清空全部任务"
            >
              <Icon name="trash-2" size="sm" />
            </button>
          )}
          {/* 创建新任务按钮 */}
          <button
            onClick={handleNewTask}
            className="px-2 py-1 bg-[var(--ash-accent)] hover:opacity-90 text-white rounded-[var(--radius-md)] border border-[var(--ash-accent)] transition-colors shadow-sm hover:shadow-md"
            title="创建新任务"
          >
            <Icon name="plus" size="sm" />
          </button>
        </div>
      </div>

      {/* 搜索筛选 */}
      {tasks.length > 0 && (
        <div className="px-4 py-2 border-b border-[var(--color-border-primary)]">
          <div className="relative">
            <Icon
              name="search"
              size="sm"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] dark:text-[var(--color-text-tertiary)]"
            />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索任务名称..."
              spellCheck={false}
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-gray-400 dark:placeholder-[var(--color-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)] focus:border-transparent"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-[var(--color-text-tertiary)] hover:text-gray-600 dark:text-[var(--color-text-tertiary)] dark:hover:text-gray-300 transition-colors"
                title="清除筛选"
              >
                <Icon name="x" size="xs" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 任务列表 */}
      <div className="flex-1 overflow-y-auto relative">
        {/* 加载遮罩 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-[var(--color-bg-primary)]/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-2">
              <Icon name="loader-2" size="md" className="animate-spin text-[var(--ash-accent)]" />
              <span className="text-sm text-[var(--color-text-secondary)]">加载任务中...</span>
            </div>
          </div>
        )}

        {!currentSessionId ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-tertiary)]">请先连接 SSH 会话</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-tertiary)]">暂无历史任务</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-[var(--color-text-tertiary)]">没有匹配的任务</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={twMerge(
                  'p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[var(--color-bg-tertiary)]',
                  selectedTaskId === task.id && 'bg-[var(--ash-accent)]-subtle',
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
                        spellCheck={false}
                        className="w-full px-2 py-1 text-sm border border-[var(--ash-accent)] rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h4
                        className="text-sm font-medium text-[var(--color-text-primary)] truncate max-w-[180px]"
                        title={task.name}
                      >
                        {task.name}
                      </h4>
                    )}
                    <div className="flex items-center mt-1 space-x-2 text-xs text-[var(--color-text-tertiary)]">
                      <span>{formatDate(task.createdAt)}</span>
                      <span>•</span>
                      <span>{getMessageCount(task)} 条消息</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    {/* 编辑按钮 */}
                    <button
                      onClick={() => handleStartEdit(task)}
                      className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--ash-accent)] transition-colors"
                      title="重命名"
                    >
                      <Icon name="pencil" size="sm" />
                    </button>
                    {/* 删除按钮 */}
                    <button
                      onClick={() => handleAskDelete(task)}
                      className="p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] dark:hover:text-red-400 transition-colors"
                      title="删除"
                    >
                      <Icon name="trash-2" size="sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 确认删除对话框 */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPendingDeleteTask(null)
        }}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        message={`确定要删除任务${pendingDeleteTask ? `「${pendingDeleteTask.name}」` : ''}吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
      />

      {/* 确认清空全部对话框 */}
      <ConfirmModal
        isOpen={clearAllConfirmOpen}
        onClose={() => setClearAllConfirmOpen(false)}
        onConfirm={handleClearAllTasks}
        title="确认清空"
        message={`确定要清空当前会话的全部 ${tasks.length} 个任务吗？所有任务和对话记录将被永久删除，此操作不可撤销。`}
        confirmText="清空全部"
        cancelText="取消"
      />
    </div>
  )
}
