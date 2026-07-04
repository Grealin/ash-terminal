import { SSHConfig } from '@shared/models'
import { app } from 'electron'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import { taskManager } from './ai/TaskManager'
import { getEnv } from './Env'
import { disconnectSSH } from './SSHPool'

/**
 * 旧格式 SSHConfig 迁移函数
 * 为没有 authMethod 字段的旧数据补全认证方式标识
 * 为密钥模式下缺失 privateKeySource 的旧数据推断密钥来源
 */
const migrateSession = (session: Record<string, unknown>): SSHConfig => {
  const hasPrivateKey = Boolean(session.privateKey)
  const authMethod: 'password' | 'key' = hasPrivateKey ? 'key' : 'password'

  let privateKeySource: 'content' | 'path' | undefined
  if (hasPrivateKey && !session.privateKeySource) {
    // 通过路径特征正则推断：Unix 绝对路径、Windows 盘符路径、波浪号、相对路径
    const privateKeyStr = String(session.privateKey)
    const pathPattern = /^(\/|[A-Za-z]:\\|~\/|\.{1,2}[\\/])/
    privateKeySource = pathPattern.test(privateKeyStr) ? 'path' : 'content'
  } else if (session.privateKeySource) {
    privateKeySource = session.privateKeySource as 'content' | 'path'
  }

  return {
    id: String(session.id),
    name: String(session.name),
    host: String(session.host),
    port: Number(session.port),
    username: String(session.username),
    authMethod,
    password: session.password as string | undefined,
    privateKey: session.privateKey as string | undefined,
    privateKeySource,
    passphrase: session.passphrase as string | undefined
  }
}

let Store: any = null
let sessionStore: any = null

export const initSessionStore = async (): Promise<void> => {
  if (!sessionStore) {
    if (!Store) {
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    const encryptionKey = getEnv('SECRET_KEY')
    if (!encryptionKey) {
      throw new Error('SECRET_KEY not found in environment variables')
    }

    try {
      sessionStore = new Store({
        name: 'sessions',
        cwd: app.getPath('userData'),
        encryptionKey,
        defaults: { sessions: [] }
      })
      // 尝试访问以验证文件是否有效
      sessionStore.get('sessions', [])
    } catch (error) {
      console.error('Failed to initialize session store:', error)
      // 如果是 JSON 解析错误，删除损坏的配置文件
      if (error instanceof SyntaxError || (error as any).message?.includes('JSON')) {
        const configPath = join(app.getPath('userData'), 'sessions.json')
        if (existsSync(configPath)) {
          console.log('Deleting corrupted config file:', configPath)
          try {
            unlinkSync(configPath)
          } catch (unlinkError) {
            console.error('Failed to delete corrupted config file:', unlinkError)
          }
        }
        // 重新创建
        sessionStore = new Store({
          name: 'sessions',
          cwd: app.getPath('userData'),
          encryptionKey,
          defaults: { sessions: [] }
        })
        console.log('Session store reinitialized successfully')
      } else {
        throw error
      }
    }
  }
}

export const getSessions = (): SSHConfig[] => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  const sessions = sessionStore.get('sessions', []) as Record<string, unknown>[]
  let hasMigration = false
  const migrated: SSHConfig[] = sessions.map((s) => {
    if (!s.authMethod) {
      hasMigration = true
      return migrateSession(s)
    }
    return s as unknown as SSHConfig
  })
  if (hasMigration) {
    sessionStore.set('sessions', migrated)
  }
  return migrated
}

export const saveSession = (session: SSHConfig): void => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  const sessions: SSHConfig[] = getSessions()
  const existingIndex = sessions.findIndex((s) => s.id === session.id)
  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }
  sessionStore.set('sessions', sessions)
}

export const removeSession = (sessionId: string): void => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  const sessions: SSHConfig[] = getSessions().filter((s) => s.id !== sessionId)
  sessionStore.set('sessions', sessions)
}

export const deleteSession = (sessionId: string): void => {
  taskManager.clearAllTasks(sessionId)
  taskManager.closeSession(sessionId)
  removeSession(sessionId)
  disconnectSSH(sessionId)
}
