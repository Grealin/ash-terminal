import { WindowRestore } from './custom-icons'

export const customIconMap = {
  'window-restore': WindowRestore
} as const

export type CustomIconName = keyof typeof customIconMap
