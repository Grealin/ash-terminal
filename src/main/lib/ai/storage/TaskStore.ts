import {
  AiMessage,
  AiTask,
  CreateTaskParams,
  TaskQueryParams,
  TaskStatistics,
  UpdateTaskParams
} from '@shared/models'
import { randomUUID } from 'crypto'
import {
  clearSessionTasks,
  deleteMessageDB,
  deleteTaskDB,
  getStatistics,
  getTaskDB,
  getTaskMessages,
  insertMessage,
  insertTask,
  queryTasks,
  updateTaskDB
} from '../database/repositories/TaskRepository'

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

  insertTask(task)
  return task
}

/**
 * 获取任务列表
 */
export const getTasks = (params: TaskQueryParams = {}): { tasks: AiTask[]; total: number } => {
  return queryTasks(params)
}

/**
 * 获取单个任务
 */
export const getTask = (taskId: string): AiTask | null => {
  const task = getTaskDB(taskId)
  if (!task) return null

  // 加载消息
  task.messages = getTaskMessages(taskId)
  return task
}

/**
 * 更新任务
 */
export const updateTask = (taskId: string, params: UpdateTaskParams): void => {
  updateTaskDB(taskId, params)
}

/**
 * 添加消息到任务
 */
export const addMessage = (_taskId: string, message: AiMessage): void => {
  insertMessage(message)
}

/**
 * 删除消息
 */
export const deleteMessage = (_taskId: string, messageId: string): void => {
  deleteMessageDB(messageId)
}

/**
 * 删除任务
 */
export const deleteTask = (taskId: string): void => {
  deleteTaskDB(taskId)
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
  clearSessionTasks(sessionId)
}

/**
 * 获取任务统计
 */
export const getTaskStatistics = (params: {
  sessionId?: string
  startDate?: number
  endDate?: number
}): TaskStatistics => {
  return getStatistics(params)
}
