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
  sm: 'w-64',
  md: 'w-80',
  lg: 'w-96',
  xl: 'w-[28rem]',
  wf: 'w-full'
}

const roundedToClass: Record<NonNullable<GeneralToastProps['rounded']>, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl'
}

const typeToAlert: Record<ToastType, string> = {
  neutral: 'alert',
  info: 'alert alert-info',
  success: 'alert alert-success',
  warning: 'alert alert-warning',
  error: 'alert alert-error'
}

function DefaultIcon({ type }: { type: ToastType }): React.ReactElement {
  // 轻量内置图标，避免额外依赖
  switch (type) {
    case 'success':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-2.59a.75.75 0 1 0-1.22-.86l-3.47 4.92-1.59-1.59a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.17-.09l3.92-5.64Z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'warning':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M10.36 2.58a1.875 1.875 0 0 1 3.28 0l8.16 14.67c.72 1.29-.2 2.9-1.64 2.9H3.84c-1.44 0-2.36-1.61-1.64-2.9L10.36 2.58ZM12 8.25a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0V9a.75.75 0 0 0-.75-.75Zm0 8.25a.94.94 0 1 0 0 1.88.94.94 0 0 0 0-1.88Z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'error':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25Zm3.53 6.22a.75.75 0 1 0-1.06-1.06L12 9.88 9.53 7.41a.75.75 0 1 0-1.06 1.06L10.94 11l-2.47 2.47a.75.75 0 1 0 1.06 1.06L12 12.06l2.47 2.47a.75.75 0 1 0 1.06-1.06L13.06 11l2.47-2.47Z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'info':
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M11.25 9a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" />
          <path
            fillRule="evenodd"
            d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25ZM9.75 10.5A.75.75 0 0 1 10.5 9.75h3a.75.75 0 0 1 0 1.5h-.75V15h.75a.75.75 0 0 1 0 1.5h-3A.75.75 0 0 1 10.5 15h.75v-3h-.75a.75.75 0 0 1-.75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      )
    default:
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path
            fillRule="evenodd"
            d="M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25Zm0 5.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM9.75 12a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H13.5v3h1.5a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1 0-1.5h.75v-3H10.5A.75.75 0 0 1 9.75 12Z"
            clipRule="evenodd"
          />
        </svg>
      )
  }
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
  }, [isOpen, duration])

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
  const alertClass = typeToAlert[type]

  if (!rendered) return null

  const AlertContent = (
    <div
      role="alert"
      className={twMerge(
        alertClass,
        widthClass,
        roundedClass,
        'backdrop-blur-sm shadow-xl border border-slate-200/60 dark:border-slate-700/60',
        'bg-white/95 dark:bg-slate-900/95 text-slate-800 dark:text-slate-200',
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
            <div className="space-y-0.5">
              {title && (
                <div className="font-semibold leading-6 truncate text-slate-900 dark:text-slate-100">
                  {title}
                </div>
              )}
              {message && (
                <div className="text-sm leading-6 text-slate-700 dark:text-slate-300 break-words">
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
              'dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
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
