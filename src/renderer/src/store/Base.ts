import { DarkState } from '@shared/models'
import { atom } from 'jotai'

export const darkStateAtom = atom<DarkState>()

// 主题强调色（全局共享，确保跨组件同步）
export const accentColorAtom = atom<string>('blue')
