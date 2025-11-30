import { atom } from 'jotai'

// 批量命令执行状态
export type BatchCommandStatus = 'idle' | 'running' | 'paused'

// 批量命令状态
export const batchCommandTextAtom = atom<string>('') // 命令文本（每行一个命令）
export const batchCommandIntervalAtom = atom<number>(1) // 间隔时间（秒）
export const batchCommandStatusAtom = atom<BatchCommandStatus>('idle') // 执行状态
export const batchCommandCurrentIndexAtom = atom<number>(0) // 当前执行到的命令索引
