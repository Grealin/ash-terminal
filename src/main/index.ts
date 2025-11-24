import { initConfigStore, initSessionStore } from '@/lib'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import {
  WINDOW_INITIAL_HEIGHT,
  WINDOW_INITIAL_WIDTH,
  WINDOW_MIN_HEIGHT,
  WINDOW_MIN_WIDTH
} from '@shared/constants'
import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerIpcHandlers } from './ipc'

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

  // 注册所有 IPC 监听器
  registerIpcHandlers()

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
