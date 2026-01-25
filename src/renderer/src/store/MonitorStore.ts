import { atom } from 'jotai'

// 监控刷新间隔（毫秒），默认3000，最小值3000
export const monitorRefreshIntervalAtom = atom<number>(3000)
