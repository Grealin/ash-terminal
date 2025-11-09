import React from 'react'
import { GeneralToast, GeneralToastProps } from './GeneralToast'

export interface SimpleToastProps
  extends Pick<
    GeneralToastProps,
    | 'isOpen'
    | 'onClose'
    | 'type'
    | 'duration'
    | 'showCloseButton'
    | 'animationDuration'
    | 'icon'
    | 'className'
    | 'rounded'
  > {
  message?: React.ReactNode
  position?: GeneralToastProps['position']
  children?: React.ReactNode
}

/**
 * 一个基于 GeneralToast 的极简封装：
 * - 无标题区域
 * - 仅展示 message（或自定义 children）
 * - 默认位置为 top-center
 */
export const SimpleToast: React.FC<SimpleToastProps> = ({
  isOpen,
  onClose,
  message,
  children,
  type = 'neutral',
  position = 'top-center',
  rounded = 'lg',
  duration = 3000,
  showCloseButton = true,
  animationDuration = 200,
  icon,
  className
}) => {
  return (
    <GeneralToast
      isOpen={isOpen}
      onClose={onClose}
      type={type}
      position={position}
      size={'wf'}
      rounded={rounded}
      duration={duration}
      showCloseButton={showCloseButton}
      animationDuration={animationDuration}
      icon={icon}
      className={className}
    >
      {/* 只渲染消息内容，无标题 */}
      {children ?? (
        <div className="text-sm leading-6 text-slate-700 dark:text-slate-300 break-words">
          {message}
        </div>
      )}
    </GeneralToast>
  )
}

export default SimpleToast
