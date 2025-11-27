import { getSystemMonitorData } from '@/lib'
import { GetSystemMonitorData } from '@shared/types/SSH'
import { ipcMain } from 'electron'

export function registerMonitorHandlers(): void {
  ipcMain.handle('getSystemMonitorData', (_, ...args: Parameters<GetSystemMonitorData>) =>
    getSystemMonitorData(...args)
  )
}
