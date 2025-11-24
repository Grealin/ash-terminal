import {
  createInteractiveShell,
  onShellClose,
  onShellData,
  onShellError,
  resizeShell,
  writeToShell
} from '@/lib'
import { CreateInteractiveShell, ResizeShell, WriteToShell } from '@shared/types/SSH'
import { ipcMain } from 'electron'

export function registerShellHandlers(): void {
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
}
