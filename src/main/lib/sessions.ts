import { removeSession } from './sessionStore'
import { disconnectSSH } from './sshPool'

export const deleteSession = (sessionId: string): void => {
    removeSession(sessionId)
    disconnectSSH(sessionId)
}
