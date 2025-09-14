interface Electron {
  closeFocusedWindow: () => void
  minimizeFocusedWindow: () => void
  maximizeFocusedWindow: () => void
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

export {}
