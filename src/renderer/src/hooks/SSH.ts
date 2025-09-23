import { SSHService, currentSessionIdAtom, sessionsAtom } from '@/services'
import { SSHConfig } from '@shared/models'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

export const useSSHSession = () => {
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const [currentSessionId, setCurrentSessionId] = useAtom(currentSessionIdAtom)

  const loadSessions = useCallback(async () => {
    try {
      const sessionList = await SSHService.getSessions()
      setSessions(sessionList)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }, [setSessions])

  const connectToSession = useCallback(async (session: SSHConfig) => {
    try {
      const result = await SSHService.connectSSH(session)
      if (result.success) {
        setCurrentSessionId(session.id)
        return { success: true }
      } else {
        return { success: false, error: result.error }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }, [setCurrentSessionId])

  const disconnectCurrentSession = useCallback(async () => {
    if (currentSessionId) {
      try {
        await SSHService.disconnectSSH(currentSessionId)
        setCurrentSessionId(null)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Disconnect failed'
        }
      }
    }
    return { success: true }
  }, [currentSessionId, setCurrentSessionId])

  return {
    sessions,
    currentSessionId,
    loadSessions,
    connectToSession,
    disconnectCurrentSession
  }
}
