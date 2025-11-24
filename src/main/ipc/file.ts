import {
  backupRemoteFile,
  deleteEditCacheFile,
  deleteRemoteFile,
  downloadFile,
  downloadFileToEditCache,
  openWithChooser,
  uploadFile
} from '@/lib'
import { DeleteEditCacheFile, OpenWithChooser } from '@shared/types/Electron'
import {
  BackupRemoteFile,
  DeleteRemoteFile,
  DownloadFile,
  DownloadFileToEditCache,
  UploadFile
} from '@shared/types/SSH'
import { ipcMain } from 'electron'

export function registerFileHandlers(): void {
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
}
