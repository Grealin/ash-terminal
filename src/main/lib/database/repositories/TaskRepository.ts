import { OpenAIToolCall } from '@shared/models/OpenAICompatible'
import { Message, MessageDB, Task } from '@shared/models/Task'
import { getDB } from '../core/Database'

/**
 * Task 数据库仓库
 * 负责 Task 和 Message 的 CRUD 操作
 */
export class TaskRepository {
  // ==================== Task 相关操作 ====================

  /**
   * 创建新任务
   */
  createTask(task: Omit<Task, 'messages'>): Task {
    const db = getDB()
    const stmt = db.prepare(`
      INSERT INTO tasks (id, sessionId, name, createdAt)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(task.id, task.sessionId, task.name, task.createdAt)

    return { ...task }
  }

  /**
   * 根据 ID 获取任务（包含所有消息）
   */
  getTaskById(taskId: string): Task | null {
    const db = getDB()
    const stmt = db.prepare(`
      SELECT id, sessionId, name, createdAt
      FROM tasks
      WHERE id = ?
    `)

    const task = stmt.get(taskId) as Task | undefined
    if (!task) return null

    // 加载任务的所有消息
    task.messages = this.getMessagesByTaskId(taskId)

    return task
  }

  /**
   * 根据 Session ID 获取所有任务（不含消息）
   */
  getTasksBySessionId(sessionId: string): Task[] {
    const db = getDB()
    const stmt = db.prepare(`
      SELECT id, sessionId, name, createdAt
      FROM tasks
      WHERE sessionId = ?
      ORDER BY createdAt DESC
    `)

    return stmt.all(sessionId) as Task[]
  }

  /**
   * 获取所有任务（不含消息）
   */
  getAllTasks(): Task[] {
    const db = getDB()
    const stmt = db.prepare(`
      SELECT id, sessionId, name, createdAt
      FROM tasks
      ORDER BY createdAt DESC
    `)

    return stmt.all() as Task[]
  }

  /**
   * 更新任务名称
   */
  updateTaskName(taskId: string, name: string): boolean {
    const db = getDB()
    const stmt = db.prepare(`
      UPDATE tasks
      SET name = ?
      WHERE id = ?
    `)

    const result = stmt.run(name, taskId)
    return result.changes > 0
  }

  /**
   * 删除任务（级联删除所有消息）
   */
  deleteTask(taskId: string): boolean {
    const db = getDB()
    const stmt = db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
    `)

    const result = stmt.run(taskId)
    return result.changes > 0
  }

  /**
   * 根据 Session ID 删除所有任务
   */
  deleteTasksBySessionId(sessionId: string): number {
    const db = getDB()
    const stmt = db.prepare(`
      DELETE FROM tasks
      WHERE sessionId = ?
    `)

    const result = stmt.run(sessionId)
    return result.changes
  }

  // ==================== Message 相关操作 ====================

