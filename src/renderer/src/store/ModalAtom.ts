import type { SSHConfig } from '@shared/models'
import { atom } from 'jotai'

export const isModalThemeOpenAtom = atom<boolean>(false)
export const isModalLayoutOpenAtom = atom<boolean>(false)
export const isModalSessionOpenAtom = atom<boolean>(false)
export const isModalTerminalSettingsOpenAtom = atom<boolean>(false)
export const isModalMonitorSettingsOpenAtom = atom<boolean>(false)
export const isModalAboutOpenAtom = atom<boolean>(false)
export const isModalShortcutOpenAtom = atom<boolean>(false)
export const editingSessionAtom = atom<SSHConfig | null>(null)

// 上传文件模态框
export const isModalUploadOpenAtom = atom<boolean>(false)

// 文件管理设置模态框
export const isModalFileSettingOpenAtom = atom<boolean>(false)
