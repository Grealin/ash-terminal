import { AppConfig, SSHConfig } from '@shared/models'
import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

const electron = {
  closeFocusedWindow: () => ipcRenderer.invoke('closeFocusedWindow'),
  minimizeFocusedWindow: () => ipcRenderer.invoke('minimizeFocusedWindow'),
  maximizeFocusedWindow: () => ipcRenderer.invoke('maximizeFocusedWindow'),
  toggleMaximizeFocusedWindow: () => ipcRenderer.invoke('toggleMaximizeFocusedWindow'),
  isWindowMaximized: () => ipcRenderer.invoke('isWindowMaximized'),
  onWindowMaximizeChanged: (callback: (isMaximized: boolean) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
      callback(isMaximized)
    ipcRenderer.on('window-maximize-changed', subscription)
    return () => ipcRenderer.removeListener('window-maximize-changed', subscription)
  },
  openFileDialog: (): Promise<string[]> => ipcRenderer.invoke('openFileDialog'),
  openWithChooser: (localPath: string): Promise<void> =>
    ipcRenderer.invoke('openWithChooser', localPath),
  deleteEditCacheFile: (localPath: string): Promise<void> =>
    ipcRenderer.invoke('deleteEditCacheFile', localPath)
}

const context = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('getConfig'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('saveConfig', config),
  updateConfigField: (path: string, value: any): Promise<void> =>
    ipcRenderer.invoke('updateConfigField', path, value)
}

const ssh = {
  getSessions: () => ipcRenderer.invoke('getSessions'),
  saveSession: (session: SSHConfig) => ipcRenderer.invoke('saveSession', session),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('deleteSession', sessionId),
  connectSSH: (config: SSHConfig) => ipcRenderer.invoke('connectSSH', config),
  disconnectSSH: (sessionId: string) => ipcRenderer.invoke('disconnectSSH', sessionId),
  executeSSHCommand: (sessionId: string, command: string) =>
    ipcRenderer.invoke('executeSSHCommand', sessionId, command),
  getDirectoryFiles: (sessionId: string, path: string) =>
    ipcRenderer.invoke('getDirectoryFiles', sessionId, path),

  // 文件操作
  downloadFile: (sessionId: string, remotePath: string) =>
    ipcRenderer.invoke('downloadFile', sessionId, remotePath),
  deleteRemoteFile: (sessionId: string, remotePath: string) =>
    ipcRenderer.invoke('deleteRemoteFile', sessionId, remotePath),
  uploadFile: (sessionId: string, localPath: string, remoteDir: string) =>
    ipcRenderer.invoke('uploadFile', sessionId, localPath, remoteDir),
  downloadFileToEditCache: (sessionId: string, remotePath: string) =>
    ipcRenderer.invoke('downloadFileToEditCache', sessionId, remotePath),
  backupRemoteFile: (sessionId: string, remotePath: string) =>
    ipcRenderer.invoke('backupRemoteFile', sessionId, remotePath),

  // 交互式Shell
  createInteractiveShell: (sessionId: string) =>
    ipcRenderer.invoke('createInteractiveShell', sessionId),
  writeToShell: (sessionId: string, data: string) =>
    ipcRenderer.invoke('writeToShell', sessionId, data),
  resizeShell: (sessionId: string, cols: number, rows: number) =>
    ipcRenderer.invoke('resizeShell', sessionId, cols, rows),

  // Shell事件监听
  onShellData: (sessionId: string, callback: (data: string) => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: string
    ) => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('shell-data', subscription)
    ipcRenderer.invoke('onShellData', sessionId)
    return () => ipcRenderer.removeListener('shell-data', subscription)
  },

  onShellClose: (sessionId: string, callback: () => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, receivedSessionId: string) => {
      if (receivedSessionId === sessionId) {
        callback()
      }
    }
    ipcRenderer.on('shell-close', subscription)
    ipcRenderer.invoke('onShellClose', sessionId)
    return () => ipcRenderer.removeListener('shell-close', subscription)
  },

  onShellError: (sessionId: string, callback: (error: string) => void) => {
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      error: string
    ) => {
      if (receivedSessionId === sessionId) {
        callback(error)
      }
    }
    ipcRenderer.on('shell-error', subscription)
    ipcRenderer.invoke('onShellError', sessionId)
    return () => ipcRenderer.removeListener('shell-error', subscription)
  }
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
  contextBridge.exposeInMainWorld('ssh', ssh)
} catch (error) {
  console.error(error)
}
