import { FileInfo, SSHConfig, SystemMonitorData } from '../models'

export type GetSessions = () => Promise<SSHConfig[]>
export type SaveSession = (session: SSHConfig) => Promise<void>
export type DeleteSession = (sessionId: string) => Promise<void>
export type ConnectSSH = (config: SSHConfig) => Promise<{ success: boolean; error?: string }>
export type DisconnectSSH = (sessionId: string) => Promise<void>
export type ExecuteSSHCommand = (
  sessionId: string,
  command: string
) => Promise<{ stdout: string; stderr: string }>
export type GetDirectoryFiles = (sessionId: string, path: string) => Promise<FileInfo[]>
// 文件操作
export type DownloadFile = (sessionId: string, remotePath: string) => Promise<string>
export type DeleteRemoteFile = (sessionId: string, remotePath: string) => Promise<void>
export type UploadFile = (
  sessionId: string,
  localPath: string,
  remoteDir: string
) => Promise<string>
export type DownloadFileToEditCache = (sessionId: string, remotePath: string) => Promise<string>
export type BackupRemoteFile = (sessionId: string, remotePath: string) => Promise<void>
// 交互式Shell方法
export type CreateInteractiveShell = (sessionId: string) => Promise<void>
export type WriteToShell = (sessionId: string, data: string) => Promise<void>
export type ResizeShell = (sessionId: string, cols: number, rows: number) => Promise<void>
export type OnShellData = (sessionId: string, callback: (data: string) => void) => () => void
export type OnShellClose = (sessionId: string, callback: () => void) => () => void
export type OnShellError = (sessionId: string, callback: (error: string) => void) => () => void
// 系统监控
export type GetSystemMonitorData = (sessionId: string) => Promise<SystemMonitorData>
