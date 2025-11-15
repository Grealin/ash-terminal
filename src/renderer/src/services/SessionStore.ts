import { SSHConfig, TerminalSession } from '@shared/models'
import { atom } from 'jotai'

// SSH 连接状态类型
export type SSHConnectionStatus = 'disconnected' | 'connecting' | 'connected'

// 会话列表状态
export const sessionsAtom = atom<SSHConfig[]>([])

// 活动终端会话状态
export const activeTerminalSessionsAtom = atom<TerminalSession[]>([])

// 当前选中的会话ID
export const currentSessionIdAtom = atom<string | null>(null)

// SSH 连接状态
export const sshConnectionStatusAtom = atom<SSHConnectionStatus>('disconnected')
