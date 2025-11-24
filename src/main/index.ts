import {
  backupRemoteFile,
  closeFocusedWindow,
  connectSSH,
  createInteractiveShell,
  deleteEditCacheFile,
  deleteRemoteFile,
  deleteSession,
  disconnectSSH,
  downloadFile,
  downloadFileToEditCache,
  executeSSHCommand,
  getConfig,
  getDirectoryFiles,
  getSessions,
  initConfigStore,
  initSessionStore,
  isWindowMaximized,
  maximizeFocusedWindow,
  minimizeFocusedWindow,
  onShellClose,
  onShellData,
  onShellError,
  openFileDialog,
  openWithChooser,
  resizeShell,
  saveConfig,
  saveSession,
  toggleMaximizeFocusedWindow,
  updateConfigField,
  uploadFile,
  writeToShell
} from '@/lib'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  CloseFocusedWindow,
  DeleteEditCacheFile,
  IsWindowMaximized,
  MaximizeFocusedWindow,
  MinimizeFocusedWindow,
  OpenWithChooser,
  ToggleMaximizeFocusedWindow
} from '@shared/types/Electron'
export type OpenFileDialog = () => Promise<string[]>

import { GetConfig, SaveConfig, UpdateConfigField } from '@shared/types/Context'

import {
  WINDOW_INITIAL_HEIGHT,
  WINDOW_INITIAL_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH
} from '@shared/constants'
import { AppConfig } from '@shared/models'
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
  ResizeShell,
  SaveSession,
  UploadFile,
  WriteToShell
} from '@shared/types/SSH'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'

