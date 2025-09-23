import type { SSHConfig } from '@shared/models'
import { atom } from 'jotai'

export const isModalThemeOpenAtom = atom<boolean>(false)
export const isModalLayoutOpenAtom = atom<boolean>(false)
export const isModalToolOpenAtom = atom<boolean>(false)
export const isModalSessionOpenAtom = atom<boolean>(false)
export const editingSessionAtom = atom<SSHConfig | null>(null)
