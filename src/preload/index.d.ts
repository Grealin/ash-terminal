interface Electron {
  closeFocusedWindow: () => void
  minimizeFocusedWindow: () => void
  maximizeFocusedWindow: () => void
  toggleMaximizeFocusedWindow: () => void
  isWindowMaximized: () => Promise<boolean>
  onWindowMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void
}

interface Context {
  // TODO
}

declare global {
  interface Window {
    electron: Electron
    context: Context
  }
}

export { }

