import {
  connectSSH,
  deleteSession,
  disconnectSSH,
  executeSSHCommand,
  getDirectoryFiles,
  getSessions,
  saveSession
} from '@/lib'
import {
  ConnectSSH,
  DeleteSession,
  DisconnectSSH,
  ExecuteSSHCommand,
  GetDirectoryFiles,
  GetSessions,
  SaveSession
} from '@shared/types/SSH'
import { ipcMain } from 'electron'

export function registerSessionHandlers(): void {
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
}
