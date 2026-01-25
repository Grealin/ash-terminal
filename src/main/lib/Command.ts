import { getSSH } from './SSHPool'

export const executeSSHCommand = async (
  sessionId: string,
  command: string
): Promise<{ stdout: string; stderr: string; code: number }> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }

  let resolvedCommand = command
  if (command.includes('~')) {
    try {
      const homeResult = await ssh.execCommand('echo ~')
      if (homeResult.stdout && !homeResult.stderr) {
        const homePath = homeResult.stdout.trim()
        resolvedCommand = command.replace(/~/g, homePath)
      }
    } catch (error) {
      console.warn('Failed to resolve ~ in command, using original command:', error)
    }
  }

  return await ssh.execCommand(resolvedCommand)
}
