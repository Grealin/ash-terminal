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
  GetAvailableTools,
  GetAvailableToolsWithInfo,
  GetProviders,
  RemoveProvider,
  ResetAiConfig,
  SaveAiConfig,
  SetActiveProvider,
  UpdateAiConfigField,
  UpdateProvider
} from '@shared/types/AiConfig'

import {
  AskTask,
  ClearAllTasks,
  ClearCurrentTask,
  CloseTaskSession,
  DeleteTask,
  GetCurrentTask,
  GetOperatingSystem,
  GetTaskList,
  OnTaskAnswer,
  OnTaskDone,
  OnTaskError,
  OnTaskStream,
  OnTaskSwitched,
  OnTaskThought,
  OnTaskToolCall,
  OnTaskToolResult,
  PrepareNewTask,
  StopTask,
  SwitchTask,
  UpdateTaskName
} from '@shared/types/Task'

import { OnToolApprovalRequest, RespondToolApproval } from '@shared/types/ToolApproval'

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
    ipcRenderer.invoke('setActiveProvider', ...args),

  // 工具管理
  getAvailableTools: (...args: Parameters<GetAvailableTools>) =>
    ipcRenderer.invoke('getAvailableTools', ...args),
  getAvailableToolsWithInfo: (...args: Parameters<GetAvailableToolsWithInfo>) =>
    ipcRenderer.invoke('getAvailableToolsWithInfo', ...args)
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
  // ==================== 任务管理（核心接口）====================

  prepareNewTask: (...args: Parameters<PrepareNewTask>) =>
    ipcRenderer.invoke('prepareNewTask', ...args),

  switchTask: (...args: Parameters<SwitchTask>) => ipcRenderer.invoke('switchTask', ...args),

  askTask: (...args: Parameters<AskTask>) => ipcRenderer.invoke('askTask', ...args),

  getTaskList: (...args: Parameters<GetTaskList>) => ipcRenderer.invoke('getTaskList', ...args),

  getCurrentTask: (...args: Parameters<GetCurrentTask>) =>
    ipcRenderer.invoke('getCurrentTask', ...args),

  deleteTask: (...args: Parameters<DeleteTask>) => ipcRenderer.invoke('deleteTask', ...args),

  updateTaskName: (...args: Parameters<UpdateTaskName>) =>
    ipcRenderer.invoke('updateTaskName', ...args),

  clearCurrentTask: (...args: Parameters<ClearCurrentTask>) =>
    ipcRenderer.invoke('clearCurrentTask', ...args),

  stopTask: (...args: Parameters<StopTask>) => ipcRenderer.invoke('stopTask', ...args),

  closeTaskSession: (...args: Parameters<CloseTaskSession>) =>
    ipcRenderer.invoke('closeTaskSession', ...args),

  clearAllTasks: (...args: Parameters<ClearAllTasks>) =>
    ipcRenderer.invoke('clearAllTasks', ...args),

  // ==================== 任务事件监听 ====================

  onTaskStream: (...args: Parameters<OnTaskStream>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-stream', subscription)
    ipcRenderer.invoke('onTaskStream', sessionId)
    return () => ipcRenderer.removeListener('task-stream', subscription)
  },

  onTaskThought: (...args: Parameters<OnTaskThought>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-thought', subscription)
    ipcRenderer.invoke('onTaskThought', sessionId)
    return () => ipcRenderer.removeListener('task-thought', subscription)
  },

  onTaskToolCall: (...args: Parameters<OnTaskToolCall>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-tool-call', subscription)
    ipcRenderer.invoke('onTaskToolCall', sessionId)
    return () => ipcRenderer.removeListener('task-tool-call', subscription)
  },

  onTaskToolResult: (...args: Parameters<OnTaskToolResult>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-tool-result', subscription)
    ipcRenderer.invoke('onTaskToolResult', sessionId)
    return () => ipcRenderer.removeListener('task-tool-result', subscription)
  },

  onTaskAnswer: (...args: Parameters<OnTaskAnswer>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-answer', subscription)
    ipcRenderer.invoke('onTaskAnswer', sessionId)
    return () => ipcRenderer.removeListener('task-answer', subscription)
  },

  onTaskError: (...args: Parameters<OnTaskError>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-error', subscription)
    ipcRenderer.invoke('onTaskError', sessionId)
    return () => ipcRenderer.removeListener('task-error', subscription)
  },

  onTaskDone: (...args: Parameters<OnTaskDone>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-done', subscription)
    ipcRenderer.invoke('onTaskDone', sessionId)
    return () => ipcRenderer.removeListener('task-done', subscription)
  },

  onTaskSwitched: (...args: Parameters<OnTaskSwitched>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      data: any
    ): void => {
      if (receivedSessionId === sessionId) {
        callback(data)
      }
    }
    ipcRenderer.on('task-switched', subscription)
    ipcRenderer.invoke('onTaskSwitched', sessionId)
    return () => ipcRenderer.removeListener('task-switched', subscription)
  },

  // ==================== 辅助接口 ====================

  getOperatingSystem: (...args: Parameters<GetOperatingSystem>) =>
    ipcRenderer.invoke('getOperatingSystem', ...args)
}

const toolApproval = {
  // 监听工具批准请求（按需订阅）
  onToolApprovalRequest: (...args: Parameters<OnToolApprovalRequest>): (() => void) => {
    const [sessionId, callback] = args
    const subscription = (
      _event: Electron.IpcRendererEvent,
      receivedSessionId: string,
      request: any
    ): void => {
      // 只接收匹配 sessionId 的请求
      if (receivedSessionId === sessionId) {
        callback(request)
      }
    }
    ipcRenderer.on('tool-approval-request', subscription)
    ipcRenderer.invoke('onToolApprovalRequest', sessionId)
    return () => ipcRenderer.removeListener('tool-approval-request', subscription)
  },

  // 响应工具批准
  respondToolApproval: (...args: Parameters<RespondToolApproval>) =>
    ipcRenderer.invoke('respondToolApproval', ...args)
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
  contextBridge.exposeInMainWorld('aiConfig', aiConfig)
  contextBridge.exposeInMainWorld('ssh', ssh)
  contextBridge.exposeInMainWorld('ai', ai)
  contextBridge.exposeInMainWorld('toolApproval', toolApproval)
} catch (error) {
  console.error(error)
}
