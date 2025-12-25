import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { createTables } from './Schema'

let db: Database.Database | null = null

/**
 * 初始化数据库
 */
export const initDatabase = (): Database.Database => {
  if (!db) {
    const dbPath = join(app.getPath('userData'), 'app.db')
    db = new Database(dbPath)

    // 启用 WAL 模式以提高并发性能
    db.pragma('journal_mode = WAL')
    // 启用外键约束
    db.pragma('foreign_keys = ON')

    // 创建所有表结构
    createTables()
  }

  return db
}

/**
 * 获取数据库实例
 */
export const getDB = (): Database.Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * 关闭数据库连接
 */
export const closeDatabase = (): void => {
  if (db) {
    db.close()
    db = null
  }
}
