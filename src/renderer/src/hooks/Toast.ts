import type { ToastPosition, ToastType } from '@/components/Toast/GeneralToast'
import {
    addToastAtom,
    clearToastAtom,
    dismissToastAtom,
    setToastMaxPerPositionAtom,
    ToastShowOptions,
    updateToastAtom
} from '@/store'
import { useSetAtom } from 'jotai'
import { useCallback } from 'react'

export interface UseToastApi {
    show: (opts: ToastShowOptions) => string
    simple: (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'message'>) => string
    success: (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) => string
    info: (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) => string
    warning: (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) => string
    error: (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) => string
    dismiss: (id?: string, position?: ToastPosition) => void
    clear: (position?: ToastPosition) => void
    update: (id: string, patch: Partial<Omit<ToastShowOptions, 'position'>>) => void
    setMax: (n: number) => void
}

function kindFactory(
    showImpl: (opts: ToastShowOptions) => string,
    type: ToastType,
    message: React.ReactNode,
    opts?: Omit<ToastShowOptions, 'type' | 'message'>
) {
    return showImpl({ ...(opts || {}), type, message })
}

export const useToast = (): UseToastApi => {
    const add = useSetAtom(addToastAtom)
    const dismissSet = useSetAtom(dismissToastAtom)
    const clearSet = useSetAtom(clearToastAtom)
    const updateSet = useSetAtom(updateToastAtom)
    const setMax = useSetAtom(setToastMaxPerPositionAtom)

    const show = useCallback((opts: ToastShowOptions) => add(opts), [add])
    const simple = useCallback(
        (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'message'>) =>
            show({ ...(opts || {}), message, title: undefined, size: 'wf', position: opts?.position || 'top-center' }),
        [show]
    )
    const success = useCallback(
        (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) =>
            kindFactory(show, 'success', message, opts),
        [show]
    )
    const info = useCallback(
        (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) =>
            kindFactory(show, 'info', message, opts),
        [show]
    )
    const warning = useCallback(
        (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) =>
            kindFactory(show, 'warning', message, opts),
        [show]
    )
    const error = useCallback(
        (message: React.ReactNode, opts?: Omit<ToastShowOptions, 'type' | 'message'>) =>
            kindFactory(show, 'error', message, opts),
        [show]
    )
    const dismiss = useCallback(
        (id?: string, position?: ToastPosition) => dismissSet({ id, position }),
        [dismissSet]
    )
    const clear = useCallback((position?: ToastPosition) => clearSet(position), [clearSet])
    const update = useCallback(
        (id: string, patch: Partial<Omit<ToastShowOptions, 'position'>>) =>
            updateSet({ id, patch }),
        [updateSet]
    )

    return { show, simple, success, info, warning, error, dismiss, clear, update, setMax }
}

export default useToast
