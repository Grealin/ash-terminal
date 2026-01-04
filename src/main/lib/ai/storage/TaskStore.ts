import { taskRepository } from '@/lib/database/repositories/TaskRepository'
import { ChatCompletionMessage } from '@shared/models/OpenAICompatible'
import { Message, Task } from '@shared/models/Task'
import { randomUUID } from 'crypto'

/**
 * TaskStore: Agent 任务存储管理
 *
 * 功能说明：
 * 1. 用户第一次提问时，自动创建一个新任务实例
 * 2. 所有后续对话消息都存储在该任务下
 * 3. 支持任务切换，切换时自动加载历史消息
 * 4. 提供完整的任务和消息管理接口
 */
export class TaskStore {
  private currentTaskId: string | null = null
  private sessionId: string

  constructor(sessionId: string) {
    this.sessionId = sessionId
  }

  /**
   * 获取当前任务 ID
   */
  getCurrentTaskId(): string | null {
    return this.currentTaskId
  }

  /**
   * 获取当前任务（包含完整消息历史）
   */
  getCurrentTask(): Task | null {
    if (!this.currentTaskId) {
      return null
    }
    return taskRepository.getTaskById(this.currentTaskId)
  }

  /**
   * 创建新任务（用户第一次提问时调用）
   * @param firstQuestion 用户的第一个问题，用于生成任务名称
   * @returns 新创建的任务
   */
  createNewTask(firstQuestion: string): Task {
    // 生成任务名称（取问题前30个字符）
    const taskName =
      firstQuestion.length > 30 ? firstQuestion.substring(0, 30) + '...' : firstQuestion

    const task: Omit<Task, 'messages'> = {
      id: randomUUID(),
      sessionId: this.sessionId,
      name: taskName,
      createdAt: Date.now()
    }

    const createdTask = taskRepository.createTask(task)
    this.currentTaskId = createdTask.id

    return createdTask
  }

  /**
   * 准备创建新任务（仅清空当前任务状态，不创建数据库记录）
   * 用于前端“新建任务”操作，实际任务在首次发送消息时自动创建
   */
  prepareNewTask(): void {
    this.currentTaskId = null
  }

  /**
   * 切换到指定任务（返回完整的消息历史）
   * @param taskId 目标任务 ID
   * @returns 任务及其完整消息列表
   */
  switchToTask(taskId: string): Task {
    const task = taskRepository.getTaskById(taskId)

    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    if (task.sessionId !== this.sessionId) {
      throw new Error(`任务 ${taskId} 不属于当前会话 ${this.sessionId}`)
    }

    this.currentTaskId = taskId
    return task
  }

  /**
   * 获取当前会话的所有任务列表（不含消息）
   */
  getTaskList(): Task[] {
    return taskRepository.getTasksBySessionId(this.sessionId)
  }

  /**
   * 添加消息到当前任务
   * @param message OpenAI 格式的消息
   */
  addMessage(message: ChatCompletionMessage): Message {
    if (!this.currentTaskId) {
      throw new Error('当前没有激活的任务，请先创建任务')
    }

    // 获取当前任务的消息数量，作为新消息的索引
    const existingMessages = taskRepository.getMessagesByTaskId(this.currentTaskId)
    const nextIndex = existingMessages.length

    const dbMessage: Message = {
      id: randomUUID(),
      taskId: this.currentTaskId,
      createdAt: Date.now(),
      index: nextIndex,
      role: message.role,
      content: message.content,
      name: message.name,
      tool_calls: message.tool_calls,
      tool_call_id: message.tool_call_id
    }

    return taskRepository.createMessage(dbMessage)
  }

  /**
   * 批量添加消息（用于恢复历史记录）
   * @param messages OpenAI 格式的消息列表
   */
  addMessages(messages: ChatCompletionMessage[]): void {
    if (!this.currentTaskId) {
      throw new Error('当前没有激活的任务，请先创建任务')
    }

    const existingMessages = taskRepository.getMessagesByTaskId(this.currentTaskId)
    let nextIndex = existingMessages.length

    const dbMessages: Message[] = messages.map((msg) => ({
      id: randomUUID(),
      taskId: this.currentTaskId!,
      createdAt: Date.now(),
      index: nextIndex++,
      role: msg.role,
      content: msg.content,
      name: msg.name,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id
    }))

    taskRepository.createMessages(dbMessages)
  }

  /**
   * 获取当前任务的所有消息
   * @returns OpenAI 格式的消息列表
   */
  getMessages(): ChatCompletionMessage[] {
    if (!this.currentTaskId) {
      return []
    }

    const messages = taskRepository.getMessagesByTaskId(this.currentTaskId)

    // 转换为 OpenAI 格式
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      name: msg.name,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id
    }))
  }

  /**
   * 更新任务名称
   */
  updateTaskName(taskId: string, newName: string): boolean {
    return taskRepository.updateTaskName(taskId, newName)
  }

  /**
   * 删除任务（级联删除所有消息）
   */
  deleteTask(taskId: string): boolean {
    const deleted = taskRepository.deleteTask(taskId)

    // 如果删除的是当前任务，清除当前任务 ID
    if (deleted && taskId === this.currentTaskId) {
      this.currentTaskId = null
    }

    return deleted
  }

  /**
   * 清空当前任务（重新开始对话，但不删除任务）
   * 删除任务的所有消息
   */
  clearCurrentTask(): void {
    if (!this.currentTaskId) {
      return
    }

    taskRepository.deleteMessagesByTaskId(this.currentTaskId)
  }

  /**
   * 更新系统提示词（修复问题1：确保系统提示词与当前模式匹配）
   * @param newSystemPrompt 新的系统提示词内容
   */
  updateSystemPrompt(newSystemPrompt: string): void {
    if (!this.currentTaskId) {
      return
    }

    const messages = taskRepository.getMessagesByTaskId(this.currentTaskId)
    if (messages.length > 0 && messages[0].role === 'system') {
      // 更新第一条系统消息
      taskRepository.updateMessage(messages[0].id, { content: newSystemPrompt })
    }
  }

  /**
   * 检查是否有激活的任务
   */
  hasActiveTask(): boolean {
    return this.currentTaskId !== null
  }

  /**
   * 创建任务快照（用于导出等场景）
   */
  exportTask(taskId: string): Task | null {
    return taskRepository.getTaskById(taskId)
  }

  /**
   * 删除当前会话的所有任务
   */
  clearAllTasks(): number {
    const deletedCount = taskRepository.deleteTasksBySessionId(this.sessionId)
    this.currentTaskId = null
    return deletedCount
  }
}

/**
 * TaskStore 管理器，维护每个 session 的 TaskStore 实例
 */
class TaskStoreManager {
  private stores: Map<string, TaskStore> = new Map()

  /**
   * 获取或创建 TaskStore 实例
   */
  getStore(sessionId: string): TaskStore {
    let store = this.stores.get(sessionId)

    if (!store) {
      store = new TaskStore(sessionId)
      this.stores.set(sessionId, store)
    }

    return store
  }

  /**
   * 移除 TaskStore 实例
   */
  removeStore(sessionId: string): void {
    this.stores.delete(sessionId)
  }

  /**
   * 清空所有 TaskStore
   */
  clear(): void {
    this.stores.clear()
  }
}

// 导出单例
export const taskStoreManager = new TaskStoreManager()
