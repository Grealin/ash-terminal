import { registerAiConfigHandlers } from './aiConfig'
import { registerConfigHandlers } from './config'
import { registerDialogHandlers } from './dialog'
import { registerFileHandlers } from './file'
import { registerMonitorHandlers } from './monitor'
import { registerSessionHandlers } from './session'
import { registerShellHandlers } from './shell'
import { registerWindowHandlers } from './window'

export function registerIpcHandlers(): void {
  registerWindowHandlers()
  registerConfigHandlers()
  registerSessionHandlers()
  registerFileHandlers()
  registerShellHandlers()
  registerDialogHandlers()
  registerMonitorHandlers()
  registerAiConfigHandlers()
}
