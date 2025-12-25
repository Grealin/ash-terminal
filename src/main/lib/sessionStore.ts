import { SSHConfig } from '@shared/models'
import { app } from 'electron'
import './Env'

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

    sessionStore = new Store({
      name: 'sessions',
      cwd: app.getPath('userData'),
      encryptionKey,
      defaults: { sessions: [] }
    })
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
