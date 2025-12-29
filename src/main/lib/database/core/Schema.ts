import { getDB } from './Database'

/**
 * 创建所有数据库表和索引
 */
export const createTables = (): void => {
  const db = getDB()

  // ==================== AI 任务相关表 ====================

  // 任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      name TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `)

  // 为 sessionId 创建索引，加速按会话查询任务
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_sessionId 
    ON tasks(sessionId)
  `)

  // 为 createdAt 创建索引，加速按时间排序
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_createdAt 
    ON tasks(createdAt)
  `)

  // 消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      "index" INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT,
      name TEXT,
      tool_calls TEXT,
      tool_call_id TEXT,
      FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // 为 taskId 创建索引，加速按任务查询消息
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_taskId 
    ON messages(taskId)
  `)

  // 为 taskId + index 创建复合索引，确保消息顺序唯一且加速排序
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_taskId_index 
    ON messages(taskId, "index")
  `)

  // ==================== 未来可在此添加其他业务表 ====================
  // 例如：系统日志表、用户偏好设置表等
}
