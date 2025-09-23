import { AppConfig, SSHConfig } from '@shared/models'
import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

const electron = {
  closeFocusedWindow: () => ipcRenderer.invoke('closeFocusedWindow'),
  minimizeFocusedWindow: () => ipcRenderer.invoke('minimizeFocusedWindow'),
  maximizeFocusedWindow: () => ipcRenderer.invoke('maximizeFocusedWindow'),
  toggleMaximizeFocusedWindow: () => ipcRenderer.invoke('toggleMaximizeFocusedWindow'),
  isWindowMaximized: () => ipcRenderer.invoke('isWindowMaximized'),
  onWindowMaximizeChanged: (callback: (isMaximized: boolean) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, isMaximized: boolean) =>
      callback(isMaximized)
    ipcRenderer.on('window-maximize-changed', subscription)
    return () => ipcRenderer.removeListener('window-maximize-changed', subscription)
  }
}

const context = {
  getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('getConfig'),
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('saveConfig', config),
  updateConfigField: (path: string, value: any): Promise<void> =>
    ipcRenderer.invoke('updateConfigField', path, value)
}

const ssh = {
  getSessions: () => ipcRenderer.invoke('getSessions'),
  saveSession: (session: SSHConfig) => ipcRenderer.invoke('saveSession', session),
  deleteSession: (sessionId: string) => ipcRenderer.invoke('deleteSession', sessionId),
  connectSSH: (config: SSHConfig) => ipcRenderer.invoke('connectSSH', config),
  disconnectSSH: (sessionId: string) => ipcRenderer.invoke('disconnectSSH', sessionId),
  executeSSHCommand: (sessionId: string, command: string) =>
    ipcRenderer.invoke('executeSSHCommand', sessionId, command),
  getDirectoryFiles: (sessionId: string, path: string) =>
    ipcRenderer.invoke('getDirectoryFiles', sessionId, path)
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
  contextBridge.exposeInMainWorld('ssh', ssh)
} catch (error) {
  console.error(error)
}
