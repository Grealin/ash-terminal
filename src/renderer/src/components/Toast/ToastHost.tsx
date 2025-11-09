import { dismissToastAtom, ToastItem, toastVisibleAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import React, { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import type { ToastPosition } from './GeneralToast'
import { GeneralToast } from './GeneralToast'

const positionToContainer: Record<ToastPosition, string> = {
  'top-left': 'toast toast-top toast-start',
  'top-center': 'toast toast-top toast-center',
  'top-right': 'toast toast-top toast-end',
  'middle-left': 'toast toast-middle toast-start',
  'middle-center': 'toast toast-middle toast-center',
  'middle-right': 'toast toast-middle toast-end',
  'bottom-left': 'toast toast-bottom toast-start',
  'bottom-center': 'toast toast-bottom toast-center',
  'bottom-right': 'toast toast-bottom toast-end'
}

export const ToastHost: React.FC = () => {
  const visible = useAtomValue(toastVisibleAtom)
  const dismiss = useSetAtom(dismissToastAtom)

  const handleClosed = useCallback(
    (item: ToastItem) => {
      dismiss({ id: item.id, position: item.position })
    },
    [dismiss]
  )

  return (
    <>
      {(Object.keys(visible) as ToastPosition[]).map((pos) => {
        const list = visible[pos]
        if (!list || list.length === 0) return null
        return (
          <div
            key={pos}
            className={twMerge(positionToContainer[pos], 'z-[60] p-4 md:p-6 space-y-3')}
          >
            {list.map((t) => (
              <GeneralToast
                key={t.id}
                isOpen={true}
                onClose={() => handleClosed(t)}
                title={t.title}
                message={t.message}
                children={t.children}
                type={t.type}
                position={t.position}
                size={t.size}
                rounded={t.rounded}
                duration={t.duration}
                showCloseButton={t.showCloseButton}
                animationDuration={t.animationDuration}
                icon={t.icon}
                className={t.className}
                noContainer={true}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}

export default ToastHost
