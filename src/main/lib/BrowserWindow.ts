import { BrowserWindow } from 'electron'

export const closeFocusedWindow = (): void => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) window.close()
}

export const minimizeFocusedWindow = (): void => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) window.minimize()
}

export const maximizeFocusedWindow = (): void => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) window.maximize()
}

export const toggleMaximizeFocusedWindow = (): void => {
  const window = BrowserWindow.getFocusedWindow()
  if (window) {
    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  }
}

export const isWindowMaximized = (): boolean => {
  const window = BrowserWindow.getFocusedWindow()
  return window ? window.isMaximized() : false
}
