import { AiMessage, AiTask } from '@shared/models'
import { getDB } from '../core/Database'

/**
 * 插入任务
 */
export const insertTask = (task: AiTask): void => {
  const db = getDB()
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, mode, session_id, created_at, updated_at, archived, is_draft)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    task.id,
    task.title,
    task.mode,
    task.sessionId,
    task.createdAt,
    task.updatedAt,
    task.archived ? 1 : 0,
    task.isDraft ? 1 : 0
  )
}

/**
 * 更新任务
 */
export const updateTaskDB = (
  taskId: string,
  updates: Partial<Omit<AiTask, 'id' | 'messages'>>
): void => {
  const db = getDB()
  const fields: string[] = []
  const values: any[] = []

  if (updates.title !== undefined) {
    fields.push('title = ?')
    values.push(updates.title)
  }
  if (updates.mode !== undefined) {
    fields.push('mode = ?')
    values.push(updates.mode)
  }
  if (updates.archived !== undefined) {
    fields.push('archived = ?')
    values.push(updates.archived ? 1 : 0)
  }
  if (updates.isDraft !== undefined) {
    fields.push('is_draft = ?')
    values.push(updates.isDraft ? 1 : 0)
  }

  fields.push('updated_at = ?')
  values.push(Date.now())

  values.push(taskId)

  const stmt = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`)
  const result = stmt.run(...values)

  if (result.changes === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }
}

/**
 * 删除任务（级联删除消息和工具调用）
 */
export const deleteTaskDB = (taskId: string): void => {
  const db = getDB()
  const stmt = db.prepare('DELETE FROM tasks WHERE id = ?')
  const result = stmt.run(taskId)

  if (result.changes === 0) {
    throw new Error(`Task not found: ${taskId}`)
  }
}

/**
 * 查询任务（不包含消息）
 */
export const getTaskDB = (taskId: string): AiTask | null => {
  const db = getDB()
  const stmt = db.prepare(`
    SELECT id, title, mode, session_id as sessionId, created_at as createdAt,
           updated_at as updatedAt, archived, is_draft as isDraft
    FROM tasks WHERE id = ?
  `)

  const row = stmt.get(taskId) as any

  if (!row) return null

  return {
    ...row,
    archived: Boolean(row.archived),
    isDraft: Boolean(row.isDraft),
    messages: [] // 消息需要单独查询
  }
}

/**
 * 查询任务列表
 */
export const queryTasks = (params: {
  sessionId?: string
  mode?: string
  includeDrafts?: boolean
  includeArchived?: boolean
  searchQuery?: string
  limit?: number
  offset?: number
}): { tasks: AiTask[]; total: number } => {
  const db = getDB()
  const conditions: string[] = []
  const values: any[] = []

  if (params.sessionId) {
    conditions.push('session_id = ?')
    values.push(params.sessionId)
  }

  if (params.mode) {
    conditions.push('mode = ?')
    values.push(params.mode)
  }

  if (!params.includeDrafts) {
    conditions.push('is_draft = 0')
  }

  if (!params.includeArchived) {
    conditions.push('archived = 0')
  }

  if (params.searchQuery) {
    conditions.push('title LIKE ?')
    values.push(`%${params.searchQuery}%`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 查询总数
  const countStmt = db.prepare(`SELECT COUNT(*) as count FROM tasks ${whereClause}`)
  const { count: total } = countStmt.get(...values) as { count: number }

  // 查询任务列表
  const limitClause = params.limit !== undefined ? `LIMIT ${params.limit}` : ''
  const offsetClause = params.offset !== undefined ? `OFFSET ${params.offset}` : ''

  const stmt = db.prepare(`
    SELECT id, title, mode, session_id as sessionId, created_at as createdAt,
           updated_at as updatedAt, archived, is_draft as isDraft
    FROM tasks
    ${whereClause}
    ORDER BY updated_at DESC
    ${limitClause} ${offsetClause}
  `)

  const rows = stmt.all(...values) as any[]

  const tasks: AiTask[] = rows.map((row) => ({
    ...row,
    archived: Boolean(row.archived),
    isDraft: Boolean(row.isDraft),
    messages: [] // 不加载消息，按需加载
  }))

  return { tasks, total }
}

/**
 * 插入消息
 */
export const insertMessage = (message: AiMessage): void => {
  const db = getDB()

  // 插入消息
  const stmt = db.prepare(`
    INSERT INTO messages (id, task_id, role, content, tool_call_id, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  stmt.run(
    message.id,
    message.taskId,
    message.role,
    message.content,
    message.toolCallId || null,
    message.timestamp
  )

  // 插入工具调用
  if (message.toolCalls && message.toolCalls.length > 0) {
    const toolStmt = db.prepare(`
      INSERT INTO tool_calls (id, message_id, name, arguments, status, result, error, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    for (const toolCall of message.toolCalls) {
      toolStmt.run(
        toolCall.id,
        message.id,
        toolCall.name,
        JSON.stringify(toolCall.arguments),
        toolCall.status,
        toolCall.result || null,
        toolCall.error || null,
        toolCall.timestamp
      )
    }
  }

  // 更新任务的 updated_at 和 is_draft
  updateTaskDB(message.taskId, { isDraft: false })
}

/**
 * 删除消息
 */
export const deleteMessageDB = (messageId: string): void => {
  const db = getDB()
  const stmt = db.prepare('DELETE FROM messages WHERE id = ?')
  const result = stmt.run(messageId)

  if (result.changes === 0) {
    throw new Error(`Message not found: ${messageId}`)
  }
}

/**
 * 查询任务的所有消息
 */
export const getTaskMessages = (taskId: string): AiMessage[] => {
  const db = getDB()

  // 查询消息
  const msgStmt = db.prepare(`
    SELECT id, task_id as taskId, role, content, tool_call_id as toolCallId, timestamp
    FROM messages
    WHERE task_id = ?
    ORDER BY timestamp ASC
  `)

  const messages = msgStmt.all(taskId) as AiMessage[]

  // 查询每条消息的工具调用
  const toolStmt = db.prepare(`
    SELECT id, name, arguments, status, result, error, timestamp
    FROM tool_calls
    WHERE message_id = ?
  `)

  for (const message of messages) {
    const toolCalls = toolStmt.all(message.id) as any[]
    if (toolCalls.length > 0) {
      message.toolCalls = toolCalls.map((tc) => ({
        ...tc,
        arguments: JSON.parse(tc.arguments)
      }))
    }
  }

  return messages
}

/**
 * 清空会话的所有任务
 */
export const clearSessionTasks = (sessionId: string): void => {
  const db = getDB()
  const stmt = db.prepare('DELETE FROM tasks WHERE session_id = ?')
  stmt.run(sessionId)
}

/**
 * 获取统计信息
 */
export const getStatistics = (params: {
  sessionId?: string
  startDate?: number
  endDate?: number
}): {
  totalTasks: number
  draftTasks: number
  archivedTasks: number
  totalMessages: number
  totalToolCalls: number
  successfulToolCalls: number
  failedToolCalls: number
} => {
  const db = getDB()
  const conditions: string[] = []
  const values: any[] = []

  if (params.sessionId) {
    conditions.push('session_id = ?')
    values.push(params.sessionId)
  }

  if (params.startDate) {
    conditions.push('created_at >= ?')
    values.push(params.startDate)
  }

  if (params.endDate) {
    conditions.push('created_at <= ?')
    values.push(params.endDate)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // 任务统计
  const taskStmt = db.prepare(`
    SELECT
      COUNT(*) as totalTasks,
      SUM(CASE WHEN is_draft = 1 THEN 1 ELSE 0 END) as draftTasks,
      SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archivedTasks
    FROM tasks
    ${whereClause}
  `)

  const taskStats = taskStmt.get(...values) as any

  // 消息统计
  const msgStmt = db.prepare(`
    SELECT COUNT(*) as totalMessages
    FROM messages
    WHERE task_id IN (SELECT id FROM tasks ${whereClause})
  `)

  const { totalMessages } = msgStmt.get(...values) as any

  // 工具调用统计
  const toolStmt = db.prepare(`
    SELECT
      COUNT(*) as totalToolCalls,
      SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulToolCalls,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedToolCalls
    FROM tool_calls
    WHERE message_id IN (
      SELECT id FROM messages WHERE task_id IN (SELECT id FROM tasks ${whereClause})
    )
  `)

  const toolStats = toolStmt.get(...values) as any

  return {
    totalTasks: taskStats.totalTasks || 0,
    draftTasks: taskStats.draftTasks || 0,
    archivedTasks: taskStats.archivedTasks || 0,
    totalMessages: totalMessages || 0,
    totalToolCalls: toolStats.totalToolCalls || 0,
    successfulToolCalls: toolStats.successfulToolCalls || 0,
    failedToolCalls: toolStats.failedToolCalls || 0
  }
}
