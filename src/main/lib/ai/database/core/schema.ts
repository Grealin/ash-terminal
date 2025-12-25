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
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      session_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      archived INTEGER DEFAULT 0,
      is_draft INTEGER DEFAULT 1
    )
  `)

  // 消息表
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_call_id TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    )
  `)

  // 工具调用表
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      name TEXT NOT NULL,
      arguments TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      error TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `)

  // ==================== 索引 ====================

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_session ON tasks(session_id, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tasks_mode ON tasks(mode);
    CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON tool_calls(message_id);
  `)

  // ==================== 未来可在此添加其他业务表 ====================
  // 例如：系统日志表、用户偏好设置表等
}
