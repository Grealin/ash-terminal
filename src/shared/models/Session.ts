// SSH连接配置
export interface SSHConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  authMethod: 'password' | 'key'
  password?: string
  privateKey?: string
  privateKeySource?: 'content' | 'path'
  passphrase?: string
}

// SSH连接状态
export interface SSHConnectionState {
  connected: boolean
  connecting: boolean
  error?: string
  sessionId?: string
}

// 文件信息
export interface FileInfo {
  name: string
  type: 'file' | 'directory'
  size: number
  modified: Date
  permissions: string
  path: string
}

// 终端会话状态
export interface TerminalSession {
  id: string
  sshConfig: SSHConfig
  connectionState: SSHConnectionState
  currentPath: string
  files: FileInfo[]
}
