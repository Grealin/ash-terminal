import { AppConfig } from '@shared/models'

interface Electron {
  closeFocusedWindow: () => void
  minimizeFocusedWindow: () => void
  maximizeFocusedWindow: () => void
  toggleMaximizeFocusedWindow: () => void
  isWindowMaximized: () => Promise<boolean>
  onWindowMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void
}

interface Context {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<void>
  updateConfigField: (path: string, value: any) => Promise<void>
}

declare global {
  interface Window {
    electron: Electron
    context: Context
  }
}

export {}
