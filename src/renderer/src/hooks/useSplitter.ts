import { useCallback, useRef } from 'react'

export interface SplitterOptions {
  direction: 'horizontal' | 'vertical'
  minSize: number
  maxSize: number
  currentSize: number
  onResize: (newSize: number) => void
  onResizeEnd?: (finalSize: number) => void
  defaultSize?: number
}

export interface SplitterHandle {
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: (e: React.MouseEvent) => void
}

export function useSplitter(options: SplitterOptions): SplitterHandle {
  const { direction, minSize, maxSize, currentSize, onResize, onResizeEnd, defaultSize } = options
  const startPosRef = useRef(0)
  const startSizeRef = useRef(0)

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY
      startSizeRef.current = currentSize

      const onMouseMove = (moveEvent: MouseEvent): void => {
        const delta =
          direction === 'horizontal'
            ? moveEvent.clientX - startPosRef.current
            : moveEvent.clientY - startPosRef.current
        const newSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta))
        onResize(newSize)
      }

      const onMouseUp = (upEvent: MouseEvent): void => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        const delta =
          direction === 'horizontal'
            ? upEvent.clientX - startPosRef.current
            : upEvent.clientY - startPosRef.current
        const finalSize = Math.min(maxSize, Math.max(minSize, startSizeRef.current + delta))
        onResizeEnd?.(finalSize)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [direction, currentSize, minSize, maxSize, onResize, onResizeEnd]
  )

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      if (defaultSize !== undefined) {
        onResize(defaultSize)
        onResizeEnd?.(defaultSize)
      }
    },
    [defaultSize, onResize, onResizeEnd]
  )

  return { onMouseDown, onDoubleClick }
}
