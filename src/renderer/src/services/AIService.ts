import { AiMode } from '@shared/models'
import { Task } from '@shared/models/Task'

/**
 * AI Task Service - 处理任务相关操作
 *
 * 设计理念：
 * - 前端只操作任务，不直接管理 Agent
 * - Agent 在任务创建时自动初始化
 * - 任务创建是隐式的：用户首次发送消息时自动创建
 */
export class AIService {
  // ==================== 任务管理（核心接口）====================

  /**
   * 准备创建新任务（仅清空状态，不创建数据库记录）
   * 用于前端"新建任务"按钮，实际任务在用户首次发送消息时自动创建
   */
  static async prepareNewTask(sessionId: string): Promise<void> {
    const result = await window.ai.prepareNewTask(sessionId)
    if (!result.success) {
      throw new Error('Failed to prepare new task')
    }
  }

  /**
   * 切换到指定任务
   * - 自动加载历史消息
   * - 返回任务详情（包含消息列表）
   */
  static async switchTask(sessionId: string, taskId: string): Promise<Task> {
    const result = await window.ai.switchTask(sessionId, taskId)
    if (!result.success) {
      throw new Error('Failed to switch task')
    }
    return result.task
  }

  /**
   * 向当前任务提问
   * - 如果当前没有激活任务，会自动使用问题创建新任务（隐式创建）
   * - 任务名称自动从问题中提取（前30个字符）
   * - 自动保存消息到任务
   * - 触发 Agent 执行
   * @param mode AI 模式（AGENT 可使用工具，ASK 仅回答问题）
   */
  static async askTask(sessionId: string, question: string, mode?: AiMode): Promise<void> {
    await window.ai.askTask(sessionId, question, mode)
  }

  /**
   * 获取任务列表
   * - 返回当前会话的所有任务（不含消息）
   */
  static async getTaskList(sessionId: string): Promise<Task[]> {
    const result = await window.ai.getTaskList(sessionId)
    return result.tasks
  }

  /**
   * 获取当前激活的任务
   * - 返回当前任务详情（包含消息）
   */
  static async getCurrentTask(sessionId: string): Promise<Task | null> {
    const result = await window.ai.getCurrentTask(sessionId)
    return result.task
  }

  /**
   * 删除任务
   * - 删除任务及其所有消息
   */
  static async deleteTask(sessionId: string, taskId: string): Promise<boolean> {
    const result = await window.ai.deleteTask(sessionId, taskId)
    return result.deleted
  }

  /**
   * 更新任务名称
   */
  static async updateTaskName(
    sessionId: string,
    taskId: string,
    newName: string
  ): Promise<boolean> {
    const result = await window.ai.updateTaskName(sessionId, taskId, newName)
    return result.updated
  }

  /**
   * 清空当前任务的对话历史
   * - 保留任务，清空所有消息
   */
  static async clearCurrentTask(sessionId: string): Promise<void> {
    await window.ai.clearCurrentTask(sessionId)
  }

  /**
   * 停止当前任务的执行
   * - 中断正在执行的 Agent 操作
   */
  static async stopTask(sessionId: string): Promise<void> {
    await window.ai.stopTask(sessionId)
  }

  /**
   * 关闭会话
   * - 清理 Agent 和所有任务资源
   * - 通常在 SSH 会话关闭时调用
   */
  static async closeTaskSession(sessionId: string): Promise<void> {
    await window.ai.closeTaskSession(sessionId)
  }

  // ==================== 任务事件监听 ====================

  /**
   * 监听任务流式输出
   */
  static onTaskStream(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskStream(sessionId, callback)
  }

  /**
   * 监听任务思考过程
   */
  static onTaskThought(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskThought(sessionId, callback)
  }

  /**
   * 监听任务工具调用
   */
  static onTaskToolCall(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskToolCall(sessionId, callback)
  }

  /**
   * 监听任务工具执行结果
   */
  static onTaskToolResult(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskToolResult(sessionId, callback)
  }

  /**
   * 监听任务最终回答
   */
  static onTaskAnswer(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskAnswer(sessionId, callback)
  }

  /**
   * 监听任务错误
   */
  static onTaskError(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskError(sessionId, callback)
  }

  /**
   * 监听任务完成
   */
  static onTaskDone(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskDone(sessionId, callback)
  }

  /**
   * 监听任务切换事件
   */
  static onTaskSwitched(sessionId: string, callback: (data: any) => void): () => void {
    return window.ai.onTaskSwitched(sessionId, callback)
  }

  // ==================== 辅助接口 ====================

  /**
   * 获取操作系统信息
   * - 工具函数，用于 UI 显示等场景
   */
  static async getOperatingSystem(sessionId: string): Promise<string> {
    return await window.ai.getOperatingSystem(sessionId)
  }
}
