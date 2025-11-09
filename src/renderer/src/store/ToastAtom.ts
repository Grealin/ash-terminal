import type { GeneralToastProps, ToastPosition, ToastType } from '@/components/Toast/GeneralToast'
import { atom } from 'jotai'
import type { ReactNode } from 'react'

export type ToastId = string

export interface ToastItem
    extends Omit<
        GeneralToastProps,
        'isOpen' | 'onClose' | 'position' | 'noContainer'
    > {
    id: ToastId
    position: ToastPosition
}

export interface ToastShowOptions
    extends Partial<
        Omit<
            ToastItem,
            'id' | 'position' | 'type' | 'duration' | 'rounded' | 'showCloseButton' | 'animationDuration'
        >
    > {
    title?: ReactNode
    message?: ReactNode
    children?: ReactNode
    position?: ToastPosition
    type?: ToastType
    duration?: number
    size?: NonNullable<GeneralToastProps['size']>
    rounded?: NonNullable<GeneralToastProps['rounded']>
    showCloseButton?: boolean
    animationDuration?: number
    className?: string
}

export type ToastMap = Partial<Record<ToastPosition, ToastItem[]>>

export const toastVisibleAtom = atom<ToastMap>({})
export const toastQueueAtom = atom<ToastMap>({})

export const toastConfigAtom = atom({
    maxPerPosition: 3
})

const positions: ToastPosition[] = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'middle-center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right'
]

function genId() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function ensure(arr?: ToastItem[]): ToastItem[] {
    return Array.isArray(arr) ? arr.slice() : []
}

// 添加 Toast（根据并发上限决定入可见列表还是入队列）
export const addToastAtom = atom(null, (get, set, opts: ToastShowOptions): ToastId => {
    const id = genId()
    const {
        title,
        message,
        children,
        type = 'neutral',
        position = 'bottom-right',
        duration = 3000,
        size = 'sm',
        rounded = 'lg',
        showCloseButton = true,
        animationDuration = 200,
        icon,
        className
    } = opts ?? {}

    const item: ToastItem = {
        id,
        title,
        message,
        children,
        type,
        position,
        duration,
        size,
        rounded,
        showCloseButton,
        animationDuration,
        icon,
        className
    }

    const config = get(toastConfigAtom)
    const visible = { ...get(toastVisibleAtom) }
    const queue = { ...get(toastQueueAtom) }

    const list = ensure(visible[position])
    if (list.length < (config?.maxPerPosition ?? 6)) {
        list.push(item)
        visible[position] = list
        set(toastVisibleAtom, visible)
    } else {
        const q = ensure(queue[position])
        q.push(item)
        queue[position] = q
        set(toastQueueAtom, queue)
    }

    return id
})

// 关闭指定 id 的 toast；并从队列中补位
export const dismissToastAtom = atom(
    null,
    (
        get,
        set,
        params: { id?: ToastId; position?: ToastPosition } | undefined = undefined
    ) => {
        const visible = { ...get(toastVisibleAtom) }
        const queue = { ...get(toastQueueAtom) }

        const doCloseAt = (pos: ToastPosition, id?: ToastId) => {
            const list = ensure(visible[pos])
            if (id) {
                const idx = list.findIndex((t) => t.id === id)
                if (idx >= 0) list.splice(idx, 1)
            } else {
                list.length = 0
            }

            // 补位
            const q = ensure(queue[pos])
            while (q.length > 0 && list.length < (get(toastConfigAtom).maxPerPosition ?? 6)) {
                const next = q.shift()!
                list.push(next)
            }
            visible[pos] = list
            queue[pos] = q
        }

        if (!params || (!params.id && !params.position)) {
            // 清空所有位置
            positions.forEach((p) => doCloseAt(p))
        } else if (params.position && !params.id) {
            doCloseAt(params.position)
        } else if (params.id && params.position) {
            doCloseAt(params.position, params.id)
        } else if (params.id && !params.position) {
            // 未指定位置则在所有位置中查找并关闭
            positions.forEach((p) => {
                const list = ensure(visible[p])
                if (list.some((t) => t.id === params.id)) doCloseAt(p, params.id)
            })
        }

        set(toastVisibleAtom, visible)
        set(toastQueueAtom, queue)
    }
)

export const clearToastAtom = atom(null, (get, set, position?: ToastPosition) => {
    const visible = { ...get(toastVisibleAtom) }
    const queue = { ...get(toastQueueAtom) }
    const clearAt = (p: ToastPosition) => {
        visible[p] = []
        queue[p] = []
    }

    if (!position) {
        positions.forEach(clearAt)
    } else {
        clearAt(position)
    }

    set(toastVisibleAtom, visible)
    set(toastQueueAtom, queue)
})

export const updateToastAtom = atom(
    null,
    (
        get,
        set,
        payload: { id: ToastId; patch: Partial<Omit<ToastItem, 'id' | 'position'>> }
    ) => {
        const { id, patch } = payload
        const visible = { ...get(toastVisibleAtom) }
        let changed = false
            ; (Object.keys(visible) as ToastPosition[]).forEach((p) => {
                const list = ensure(visible[p])
                const idx = list.findIndex((t) => t.id === id)
                if (idx >= 0) {
                    list[idx] = { ...list[idx], ...patch }
                    visible[p] = list
                    changed = true
                }
            })
        if (changed) set(toastVisibleAtom, visible)
    }
)

export const setToastMaxPerPositionAtom = atom(null, (get, set, n: number) => {
    const cfg = get(toastConfigAtom)
    set(toastConfigAtom, { ...cfg, maxPerPosition: Math.max(1, Math.floor(n || 1)) })
})
