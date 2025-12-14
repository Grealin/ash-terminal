import { TaskManager } from '@/lib/ai/task/TaskManager'
import type {
  AiMessage,
  AiTask,
  CreateTaskParams,
  TaskQueryParams,
  TaskStatistics
} from '@shared/models'
import { ipcMain } from 'electron'

// 全局 TaskManager 实例
let taskManager: TaskManager | null = null

/**
 * 初始化 TaskManager
 */
export function initTaskManager(): void {
  taskManager = new TaskManager()

  // 转发任务事件到渲染进程
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('task:created', (_task: AiTask) => {
    // TODO: 向所有窗口广播
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('task:stream', (_data: { taskId: string; messageId: string; content: string }) => {
    // TODO: 向所有窗口广播流式内容
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('task:tool_call', (_data: { taskId: string; toolCall: any }) => {
    // TODO: 向所有窗口广播工具调用
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('tool:approval_required', (_data: { taskId: string; toolCall: any }) => {
    // TODO: 向所有窗口请求用户批准
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('task:completed', (_data: { taskId: string }) => {
    // TODO: 向所有窗口通知任务完成
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  taskManager.on('task:error', (_data: { taskId: string; error: any }) => {
    // TODO: 向所有窗口通知错误
  })
}

/**
 * 获取 TaskManager 实例
 */
function getTaskManager(): TaskManager {
  if (!taskManager) {
    throw new Error('TaskManager not initialized')
  }
  return taskManager
}

/**
 * 注册所有 AI 相关的 IPC handlers
 */
export function registerAiHandlers(): void {
  // ==================== 任务管理 ====================

  /**
   * 创建新任务
   */
  ipcMain.handle('ai:task:create', async (_event, params: CreateTaskParams): Promise<AiTask> => {
    const manager = getTaskManager()
    return await manager.createTask(params)
  })

  /**
   * 获取任务列表
   */
  ipcMain.handle('ai:task:list', async (_event, params: TaskQueryParams): Promise<AiTask[]> => {
    const manager = getTaskManager()
    return await manager.getTasks(params)
  })

  /**
   * 获取单个任务
   */
  ipcMain.handle('ai:task:get', async (_event, taskId: string): Promise<AiTask | null> => {
    const manager = getTaskManager()
    return await manager.getTask(taskId)
  })

  /**
   * 更新任务
   */
  ipcMain.handle(
    'ai:task:update',
    async (_event, taskId: string, updates: Partial<AiTask>): Promise<void> => {
      const manager = getTaskManager()
      await manager.updateTask(taskId, updates)
    }
  )

  /**
   * 删除任务
   */
  ipcMain.handle('ai:task:delete', async (_event, taskId: string): Promise<void> => {
    const manager = getTaskManager()
    await manager.deleteTask(taskId)
  })

  /**
   * 归档任务
   */
  ipcMain.handle('ai:task:archive', async (_event, taskId: string): Promise<void> => {
    const manager = getTaskManager()
    await manager.archiveTask(taskId)
  })

  /**
   * 执行 Agent 任务
   */
  ipcMain.handle(
    'ai:task:run-agent',
    async (_event, taskId: string, userMessage?: string): Promise<void> => {
      const manager = getTaskManager()
      await manager.runAgentTask(taskId, userMessage)
    }
  )

  /**
   * 执行 Ask 任务
   */
  ipcMain.handle(
    'ai:task:run-ask',
    async (_event, taskId: string, userMessage?: string): Promise<void> => {
      const manager = getTaskManager()
      await manager.runAskTask(taskId, userMessage)
    }
  )

  /**
   * 获取任务统计
   */
  ipcMain.handle('ai:task:statistics', async (): Promise<TaskStatistics> => {
    const manager = getTaskManager()
    return await manager.getStatistics()
  })

  // ==================== 消息管理 ====================

  /**
   * 添加消息
   */
  ipcMain.handle(
    'ai:message:add',
    async (_event, taskId: string, message: AiMessage): Promise<void> => {
      const manager = getTaskManager()
      await manager.addMessage(taskId, message)
    }
  )

  /**
   * 更新消息
   */
  ipcMain.handle(
    'ai:message:update',
    async (_event, taskId: string, messageId: string, message: AiMessage): Promise<void> => {
      const manager = getTaskManager()
      await manager.updateMessage(taskId, messageId, message)
    }
  )

  /**
   * 删除消息
   */
  ipcMain.handle(
    'ai:message:delete',
    async (_event, taskId: string, messageId: string): Promise<void> => {
      const manager = getTaskManager()
      await manager.deleteMessage(taskId, messageId)
    }
  )

  // ==================== 工具调用 ====================

  /**
   * 批准工具调用
   */
  ipcMain.handle(
    'ai:tool:approve',
    async (_event, taskId: string, toolCallId: string): Promise<void> => {
      const manager = getTaskManager()
      await manager.approveToolCall(taskId, toolCallId)
    }
  )

  /**
   * 拒绝工具调用
   */
  ipcMain.handle(
    'ai:tool:reject',
    async (_event, taskId: string, toolCallId: string, reason?: string): Promise<void> => {
      const manager = getTaskManager()
      await manager.rejectToolCall(taskId, toolCallId, reason)
    }
  )
}
