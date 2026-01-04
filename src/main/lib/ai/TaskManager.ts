import { AiMode } from '@shared/models'
import { Task } from '@shared/models/Task'
import { agentPool } from './AgentManager'
import { AgentEvent } from './core/Agent'
import { taskStoreManager } from './storage/TaskStore'

/**
 * TaskManager: 任务管理器（面向前端的顶层接口）
 *
 * 设计理念：
 * - 前端只需要操作任务，不需要直接管理 AI 会话（Agent）
 * - Agent 作为内部实现，在需要时自动创建和管理
 * - 一个任务 = 一组对话消息 + 对应的 Agent 执行上下文
 * - 任务创建是隐式的：用户首次发送消息时自动创建任务
 */
export class TaskManager {
  /**
   * 准备创建新任务（仅清空状态，不创建数据库记录）
   * 用于前端"新建任务"按钮，实际任务在用户首次发送消息时自动创建
   * @param sessionId SSH 会话 ID
   */
  async prepareNewTask(sessionId: string): Promise<void> {
    // 确保 Agent 存在
    await this.ensureAgent(sessionId)

    const agent = agentPool.getAgent(sessionId)
    if (agent) {
      // 清空 Agent 的对话历史
      agent.reset()
    }

    // 清空 TaskStore 的当前任务 ID
    const taskStore = taskStoreManager.getStore(sessionId)
    taskStore.prepareNewTask()
  }

  /**
   * 切换到指定任务（自动加载历史消息）
   */
  switchTask(sessionId: string, taskId: string): Task {
    const agent = agentPool.getAgent(sessionId)
    if (!agent) {
      throw new Error('Agent not found. Please create a task first.')
    }

    agent.switchTask(taskId)
    const task = agent.getCurrentTask()

    if (!task) {
      throw new Error('Failed to switch task')
    }

    return task
  }

  /**
   * 向当前任务提问
   * 如果当前没有激活任务，会自动使用问题创建新任务（隐式创建）
   * @param mode AI 模式：AGENT（可使用工具）或 ASK（仅回答问题）
   */
  async askTask(sessionId: string, question: string, mode: AiMode = AiMode.AGENT): Promise<void> {
    const agent = agentPool.getAgent(sessionId)
    if (!agent) {
      throw new Error('Agent not found. Please create a task first.')
    }

    // Agent.ask() 内部会检查，如果没有激活任务会自动创建
    await agent.ask(question, mode)
  }

  /**
   * 获取任务列表
   */
  getTaskList(sessionId: string): Task[] {
    const taskStore = taskStoreManager.getStore(sessionId)
    return taskStore.getTaskList()
  }

  /**
   * 获取当前激活的任务
   */
  getCurrentTask(sessionId: string): Task | null {
    const agent = agentPool.getAgent(sessionId)
    if (!agent) {
      // Agent 不存在，从 TaskStore 获取
      const taskStore = taskStoreManager.getStore(sessionId)
      return taskStore.getCurrentTask()
    }

    return agent.getCurrentTask()
  }

  /**
   * 删除任务
   */
  deleteTask(sessionId: string, taskId: string): boolean {
    const taskStore = taskStoreManager.getStore(sessionId)
    return taskStore.deleteTask(taskId)
  }

  /**
   * 更新任务名称
   */
  updateTaskName(sessionId: string, taskId: string, newName: string): boolean {
    const taskStore = taskStoreManager.getStore(sessionId)
    return taskStore.updateTaskName(taskId, newName)
  }

  /**
   * 清空当前任务的对话历史
   */
  clearCurrentTask(sessionId: string): void {
    const agent = agentPool.getAgent(sessionId)
    if (agent) {
      agent.reset()
    }
  }

  /**
   * 停止当前任务的执行
   */
  stopTask(sessionId: string): void {
    const agent = agentPool.getAgent(sessionId)
    if (agent) {
      agent.stop()
    }
  }

  /**
   * 关闭会话（清理 Agent 和所有资源）
   */
  closeSession(sessionId: string): void {
    agentPool.removeAgent(sessionId)
    taskStoreManager.removeStore(sessionId)
  }

  /**
   * 监听任务相关事件
   * 如果 Agent 不存在，返回空清理函数
   */
  onTaskEvent(sessionId: string, event: AgentEvent, callback: (data: any) => void): () => void {
    const agent = agentPool.getAgent(sessionId)
    if (!agent) {
      // Agent 还未创建，返回空清理函数
      return () => {
        // 空清理函数
      }
    }

    agent.on(event, callback)
    return () => agent.off(event, callback)
  }

  /**
   * 监听任务切换事件
   * 如果 Agent 不存在，返回空清理函数
   */
  onTaskSwitched(sessionId: string, callback: (data: any) => void): () => void {
    const agent = agentPool.getAgent(sessionId)
    if (!agent) {
      // Agent 还未创建，返回空清理函数
      // 当 Agent 创建后（首次 ask 时），会自动触发事件
      return () => {
        // 空清理函数
      }
    }

    agent.on('task-switched', callback)
    return () => agent.off('task-switched', callback as any)
  }

  /**
   * 确保 Agent 存在（内部方法）
   * 注意：Agent 的 mode 字段仅作为默认值，实际模式由每次 ask 调用时指定
   */
  private async ensureAgent(sessionId: string): Promise<void> {
    const agent = agentPool.getAgent(sessionId)

    if (!agent) {
      // Agent 不存在，创建新的（使用 AGENT 作为默认模式）
      await agentPool.createAgent({
        sessionId,
        mode: AiMode.AGENT
      })
    }
  }
}

// 导出单例
export const taskManager = new TaskManager()
