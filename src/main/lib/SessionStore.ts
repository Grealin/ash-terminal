import { SSHConfig } from '@shared/models'
import { app } from 'electron'
import { existsSync, unlinkSync } from 'fs'
import { join } from 'path'
import './Env'
import { disconnectSSH } from './SSHPool'

let Store: any = null
let sessionStore: any = null

export const initSessionStore = async (): Promise<void> => {
  if (!sessionStore) {
    if (!Store) {
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    const encryptionKey = process.env.SECRET_KEY
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
  return sessionStore.get('sessions', [])
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
  removeSession(sessionId)
  disconnectSSH(sessionId)
}
