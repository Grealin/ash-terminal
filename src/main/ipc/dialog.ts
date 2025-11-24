import { openFileDialog } from '@/lib'
import { ipcMain } from 'electron'

export type OpenFileDialog = () => Promise<string[]>

export function registerDialogHandlers(): void {
  ipcMain.handle('openFileDialog', async (_event, ...args: Parameters<OpenFileDialog>) =>
    openFileDialog(...args)
  )
}
