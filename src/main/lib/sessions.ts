import { removeSession } from './SessionStore'
import { disconnectSSH } from './SSHPool'

export const deleteSession = (sessionId: string): void => {
  removeSession(sessionId)
  disconnectSSH(sessionId)
}
