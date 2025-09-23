import { AppConfig, FileInfo, SSHConfig } from '@shared/models'

interface Electron {
  closeFocusedWindow: () => void
  minimizeFocusedWindow: () => void
  maximizeFocusedWindow: () => void
  toggleMaximizeFocusedWindow: () => void
  isWindowMaximized: () => Promise<boolean>
  onWindowMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void
}

interface Context {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<void>
  updateConfigField: (path: string, value: any) => Promise<void>
}

interface SSH {
  getSessions: () => Promise<SSHConfig[]>
  saveSession: (session: SSHConfig) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  connectSSH: (config: SSHConfig) => Promise<{ success: boolean; error?: string }>
  disconnectSSH: (sessionId: string) => Promise<void>
  executeSSHCommand: (sessionId: string, command: string) => Promise<{ stdout: string; stderr: string }>
  getDirectoryFiles: (sessionId: string, path: string) => Promise<FileInfo[]>
}

declare global {
  interface Window {
    electron: Electron
    context: Context
    ssh: SSH
  }
}

export { }