  /**
   * 创建新消息
   */
  createMessage(message: Message): Message {
    const db = getDB()

    // 将 tool_calls 序列化为 JSON 字符串
    const messageDB: MessageDB = {
      id: message.id,
      taskId: message.taskId,
      createdAt: message.createdAt,
      index: message.index,
      role: message.role,
      content: message.content,
      name: message.name,
      tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : undefined,
      tool_call_id: message.tool_call_id
    }

    const stmt = db.prepare(`
      INSERT INTO messages (id, taskId, createdAt, "index", role, content, name, tool_calls, tool_call_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      messageDB.id,
      messageDB.taskId,
      messageDB.createdAt,
      messageDB.index,
      messageDB.role,
      messageDB.content,
      messageDB.name ?? null,
      messageDB.tool_calls ?? null,
      messageDB.tool_call_id ?? null
    )

    return message
  }

  /**
   * 根据 Task ID 获取所有消息（按 index 升序）
   */
  getMessagesByTaskId(taskId: string): Message[] {
    const db = getDB()
    const stmt = db.prepare(`
      SELECT id, taskId, createdAt, "index", role, content, name, tool_calls, tool_call_id
      FROM messages
      WHERE taskId = ?
      ORDER BY "index" ASC
    `)

    const messagesDB = stmt.all(taskId) as MessageDB[]

    // 将 tool_calls 从 JSON 字符串反序列化
    return messagesDB.map((msgDB) => {
      const message: Message = {
        id: msgDB.id,
        taskId: msgDB.taskId,
        createdAt: msgDB.createdAt,
        index: msgDB.index,
        role: msgDB.role as any,
        content: msgDB.content,
        name: msgDB.name,
        tool_calls: msgDB.tool_calls
          ? (JSON.parse(msgDB.tool_calls) as OpenAIToolCall[])
          : undefined,
        tool_call_id: msgDB.tool_call_id
      }
      return message
    })
  }

  /**
   * 根据 ID 获取单条消息
   */
  getMessageById(messageId: string): Message | null {
    const db = getDB()
    const stmt = db.prepare(`
      SELECT id, taskId, createdAt, "index", role, content, name, tool_calls, tool_call_id
      FROM messages
      WHERE id = ?
    `)

    const msgDB = stmt.get(messageId) as MessageDB | undefined
    if (!msgDB) return null

    const message: Message = {
      id: msgDB.id,
      taskId: msgDB.taskId,
      createdAt: msgDB.createdAt,
      index: msgDB.index,
      role: msgDB.role as any,
      content: msgDB.content,
      name: msgDB.name,
      tool_calls: msgDB.tool_calls ? (JSON.parse(msgDB.tool_calls) as OpenAIToolCall[]) : undefined,
      tool_call_id: msgDB.tool_call_id
    }

    return message
  }

  /**
   * 删除消息
   */
  deleteMessage(messageId: string): boolean {
    const db = getDB()
    const stmt = db.prepare(`
      DELETE FROM messages
      WHERE id = ?
    `)

    const result = stmt.run(messageId)
    return result.changes > 0
  }

  /**
   * 删除任务的所有消息
   */
  deleteMessagesByTaskId(taskId: string): number {
    const db = getDB()
    const stmt = db.prepare(`
      DELETE FROM messages
      WHERE taskId = ?
    `)

    const result = stmt.run(taskId)
    return result.changes
  }

  /**
   * 更新消息内容（用于更新系统提示词等场景）
   * 修复问题1：支持更新系统提示词
   */
  updateMessage(messageId: string, updates: { content?: string | null }): boolean {
    const db = getDB()
    const stmt = db.prepare(`
      UPDATE messages
      SET content = ?
      WHERE id = ?
    `)

    const result = stmt.run(updates.content, messageId)
    return result.changes > 0
  }

  /**
   * 批量创建消息（用于导入历史记录等场景）
   */
  createMessages(messages: Message[]): void {
    const db = getDB()

    const stmt = db.prepare(`
      INSERT INTO messages (id, taskId, createdAt, "index", role, content, name, tool_calls, tool_call_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const transaction = db.transaction((msgs: Message[]) => {
      for (const message of msgs) {
        const messageDB: MessageDB = {
          id: message.id,
          taskId: message.taskId,
          createdAt: message.createdAt,
          index: message.index,
          role: message.role,
          content: message.content,
          name: message.name,
          tool_calls: message.tool_calls ? JSON.stringify(message.tool_calls) : undefined,
          tool_call_id: message.tool_call_id
        }

        stmt.run(
          messageDB.id,
          messageDB.taskId,
          messageDB.createdAt,
          messageDB.index,
          messageDB.role,
          messageDB.content,
          messageDB.name ?? null,
          messageDB.tool_calls ?? null,
          messageDB.tool_call_id ?? null
        )
      }
    })

    transaction(messages)
  }
}

// 导出单例
export const taskRepository = new TaskRepository()
