import { AgentEvent, agentPool, taskManager } from '@/lib'
import { AiMode } from '@shared/models'
import { ipcMain } from 'electron'

/**
 * 注册 AI 任务相关的 IPC handlers
 *
 * 设计原则：
 * - 前端只操作任务（Task），不直接管理 Agent
 * - Agent 作为内部实现，在任务操作中自动管理
 */
export function registerAiHandlers(): void {
  // ==================== 任务管理（核心接口）====================

  /**
   * 准备创建新任务（仅清空状态，不创建数据库记录）
   * 用于前端"新建任务"按钮，实际任务在用户首次发送消息时自动创建
   */
  ipcMain.handle('prepareNewTask', async (_, sessionId: string) => {
    try {
      await taskManager.prepareNewTask(sessionId)
      return { success: true }
    } catch (error) {
      console.error('Failed to prepare new task:', error)
      throw error
    }
  })

  /**
   * 切换到指定任务
   * - 自动加载历史消息到 Agent
   * - 返回任务详情（包含消息列表）
   */
  ipcMain.handle('switchTask', (_, sessionId: string, taskId: string) => {
    try {
      const task = taskManager.switchTask(sessionId, taskId)
      return { success: true, task }
    } catch (error) {
      console.error('Failed to switch task:', error)
      throw error
    }
  })

  /**
   * 向当前任务提问
   * - 自动保存消息到任务
   * - 触发 Agent 执行
   * @param mode AI 模式（AGENT 可使用工具，ASK 仅回答问题）
   */
  ipcMain.handle('askTask', async (_, sessionId: string, question: string, mode?: AiMode) => {
    try {
      await taskManager.askTask(sessionId, question, mode)
      return { success: true }
    } catch (error) {
      console.error('Failed to ask task:', error)
      throw error
    }
  })

  /**
   * 获取任务列表
   * - 返回当前会话的所有任务（不含消息）
   */
  ipcMain.handle('getTaskList', (_, sessionId: string) => {
    try {
      const tasks = taskManager.getTaskList(sessionId)
      return { success: true, tasks }
    } catch (error) {
      console.error('Failed to get task list:', error)
      throw error
    }
  })

  /**
   * 获取当前激活的任务
   * - 返回当前任务详情（包含消息）
   */
  ipcMain.handle('getCurrentTask', (_, sessionId: string) => {
    try {
      const task = taskManager.getCurrentTask(sessionId)
      return { success: true, task }
    } catch (error) {
      console.error('Failed to get current task:', error)
      throw error
    }
  })

  /**
   * 删除任务
   * - 删除任务及其所有消息
   */
  ipcMain.handle('deleteTask', (_, sessionId: string, taskId: string) => {
    try {
      const deleted = taskManager.deleteTask(sessionId, taskId)
      return { success: true, deleted }
    } catch (error) {
      console.error('Failed to delete task:', error)
      throw error
    }
  })

  /**
   * 更新任务名称
   */
  ipcMain.handle('updateTaskName', (_, sessionId: string, taskId: string, newName: string) => {
    try {
      const updated = taskManager.updateTaskName(sessionId, taskId, newName)
      return { success: true, updated }
    } catch (error) {
      console.error('Failed to update task name:', error)
      throw error
    }
  })

  /**
   * 清空当前任务的对话历史
   * - 保留任务，清空所有消息
   */
  ipcMain.handle('clearCurrentTask', (_, sessionId: string) => {
    try {
      taskManager.clearCurrentTask(sessionId)
      return { success: true }
    } catch (error) {
      console.error('Failed to clear current task:', error)
      throw error
    }
  })

  /**
   * 停止当前任务的执行
   * - 中断正在执行的 Agent 操作
   */
  ipcMain.handle('stopTask', (_, sessionId: string) => {
    try {
      taskManager.stopTask(sessionId)
      return { success: true }
    } catch (error) {
      console.error('Failed to stop task:', error)
      throw error
    }
  })

  /**
   * 关闭会话
   * - 清理 Agent 和所有任务资源
   * - 通常在 SSH 会话关闭时调用
   */
  ipcMain.handle('closeTaskSession', (_, sessionId: string) => {
    try {
      taskManager.closeSession(sessionId)
      return { success: true }
    } catch (error) {
      console.error('Failed to close task session:', error)
      throw error
    }
  })

  /**
   * 清空当前会话的所有任务
   * - 删除所有任务及其消息
   */
  ipcMain.handle('clearAllTasks', (_, sessionId: string) => {
    try {
      const deletedCount = taskManager.clearAllTasks(sessionId)
      return { success: true, deletedCount }
    } catch (error) {
      console.error('Failed to clear all tasks:', error)
      throw error
    }
  })

  // ==================== 任务事件监听 ====================

  /**
   * 监听任务流式输出
   */
  ipcMain.handle('onTaskStream', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.STREAM, (data: any) => {
        event.sender.send('task-stream', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task stream:', error)
      throw error
    }
  })

  /**
   * 监听任务思考过程
   */
  ipcMain.handle('onTaskThought', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.THOUGHT, (data: any) => {
        event.sender.send('task-thought', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task thought:', error)
      throw error
    }
  })

  /**
   * 监听任务工具调用
   */
  ipcMain.handle('onTaskToolCall', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.TOOL_CALL, (data: any) => {
        event.sender.send('task-tool-call', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task tool call:', error)
      throw error
    }
  })

  /**
   * 监听任务工具执行结果
   */
  ipcMain.handle('onTaskToolResult', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.TOOL_RESULT, (data: any) => {
        event.sender.send('task-tool-result', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task tool result:', error)
      throw error
    }
  })

  /**
   * 监听任务最终回答
   */
  ipcMain.handle('onTaskAnswer', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.ANSWER, (data: any) => {
        event.sender.send('task-answer', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task answer:', error)
      throw error
    }
  })

  /**
   * 监听任务错误
   */
  ipcMain.handle('onTaskError', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.ERROR, (data: any) => {
        event.sender.send('task-error', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task error:', error)
      throw error
    }
  })

  /**
   * 监听任务完成
   */
  ipcMain.handle('onTaskDone', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskEvent(sessionId, AgentEvent.DONE, (data: any) => {
        event.sender.send('task-done', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task done:', error)
      throw error
    }
  })

  /**
   * 监听任务切换事件
   */
  ipcMain.handle('onTaskSwitched', (event, sessionId: string) => {
    try {
      const cleanup = taskManager.onTaskSwitched(sessionId, (data: any) => {
        event.sender.send('task-switched', sessionId, data)
      })

      event.sender.on('destroyed', cleanup)
      return { success: true }
    } catch (error) {
      console.error('Failed to listen task switched:', error)
      throw error
    }
  })

  // ==================== 辅助接口 ====================

  /**
   * 获取操作系统信息
   * - 工具函数，用于 UI 显示等场景
   */
  ipcMain.handle('getOperatingSystem', async (_, sessionId: string) => {
    try {
      return await agentPool.getOperatingSystem(sessionId)
    } catch (error) {
      console.error('Failed to get operating system:', error)
      throw error
    }
  })
}
