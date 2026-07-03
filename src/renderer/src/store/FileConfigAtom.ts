import { atom } from 'jotai'

// 文件管理备份配置原子（与 config.json 中 file.backupOnAiModify / file.backupOnManualEdit 同步）
export const backupOnAiModifyAtom = atom<boolean>(true)
export const backupOnManualEditAtom = atom<boolean>(true)
