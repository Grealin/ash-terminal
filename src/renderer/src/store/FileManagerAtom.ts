import { atom } from 'jotai'

// 文件管理器：当前（将要上传的）目标目录，由触发上传的地方设置
export const uploadTargetDirAtom = atom<string>('~')

// 文件列表刷新信号：每次自增触发 FileList 重新加载
export const fileListRefreshTokenAtom = atom<number>(0)

// 刷新时用于指定路径（可选）；触发刷新前设置
export const fileListRefreshPathAtom = atom<string | null>(null)
