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

interface AiConfig {
  getAiConfig: GetAiConfig
  saveAiConfig: SaveAiConfig
  updateAiConfigField: UpdateAiConfigField
  resetAiConfig: ResetAiConfig
  // 供应商管理
  getProviders: GetProviders
  getActiveProvider: GetActiveProvider
  addProvider: AddProvider
  updateProvider: UpdateProvider
  removeProvider: RemoveProvider
  setActiveProvider: SetActiveProvider
  // 工具管理
  getAvailableTools: GetAvailableTools
  getAvailableToolsWithInfo: GetAvailableToolsWithInfo
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

interface AI {
  // ==================== 任务管理（核心接口）====================
  prepareNewTask: PrepareNewTask
  switchTask: SwitchTask
  askTask: AskTask
  getTaskList: GetTaskList
  getCurrentTask: GetCurrentTask
  deleteTask: DeleteTask
  updateTaskName: UpdateTaskName
  clearCurrentTask: ClearCurrentTask
  stopTask: StopTask
  closeTaskSession: CloseTaskSession

  // ==================== 任务事件监听 ====================
  onTaskStream: OnTaskStream
  onTaskThought: OnTaskThought
  onTaskToolCall: OnTaskToolCall
  onTaskToolResult: OnTaskToolResult
  onTaskAnswer: OnTaskAnswer
  onTaskError: OnTaskError
  onTaskDone: OnTaskDone
  onTaskSwitched: OnTaskSwitched

  // ==================== 辅助接口 ====================
  getOperatingSystem: GetOperatingSystem
}

interface ToolApproval {
  onToolApprovalRequest: OnToolApprovalRequest
  respondToolApproval: RespondToolApproval
}

declare global {
  interface Window {
    electron: Electron
    context: Context
    aiConfig: AiConfig
    ssh: SSH
    ai: AI
    toolApproval: ToolApproval
  }
}

export {}
