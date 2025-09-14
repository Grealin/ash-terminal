import { contextBridge, ipcRenderer } from 'electron'

if (!process.contextIsolated) {
  throw new Error('contextIsolation must be enabled in the BrowserWindow')
}

const electron = {
  closeFocusedWindow: () => ipcRenderer.invoke('closeFocusedWindow'),
  minimizeFocusedWindow: () => ipcRenderer.invoke('minimizeFocusedWindow'),
  maximizeFocusedWindow: () => ipcRenderer.invoke('maximizeFocusedWindow')
}

const context = {
  // TODO
}

try {
  contextBridge.exposeInMainWorld('electron', electron)
  contextBridge.exposeInMainWorld('context', context)
} catch (error) {
  console.error(error)
}