function createWindow(): void {
  // 创建浏览器窗口
  const mainWindow = new BrowserWindow({
    width: WINDOW_INITIAL_WIDTH,
    height: WINDOW_INITIAL_HEIGHT,
    minWidth: WINDOW_MIN_WIDTH,
    minHeight: WINDOW_MIN_HEIGHT,
    show: false,
    autoHideMenuBar: true,
    icon: icon,
    center: true,
    title: 'ASH Terminal',
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // 监听窗口最大化状态变化
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximize-changed', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximize-changed', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 基于electronic-vite-cli的渲染器HMR。
  // 加载用于开发的远程URL或用于生产的本地html文件。
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 当Electron完成时，将调用此方法
// 初始化并准备创建浏览器窗口。
// 某些API只能在此事件发生后使用。
app.whenReady().then(async () => {
  // 为windows设置应用程序用户模型id
  electronApp.setAppUserModelId('com.qingfen')

  // 初始化配置存储
  await initConfigStore()

  // 初始化会话存储
  await initSessionStore()

  // 开发中默认按F12打开或关闭DevTools
  // 在生产中忽略CommandOrControl+R。
  // 看https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Electron 窗口管理
  ipcMain.handle('closeFocusedWindow', (_, ...args: Parameters<CloseFocusedWindow>) =>
    closeFocusedWindow(...args)
  )
  ipcMain.handle('minimizeFocusedWindow', (_, ...args: Parameters<MinimizeFocusedWindow>) =>
    minimizeFocusedWindow(...args)
  )
  ipcMain.handle('maximizeFocusedWindow', (_, ...args: Parameters<MaximizeFocusedWindow>) =>
    maximizeFocusedWindow(...args)
  )
  ipcMain.handle(
    'toggleMaximizeFocusedWindow',
    (_, ...args: Parameters<ToggleMaximizeFocusedWindow>) => toggleMaximizeFocusedWindow(...args)
  )
  ipcMain.handle('isWindowMaximized', (_, ...args: Parameters<IsWindowMaximized>) =>
    isWindowMaximized(...args)
  )
  // 配置管理
  ipcMain.handle('getConfig', (_, ...args: Parameters<GetConfig>): AppConfig => getConfig(...args))
  ipcMain.handle('saveConfig', (_, ...args: Parameters<SaveConfig>): void => saveConfig(...args))
  ipcMain.handle('updateConfigField', (_, ...args: Parameters<UpdateConfigField>): void =>
    updateConfigField(...args)
  )

  // SSH会话管理
  ipcMain.handle('getSessions', (_, ...args: Parameters<GetSessions>) => getSessions(...args))
  ipcMain.handle('saveSession', (_, ...args: Parameters<SaveSession>) => saveSession(...args))
  ipcMain.handle('deleteSession', (_, ...args: Parameters<DeleteSession>) => deleteSession(...args))
  ipcMain.handle('connectSSH', (_, ...args: Parameters<ConnectSSH>) => connectSSH(...args))
  ipcMain.handle('disconnectSSH', (_, ...args: Parameters<DisconnectSSH>) => disconnectSSH(...args))
  ipcMain.handle('executeSSHCommand', (_, ...args: Parameters<ExecuteSSHCommand>) =>
    executeSSHCommand(...args)
  )
  ipcMain.handle('getDirectoryFiles', (_, ...args: Parameters<GetDirectoryFiles>) =>
    getDirectoryFiles(...args)
  )

  // 文件操作
  ipcMain.handle('downloadFile', async (_event, ...args: Parameters<DownloadFile>) =>
    downloadFile(...args)
  )
  ipcMain.handle('deleteRemoteFile', async (_event, ...args: Parameters<DeleteRemoteFile>) =>
    deleteRemoteFile(...args)
  )
  ipcMain.handle('uploadFile', async (_event, ...args: Parameters<UploadFile>) =>
    uploadFile(...args)
  )

  // 编辑缓存与打开方式
  ipcMain.handle(
    'downloadFileToEditCache',
    async (_event, ...args: Parameters<DownloadFileToEditCache>) => downloadFileToEditCache(...args)
  )
  ipcMain.handle('openWithChooser', async (_event, ...args: Parameters<OpenWithChooser>) =>
    openWithChooser(...args)
  )
  ipcMain.handle('deleteEditCacheFile', async (_event, ...args: Parameters<DeleteEditCacheFile>) =>
    deleteEditCacheFile(...args)
  )
  ipcMain.handle('backupRemoteFile', async (_event, ...args: Parameters<BackupRemoteFile>) =>
    backupRemoteFile(...args)
  )

  // 系统文件选择对话框
  ipcMain.handle('openFileDialog', async (_event, ...args: Parameters<OpenFileDialog>) =>
    openFileDialog(...args)
  )

  // 交互式Shell管理
  ipcMain.handle('createInteractiveShell', (_, ...args: Parameters<CreateInteractiveShell>) =>
    createInteractiveShell(...args)
  )
  ipcMain.handle('writeToShell', (_, ...args: Parameters<WriteToShell>) => writeToShell(...args))
  ipcMain.handle('resizeShell', (_, ...args: Parameters<ResizeShell>) => resizeShell(...args))

  // Shell事件监听
  ipcMain.handle('onShellData', (event, sessionId: string) => {
    const cleanup = onShellData(sessionId, (data: string) => {
      event.sender.send('shell-data', sessionId, data)
    })

    // 在渲染进程窗口关闭时清理监听器
    event.sender.on('destroyed', cleanup)

    return { success: true }
  })

  ipcMain.handle('onShellClose', (event, sessionId: string) => {
    const cleanup = onShellClose(sessionId, () => {
      event.sender.send('shell-close', sessionId)
    })

    event.sender.on('destroyed', cleanup)

    return { success: true }
  })

  ipcMain.handle('onShellError', (event, sessionId: string) => {
    const cleanup = onShellError(sessionId, (error: Error) => {
      event.sender.send('shell-error', sessionId, error.message)
    })

    event.sender.on('destroyed', cleanup)

    return { success: true }
  })

  createWindow()

  app.on('activate', function () {
    // 在macOS上，当出现以下情况时，通常会在应用程序中重新创建窗口
    // 单击dock图标后，没有其他打开的窗口。icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// 关闭所有窗口后退出，macOS除外。在那里，这很常见
// 让应用程序及其菜单栏保持活动状态，直到用户退出
// 显式使用Cmd+Q。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 在此文件中，您可以包含应用程序的其他特定主进程
// 代码。您也可以将它们放在单独的文件中，并在此处要求它们。
