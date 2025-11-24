import {
  closeFocusedWindow,
  isWindowMaximized,
  maximizeFocusedWindow,
  minimizeFocusedWindow,
  toggleMaximizeFocusedWindow
} from '@/lib'
import {
  CloseFocusedWindow,
  IsWindowMaximized,
  MaximizeFocusedWindow,
  MinimizeFocusedWindow,
  ToggleMaximizeFocusedWindow
} from '@shared/types/Electron'
import { ipcMain } from 'electron'

export function registerWindowHandlers(): void {
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
}
