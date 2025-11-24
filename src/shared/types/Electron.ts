export type CloseFocusedWindow = () => void
export type MinimizeFocusedWindow = () => void
export type MaximizeFocusedWindow = () => void
export type ToggleMaximizeFocusedWindow = () => void
export type IsWindowMaximized = () => Promise<boolean>
export type OnWindowMaximizeChanged = (callback: (isMaximized: boolean) => void) => () => void
export type OpenFileDialog = () => Promise<string[]>
export type OpenWithChooser = (localPath: string) => Promise<void>
export type DeleteEditCacheFile = (localPath: string) => Promise<void>
