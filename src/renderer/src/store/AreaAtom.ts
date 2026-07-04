import { AreaShowState } from '@shared/models'
import { atom } from 'jotai'

// 左侧边栏显示状态
export const leftSideBarVisibleAtom = atom<AreaShowState>(true)

// 右侧边栏显示状态
export const rightSideBarVisibleAtom = atom<AreaShowState>(true)
