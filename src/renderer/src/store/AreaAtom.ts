import { AreaShowState } from '@shared/models'
import { atom } from 'jotai'

// 左侧边栏显示状态
export const leftSideBarVisibleAtom = atom<AreaShowState>(true)

// 右侧边栏显示状态
export const rightSideBarVisibleAtom = atom<AreaShowState>(true)

// 功能组件显示状态
// 左侧栏功能组件
export const aiInterfaceVisibleAtom = atom<AreaShowState>(true)

// 右侧栏功能组件
export const sessionListVisibleAtom = atom<AreaShowState>(true)
export const fileListVisibleAtom = atom<AreaShowState>(true)
export const monitorListVisibleAtom = atom<AreaShowState>(true)

// 中央区域功能组件
export const commandListVisibleAtom = atom<AreaShowState>(true)
