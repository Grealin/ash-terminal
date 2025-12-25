import { getSSH } from './SSHPool'

export const createInteractiveShell = async (sessionId: string): Promise<void> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  await ssh.createShell()
}

export const writeToShell = (sessionId: string, data: string): void => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  ssh.writeToShell(data)
}

export const resizeShell = (sessionId: string, cols: number, rows: number): void => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  ssh.resizeShell(cols, rows)
}

export const onShellData = (sessionId: string, callback: (data: string) => void): (() => void) => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  ssh.on('data', callback)
  return () => ssh.off('data', callback)
}

export const onShellClose = (sessionId: string, callback: () => void): (() => void) => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  ssh.on('close', callback)
  return () => ssh.off('close', callback)
}

export const onShellError = (sessionId: string, callback: (error: Error) => void): (() => void) => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  ssh.on('error', callback)
  return () => ssh.off('error', callback)
}
