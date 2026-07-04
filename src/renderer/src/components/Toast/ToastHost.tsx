import { dismissToastAtom, ToastItem, toastVisibleAtom } from '@/store'
import { useAtomValue, useSetAtom } from 'jotai'
import React, { useCallback } from 'react'
import { twMerge } from 'tailwind-merge'
import type { ToastPosition } from './GeneralToast'
import { GeneralToast } from './GeneralToast'

const positionToContainer: Record<ToastPosition, string> = {
  'top-left': 'fixed top-4 left-4',
  'top-center': 'fixed top-4 left-1/2 -translate-x-1/2',
  'top-right': 'fixed top-4 right-4',
  'middle-left': 'fixed top-1/2 -translate-y-1/2 left-4',
  'middle-center': 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
  'middle-right': 'fixed top-1/2 -translate-y-1/2 right-4',
  'bottom-left': 'fixed bottom-4 left-4',
  'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'fixed bottom-4 right-4'
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
              >
                {t.children}
              </GeneralToast>
            ))}
          </div>
        )
      })}
    </>
  )
}

export default ToastHost
