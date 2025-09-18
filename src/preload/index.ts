import { AppConfig } from '@shared/models'
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
  saveConfig: (config: AppConfig): Promise<void> => ipcRenderer.invoke('saveConfig', config)
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
} catch (error) {
  console.error(error)
}
