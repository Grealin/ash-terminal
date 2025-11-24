import { getConfig, saveConfig, updateConfigField } from '@/lib'
import { AppConfig } from '@shared/models'
import { GetConfig, SaveConfig, UpdateConfigField } from '@shared/types/Context'
import { ipcMain } from 'electron'

export function registerConfigHandlers(): void {
  ipcMain.handle('getConfig', (_, ...args: Parameters<GetConfig>): AppConfig => getConfig(...args))
  ipcMain.handle('saveConfig', (_, ...args: Parameters<SaveConfig>): void => saveConfig(...args))
  ipcMain.handle('updateConfigField', (_, ...args: Parameters<UpdateConfigField>): void =>
    updateConfigField(...args)
  )
}
