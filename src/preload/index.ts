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
  AddProvider,
  GetActiveProvider,
  GetAiConfig,
  GetProviders,
  RemoveProvider,
  ResetAiConfig,
  SaveAiConfig,
  SetActiveProvider,
  UpdateAiConfigField,
  UpdateProvider
} from '@shared/types/AiConfig'

import {
  AddMessage,
  ApproveToolCall,
  CreateTask,
  DeleteMessage,
  DeleteTask,
  GetTask,
  GetTaskStatistics,
  ListTasks,
  RejectToolCall,
  RunAgentTask,
  RunAskTask,
  UpdateMessage,
  UpdateTask
} from '@shared/types/AI'

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
  toggleMaximizeFocusedWindow: (...args: Parameters<ToggleMaximizeFocusedWindow>): Promise<void> =>
    ipcRenderer.invoke('toggleMaximizeFocusedWindow', ...args),
  isWindowMaximized: (...args: Parameters<IsWindowMaximized>): ReturnType<IsWindowMaximized> =>
    ipcRenderer.invoke('isWindowMaximized', ...args),
  onWindowMaximizeChanged: (...args: Parameters<OnWindowMaximizeChanged>): (() => void) => {
    const [callback] = args
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
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

const aiConfig = {
  getAiConfig: (...args: Parameters<GetAiConfig>) => ipcRenderer.invoke('getAiConfig', ...args),
  saveAiConfig: (...args: Parameters<SaveAiConfig>) => ipcRenderer.invoke('saveAiConfig', ...args),
  updateAiConfigField: (...args: Parameters<UpdateAiConfigField>) =>
    ipcRenderer.invoke('updateAiConfigField', ...args),
  resetAiConfig: (...args: Parameters<ResetAiConfig>) =>
    ipcRenderer.invoke('resetAiConfig', ...args),

  // 供应商管理
  getProviders: (...args: Parameters<GetProviders>) => ipcRenderer.invoke('getProviders', ...args),
  getActiveProvider: (...args: Parameters<GetActiveProvider>) =>
    ipcRenderer.invoke('getActiveProvider', ...args),
  addProvider: (...args: Parameters<AddProvider>) => ipcRenderer.invoke('addProvider', ...args),
  updateProvider: (...args: Parameters<UpdateProvider>) =>
    ipcRenderer.invoke('updateProvider', ...args),
  removeProvider: (...args: Parameters<RemoveProvider>) =>
    ipcRenderer.invoke('removeProvider', ...args),
  setActiveProvider: (...args: Parameters<SetActiveProvider>) =>
    ipcRenderer.invoke('setActiveProvider', ...args)
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
  onShellData: (...args: Parameters<OnShellData>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: string
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('shell-data', subscription)
    ipcRenderer.invoke('onShellData', sessionId)
    return () => ipcRenderer.removeListener('shell-data', subscription)
  },

  onShellClose: (...args: Parameters<OnShellClose>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (_event: Electron.IpcRendererEvent, receivedSessionId: string): void => {
      if (receivedSessionId === sessionId) {
        callback()
      }
    }
    ipcRenderer.on('shell-close', subscription)
    ipcRenderer.invoke('onShellClose', sessionId)
    return () => ipcRenderer.removeListener('shell-close', subscription)
  },

  onShellError: (...args: Parameters<OnShellError>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      error: string
    ): void => {
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

const ai = {
  // 任务管理
  createTask: (...args: Parameters<CreateTask>) => ipcRenderer.invoke('ai:task:create', ...args),
  listTasks: (...args: Parameters<ListTasks>) => ipcRenderer.invoke('ai:task:list', ...args),
  getTask: (...args: Parameters<GetTask>) => ipcRenderer.invoke('ai:task:get', ...args),
  updateTask: (...args: Parameters<UpdateTask>) => ipcRenderer.invoke('ai:task:update', ...args),
  deleteTask: (...args: Parameters<DeleteTask>) => ipcRenderer.invoke('ai:task:delete', ...args),
  runAgentTask: (...args: Parameters<RunAgentTask>) =>
    ipcRenderer.invoke('ai:task:run-agent', ...args),
  runAskTask: (...args: Parameters<RunAskTask>) => ipcRenderer.invoke('ai:task:run-ask', ...args),
  getTaskStatistics: (...args: Parameters<GetTaskStatistics>) =>
    ipcRenderer.invoke('ai:task:statistics', ...args),

  // 消息管理
  addMessage: (...args: Parameters<AddMessage>) => ipcRenderer.invoke('ai:message:add', ...args),
  updateMessage: (...args: Parameters<UpdateMessage>) =>
    ipcRenderer.invoke('ai:message:update', ...args),
  deleteMessage: (...args: Parameters<DeleteMessage>) =>
    ipcRenderer.invoke('ai:message:delete', ...args),

  // 工具调用
  approveToolCall: (...args: Parameters<ApproveToolCall>) =>
    ipcRenderer.invoke('ai:tool:approve', ...args),
  rejectToolCall: (...args: Parameters<RejectToolCall>) =>
    ipcRenderer.invoke('ai:tool:reject', ...args)
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
  contextBridge.exposeInMainWorld('aiConfig', aiConfig)
  contextBridge.exposeInMainWorld('ssh', ssh)
  contextBridge.exposeInMainWorld('ai', ai)
} catch (error) {
  console.error(error)
}
