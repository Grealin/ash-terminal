import {
  createInteractiveShell,
  onShellClose,
  onShellData,
  onShellError,
  resizeShell,
  trackSubscription,
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

    // 集中式清理注册 — 同一 channel+sessionId 重新注册时会自动替换旧的
    trackSubscription('onShellData', sessionId, event.sender, cleanup)

    return { success: true }
  })

  ipcMain.handle('onShellClose', (event, sessionId: string) => {
    const cleanup = onShellClose(sessionId, () => {
      event.sender.send('shell-close', sessionId)
    })

    trackSubscription('onShellClose', sessionId, event.sender, cleanup)

    return { success: true }
  })

  ipcMain.handle('onShellError', (event, sessionId: string) => {
    const cleanup = onShellError(sessionId, (error: Error) => {
      event.sender.send('shell-error', sessionId, error.message)
    })

    trackSubscription('onShellError', sessionId, event.sender, cleanup)

    return { success: true }
  })
}
