import { SSHConfig } from '@shared/models'
import { SSH2Wrapper } from './SSH2Wrapper'

const sshConnections: Map<string, SSH2Wrapper> = new Map()

export const getSSH = (sessionId: string): SSH2Wrapper | undefined => {
    return sshConnections.get(sessionId)
}

export const connectSSH = async (config: SSHConfig): Promise<{ success: boolean; error?: string }> => {
    try {
        const ssh = new SSH2Wrapper()
        await ssh.connect(config)
        sshConnections.set(config.id, ssh)
        return { success: true }
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown connection error'
        }
    }
}

export const disconnectSSH = (sessionId: string): void => {
    const ssh = sshConnections.get(sessionId)
    if (ssh) {
        ssh.dispose()
        sshConnections.delete(sessionId)
    }
}
