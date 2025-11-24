export class ElectronService {
  static closeFocusedWindow(): void {
    window.electron.closeFocusedWindow()
  }

  static minimizeFocusedWindow(): void {
    window.electron.minimizeFocusedWindow()
  }

  static maximizeFocusedWindow(): void {
    window.electron.maximizeFocusedWindow()
  }

  static toggleMaximizeFocusedWindow(): void {
    window.electron.toggleMaximizeFocusedWindow()
  }

  static async isWindowMaximized(): Promise<boolean> {
    return window.electron.isWindowMaximized()
  }

  static onWindowMaximizeChanged(callback: (isMaximized: boolean) => void): () => void {
    return window.electron.onWindowMaximizeChanged(callback)
  }

  static async openFileDialog(): Promise<string[]> {
    return window.electron.openFileDialog()
  }

  static async openWithChooser(localPath: string): Promise<void> {
    return window.electron.openWithChooser(localPath)
  }

  static async deleteEditCacheFile(localPath: string): Promise<void> {
    return window.electron.deleteEditCacheFile(localPath)
  }
}
