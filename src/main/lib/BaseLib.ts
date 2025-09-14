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
