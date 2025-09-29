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

  // 交互式Shell方法
  createInteractiveShell: (sessionId: string) => Promise<void>
  writeToShell: (sessionId: string, data: string) => Promise<void>
  resizeShell: (sessionId: string, cols: number, rows: number) => Promise<void>
  onShellData: (sessionId: string, callback: (data: string) => void) => () => void
  onShellClose: (sessionId: string, callback: () => void) => () => void
  onShellError: (sessionId: string, callback: (error: string) => void) => () => void
}

declare global {
  interface Window {
    electron: Electron
    context: Context
    ssh: SSH
  }
}

export { }

