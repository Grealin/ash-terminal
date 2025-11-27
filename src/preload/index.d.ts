import {
  CloseFocusedWindow,
  DeleteEditCacheFile,
  IsWindowMaximized,
  MaximizeFocusedWindow,
  MinimizeFocusedWindow,
  OnWindowMaximizeChanged,
  OpenFileDialog,
  OpenWithChooser,
  ToggleMaximizeFocusedWindow
} from '@shared/types/Electron'

import { GetConfig, SaveConfig, UpdateConfigField } from '@shared/types/Context'

import {
  BackupRemoteFile,
  ConnectSSH,
  CreateInteractiveShell,
  DeleteRemoteFile,
  DeleteSession,
  DisconnectSSH,
  DownloadFile,
  DownloadFileToEditCache,
  ExecuteSSHCommand,
  GetDirectoryFiles,
  GetSessions,
  GetSystemMonitorData,
  OnShellClose,
  OnShellData,
  OnShellError,
  ResizeShell,
  SaveSession,
  UploadFile,
  WriteToShell
} from '@shared/types/SSH'

interface Electron {
  closeFocusedWindow: CloseFocusedWindow
  minimizeFocusedWindow: MinimizeFocusedWindow
  maximizeFocusedWindow: MaximizeFocusedWindow
  toggleMaximizeFocusedWindow: ToggleMaximizeFocusedWindow
  isWindowMaximized: IsWindowMaximized
  onWindowMaximizeChanged: OnWindowMaximizeChanged
  openFileDialog: OpenFileDialog
  openWithChooser: OpenWithChooser
  deleteEditCacheFile: DeleteEditCacheFile
}

interface Context {
  getConfig: GetConfig
  saveConfig: SaveConfig
  updateConfigField: UpdateConfigField
}

interface SSH {
  getSessions: GetSessions
  saveSession: SaveSession
  deleteSession: DeleteSession
  connectSSH: ConnectSSH
  disconnectSSH: DisconnectSSH
  executeSSHCommand: ExecuteSSHCommand
  getDirectoryFiles: GetDirectoryFiles

  // 文件操作
  downloadFile: DownloadFile
  deleteRemoteFile: DeleteRemoteFile
  uploadFile: UploadFile
  downloadFileToEditCache: DownloadFileToEditCache
  backupRemoteFile: BackupRemoteFile

  // 交互式Shell方法
  createInteractiveShell: CreateInteractiveShell
  writeToShell: WriteToShell
  resizeShell: ResizeShell
  onShellData: OnShellData
  onShellClose: OnShellClose
  onShellError: OnShellError

  // 系统监控
  getSystemMonitorData: GetSystemMonitorData
}

declare global {
  interface Window {
    electron: Electron
    context: Context
    ssh: SSH
  }
}

export {}
