import { Icon } from '@/components/Icon'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export type ToastType = 'neutral' | 'info' | 'success' | 'warning' | 'error'
export type ToastPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'middle-center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface GeneralToastProps {
  /** 是否显示 */
  isOpen: boolean
  /** 关闭回调（动画结束后触发） */
  onClose: () => void

  /** 标题（可选） */
  title?: React.ReactNode
  /** 文本或自定义内容 */
  message?: React.ReactNode
  /** 自定义内容（优先级高于 title/message 区域） */
  children?: React.ReactNode

  /** 风格类型，映射到 daisyUI alert-* */
  type?: ToastType
  /** 位置（默认右下角） */
  position?: ToastPosition
  /** 尺寸（控制宽度） */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'wf'
  /** 边角圆润程度 */
  rounded?: 'sm' | 'md' | 'lg' | 'xl'

  /** 自动关闭时长（ms）。0 或 undefined 表示不自动关闭 */
  duration?: number
  /** 是否展示关闭按钮 */
  showCloseButton?: boolean

  /** 入/出场动画时长（ms） */
  animationDuration?: number

  /** 自定义图标 */
  icon?: React.ReactNode
  /** 自定义类 */
  className?: string
  /** 在全局堆叠容器中使用时不再创建独立 position 容器 */
  noContainer?: boolean
}

const positionToClasses: Record<ToastPosition, string> = {
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

const sizeToWidth: Record<NonNullable<GeneralToastProps['size']>, string> = {
  sm: 'w-80',
  md: 'w-[26rem]',
  lg: 'w-[32rem]',
  xl: 'w-[38rem]',
  wf: 'w-full'
}

const roundedToClass: Record<NonNullable<GeneralToastProps['rounded']>, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl'
}

const typeToBorderColor: Record<ToastType, string> = {
  neutral: 'border-l-[var(--color-text-tertiary)]',
  info: 'border-l-[var(--color-info)]',
  success: 'border-l-[var(--color-success)]',
  warning: 'border-l-[var(--color-warning)]',
  error: 'border-l-[var(--color-error)]'
}

const toastTypeToIcon: Record<ToastType, string> = {
  success: 'check-circle',
  warning: 'alert-triangle',
  error: 'x-circle',
  info: 'info',
  neutral: 'info'
}

function DefaultIcon({ type }: { type: ToastType }): React.ReactElement {
  return <Icon name={toastTypeToIcon[type]} size="md" />
}

export const GeneralToast: React.FC<GeneralToastProps> = ({
  isOpen,
  onClose,
  title,
  message,
  children,
  type = 'neutral',
  position = 'bottom-right',
  size = 'md',
  rounded = 'lg',
  duration = 3000,
  showCloseButton = true,
  animationDuration = 200,
  icon,
  className,
  noContainer = false
}) => {
  const [rendered, setRendered] = useState(isOpen)
  const [exiting, setExiting] = useState(false)
  const autoCloseTimer = useRef<number | null>(null)
  const enterTimer = useRef<number | null>(null)

  // 关闭逻辑（需在任何 early return 之前定义，供 effect 使用）
  const handleClose = useCallback(() => {
    setExiting(true)
    window.setTimeout(() => onClose?.(), animationDuration)
  }, [onClose, animationDuration])

  // 处理挂载/卸载，保证淡出动画生效
  useEffect(() => {
    let cleanup: (() => void) | undefined
    if (isOpen) {
      setRendered(true)
      setExiting(false)
      // 入场动画等待下一帧再开始（借助类名过渡）
      if (enterTimer.current) window.clearTimeout(enterTimer.current)
      enterTimer.current = window.setTimeout(() => {
        // no-op 只为触发渲染周期
      }, 0)
    } else if (rendered) {
      setExiting(true)
      const t = window.setTimeout(() => setRendered(false), animationDuration)
      cleanup = () => window.clearTimeout(t)
    }
    return cleanup
  }, [isOpen, animationDuration, rendered])

  // 自动关闭
  useEffect(() => {
    let cleanup: (() => void) | undefined
    if (!isOpen || !duration) {
      cleanup = undefined
    } else {
      if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current)
      autoCloseTimer.current = window.setTimeout(() => handleClose(), duration)
      cleanup = () => {
        if (autoCloseTimer.current) window.clearTimeout(autoCloseTimer.current)
      }
    }
    return cleanup
  }, [isOpen, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  const isTop = useMemo(
    () => position.startsWith('top') || position.startsWith('middle'),
    [position]
  )

  const transitionClass = useMemo(
    () =>
      twMerge(
        'transition-all duration-200 will-change-transform will-change-opacity',
        exiting
          ? isTop
            ? 'opacity-0 -translate-y-2 scale-95'
            : 'opacity-0 translate-y-2 scale-95'
          : 'opacity-100 translate-y-0 scale-100'
      ),
    [exiting, isTop]
  )

  const containerClasses = positionToClasses[position]
  const widthClass = sizeToWidth[size]
  const roundedClass = roundedToClass[rounded]
  const borderColorClass = typeToBorderColor[type]

  if (!rendered) return null

  const AlertContent = (
    <div
      className={twMerge(
        widthClass,
        roundedClass,
        'shadow-[var(--shadow-md)] border border-[var(--color-border-primary)] border-l-[3px]',
        borderColorClass,
        'bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)]',
        'can-select p-3',
        transitionClass,
        className
      )}
      style={{ transitionDuration: `${animationDuration}ms`, gap: 0 }}
    >
      {/* 内容布局：图标 + 文本 + 关闭 */}
      <div className="flex items-start gap-3 w-full">
        <div className="mt-0.5 shrink-0 text-current opacity-80">
          {icon ?? <DefaultIcon type={type} />}
        </div>

        <div className="flex-1 min-w-0">
          {children ? (
            children
          ) : (
            <div className="space-y-1">
              {title && (
                <div className="font-semibold leading-6 truncate text-[var(--color-text-primary)]">
                  {title}
                </div>
              )}
              {message && (
                <div className="text-sm leading-6 text-[var(--color-text-secondary)] break-words">
                  {message}
                </div>
              )}
            </div>
          )}
        </div>

        {showCloseButton && (
          <button
            aria-label="关闭"
            onClick={handleClose}
            className={twMerge(
              'btn btn-ghost btn-xs text-slate-500 hover:text-slate-700',
              'dark:text-[var(--color-text-tertiary)] dark:hover:text-slate-200'
            )}
          >
            <Icon name="x" size="sm" />
          </button>
        )}
      </div>
    </div>
  )

  if (noContainer) {
    return AlertContent
  }

  return <div className={twMerge(containerClasses, 'z-[60] p-4 md:p-6')}>{AlertContent}</div>
}

export default GeneralToast
