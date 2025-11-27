import { contextBridge, ipcRenderer } from 'electron'

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

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

const electron = {
  closeFocusedWindow: (...args: Parameters<CloseFocusedWindow>) =>
    ipcRenderer.invoke('closeFocusedWindow', ...args),
  minimizeFocusedWindow: (...args: Parameters<MinimizeFocusedWindow>) =>
    ipcRenderer.invoke('minimizeFocusedWindow', ...args),
  maximizeFocusedWindow: (...args: Parameters<MaximizeFocusedWindow>) =>
    ipcRenderer.invoke('maximizeFocusedWindow', ...args),
  toggleMaximizeFocusedWindow: (...args: Parameters<ToggleMaximizeFocusedWindow>) =>
    ipcRenderer.invoke('toggleMaximizeFocusedWindow', ...args),
  isWindowMaximized: (...args: Parameters<IsWindowMaximized>) =>
    ipcRenderer.invoke('isWindowMaximized', ...args),
  onWindowMaximizeChanged: (...args: Parameters<OnWindowMaximizeChanged>) => {
    const [callback] = args
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
      callback(isMaximized)
    ipcRenderer.on('window-maximize-changed', subscription)
    return () => ipcRenderer.removeListener('window-maximize-changed', subscription)
  },
  openFileDialog: (...args: Parameters<OpenFileDialog>) =>
    ipcRenderer.invoke('openFileDialog', ...args),
  openWithChooser: (...args: Parameters<OpenWithChooser>) =>
    ipcRenderer.invoke('openWithChooser', ...args),
  deleteEditCacheFile: (...args: Parameters<DeleteEditCacheFile>) =>
    ipcRenderer.invoke('deleteEditCacheFile', ...args)
}

const context = {
  getConfig: (...args: Parameters<GetConfig>) => ipcRenderer.invoke('getConfig', ...args),
  saveConfig: (...args: Parameters<SaveConfig>) => ipcRenderer.invoke('saveConfig', ...args),
  updateConfigField: (...args: Parameters<UpdateConfigField>) =>
    ipcRenderer.invoke('updateConfigField', ...args)
}

const ssh = {
  getSessions: (...args: Parameters<GetSessions>) => ipcRenderer.invoke('getSessions', ...args),
  saveSession: (...args: Parameters<SaveSession>) => ipcRenderer.invoke('saveSession', ...args),
  deleteSession: (...args: Parameters<DeleteSession>) =>
    ipcRenderer.invoke('deleteSession', ...args),
  connectSSH: (...args: Parameters<ConnectSSH>) => ipcRenderer.invoke('connectSSH', ...args),
  disconnectSSH: (...args: Parameters<DisconnectSSH>) =>
    ipcRenderer.invoke('disconnectSSH', ...args),
  executeSSHCommand: (...args: Parameters<ExecuteSSHCommand>) =>
    ipcRenderer.invoke('executeSSHCommand', ...args),
  getDirectoryFiles: (...args: Parameters<GetDirectoryFiles>) =>
    ipcRenderer.invoke('getDirectoryFiles', ...args),

  // 文件操作
  downloadFile: (...args: Parameters<DownloadFile>) => ipcRenderer.invoke('downloadFile', ...args),
  deleteRemoteFile: (...args: Parameters<DeleteRemoteFile>) =>
    ipcRenderer.invoke('deleteRemoteFile', ...args),
  uploadFile: (...args: Parameters<UploadFile>) => ipcRenderer.invoke('uploadFile', ...args),
  downloadFileToEditCache: (...args: Parameters<DownloadFileToEditCache>) =>
    ipcRenderer.invoke('downloadFileToEditCache', ...args),
  backupRemoteFile: (...args: Parameters<BackupRemoteFile>) =>
    ipcRenderer.invoke('backupRemoteFile', ...args),

  // 交互式Shell
  createInteractiveShell: (...args: Parameters<CreateInteractiveShell>) =>
    ipcRenderer.invoke('createInteractiveShell', ...args),
  writeToShell: (...args: Parameters<WriteToShell>) => ipcRenderer.invoke('writeToShell', ...args),
  resizeShell: (...args: Parameters<ResizeShell>) => ipcRenderer.invoke('resizeShell', ...args),

  // Shell事件监听
  onShellData: (...args: Parameters<OnShellData>) => {
    const [sessionId, callback] = args
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

  onShellClose: (...args: Parameters<OnShellClose>) => {
    const [sessionId, callback] = args
    const subscription = (_event: Electron.IpcRendererEvent, receivedSessionId: string) => {
      if (receivedSessionId === sessionId) {
        callback()
      }
    }
    ipcRenderer.on('shell-close', subscription)
    ipcRenderer.invoke('onShellClose', sessionId)
    return () => ipcRenderer.removeListener('shell-close', subscription)
  },

  onShellError: (...args: Parameters<OnShellError>) => {
    const [sessionId, callback] = args
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
  },

  // 系统监控
  getSystemMonitorData: (...args: Parameters<GetSystemMonitorData>) =>
    ipcRenderer.invoke('getSystemMonitorData', ...args)
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
  contextBridge.exposeInMainWorld('ssh', ssh)
} catch (error) {
  console.error(error)
}
