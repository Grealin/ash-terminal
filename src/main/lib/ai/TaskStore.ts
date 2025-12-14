import {
  AiMessage,
  AiTask,
  CreateTaskParams,
  TaskQueryParams,
  TaskStatistics,
  UpdateTaskParams
} from '@shared/models'
import { randomUUID } from 'crypto'
import { app } from 'electron'

let Store: any = null
let taskStore: any = null

/**
 * 初始化任务存储
 */
export const initTaskStore = async (): Promise<void> => {
  if (!taskStore) {
    if (!Store) {
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    taskStore = new Store({
      name: 'ai-tasks',
      cwd: app.getPath('userData'),
      defaults: {
        tasks: []
      }
    })
  }
}

/**
 * 获取所有任务
 */
const getAllTasks = (): AiTask[] => {
  if (!taskStore) {
    throw new Error('Task store not initialized')
  }
  return taskStore.get('tasks', [])
}

/**
 * 保存所有任务
 */
const saveAllTasks = (tasks: AiTask[]): void => {
  if (!taskStore) {
    throw new Error('Task store not initialized')
  }
  taskStore.set('tasks', tasks)
}

/**
 * 创建任务
 */
export const createTask = (params: CreateTaskParams): AiTask => {
  const now = Date.now()
  const task: AiTask = {
    id: randomUUID(),
    title: params.title || '未命名任务',
    mode: params.mode,
    sessionId: params.sessionId,
    messages: [],
    createdAt: now,
    updatedAt: now,
    archived: false,
    isDraft: true
  }

  const tasks = getAllTasks()
  tasks.push(task)
  saveAllTasks(tasks)

  return task
}

/**
 * 获取任务列表
 */
export const getTasks = (params: TaskQueryParams = {}): { tasks: AiTask[]; total: number } => {
  let tasks = getAllTasks()

  // 筛选会话
  if (params.sessionId) {
    tasks = tasks.filter((t) => t.sessionId === params.sessionId)
  }

  // 筛选模式
  if (params.mode) {
    tasks = tasks.filter((t) => t.mode === params.mode)
  }

  // 筛选草稿
  if (!params.includeDrafts) {
    tasks = tasks.filter((t) => !t.isDraft)
  }

  // 筛选归档
  if (!params.includeArchived) {
    tasks = tasks.filter((t) => !t.archived)
  }

  // 搜索
  if (params.searchQuery) {
    const query = params.searchQuery.toLowerCase()
    tasks = tasks.filter((t) => {
      const titleMatch = t.title.toLowerCase().includes(query)
      const messageMatch = t.messages.some((m) => m.content.toLowerCase().includes(query))
      return titleMatch || messageMatch
    })
  }

  // 按更新时间降序排序
  tasks.sort((a, b) => b.updatedAt - a.updatedAt)

  const total = tasks.length

  // 分页
  if (params.limit !== undefined) {
    const offset = params.offset || 0
    tasks = tasks.slice(offset, offset + params.limit)
  }

  return { tasks, total }
}

/**
 * 获取单个任务
 */
export const getTask = (taskId: string): AiTask | null => {
  const tasks = getAllTasks()
  return tasks.find((t) => t.id === taskId) || null
}

/**
 * 更新任务
 */
export const updateTask = (taskId: string, params: UpdateTaskParams): void => {
  const tasks = getAllTasks()
  const index = tasks.findIndex((t) => t.id === taskId)

  if (index === -1) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const task = tasks[index]
  tasks[index] = {
    ...task,
    ...params,
    updatedAt: Date.now()
  }

  saveAllTasks(tasks)
}

/**
 * 添加消息到任务
 */
export const addMessage = (taskId: string, message: AiMessage): void => {
  const tasks = getAllTasks()
  const index = tasks.findIndex((t) => t.id === taskId)

  if (index === -1) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const task = tasks[index]
  task.messages.push(message)
  task.updatedAt = Date.now()

  // 如果是第一条消息，标记为非草稿
  if (task.isDraft && task.messages.length > 0) {
    task.isDraft = false
  }

  saveAllTasks(tasks)
}

/**
 * 删除消息
 */
export const deleteMessage = (taskId: string, messageId: string): void => {
  const tasks = getAllTasks()
  const index = tasks.findIndex((t) => t.id === taskId)

  if (index === -1) {
    throw new Error(`Task not found: ${taskId}`)
  }

  const task = tasks[index]
  task.messages = task.messages.filter((m) => m.id !== messageId)
  task.updatedAt = Date.now()

  saveAllTasks(tasks)
}

/**
 * 删除任务
 */
export const deleteTask = (taskId: string): void => {
  const tasks = getAllTasks()
  const filtered = tasks.filter((t) => t.id !== taskId)

  if (filtered.length === tasks.length) {
    throw new Error(`Task not found: ${taskId}`)
  }

  saveAllTasks(filtered)
}

/**
 * 归档/取消归档任务
 */
export const archiveTask = (taskId: string, archived: boolean): void => {
  updateTask(taskId, { archived })
}

/**
 * 清空会话的所有任务
 */
export const clearTaskHistory = (sessionId: string): void => {
  const tasks = getAllTasks()
  const filtered = tasks.filter((t) => t.sessionId !== sessionId)
  saveAllTasks(filtered)
}

/**
 * 获取任务统计
 */
export const getTaskStatistics = (params: {
  sessionId?: string
  startDate?: number
  endDate?: number
}): TaskStatistics => {
  let tasks = getAllTasks()

  // 筛选会话
  if (params.sessionId) {
    tasks = tasks.filter((t) => t.sessionId === params.sessionId)
  }

  // 筛选时间范围
  if (params.startDate) {
    tasks = tasks.filter((t) => t.createdAt >= params.startDate!)
  }
  if (params.endDate) {
    tasks = tasks.filter((t) => t.createdAt <= params.endDate!)
  }

  const totalTasks = tasks.length
  const draftTasks = tasks.filter((t) => t.isDraft).length
  const archivedTasks = tasks.filter((t) => t.archived).length

  const allMessages = tasks.flatMap((t) => t.messages)
  const totalMessages = allMessages.length

  const allToolCalls = allMessages.flatMap((m) => m.toolCalls || [])
  const totalToolCalls = allToolCalls.length
  const successfulToolCalls = allToolCalls.filter((tc) => tc.status === 'success').length
  const failedToolCalls = allToolCalls.filter((tc) => tc.status === 'failed').length

  return {
    totalTasks,
    draftTasks,
    archivedTasks,
    totalMessages,
    totalToolCalls,
    successfulToolCalls,
    failedToolCalls
  }
}
