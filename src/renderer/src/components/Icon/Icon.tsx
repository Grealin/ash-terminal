import { twMerge } from 'tailwind-merge'
import { customIconMap, type CustomIconName } from './custom-icon-map'
import { iconMap, type LucideIconName } from './icon-map'

export type IconName = LucideIconName | CustomIconName

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface IconProps {
  /** 图标名称，使用 kebab-case */
  name: IconName
  /** 预设尺寸，默认 'md'（20px） */
  size?: IconSize
  /** 额外样式类（用于颜色、间距、动画等） */
  className?: string
  /** 描边宽度，默认 2（仅对 stroke 图标生效） */
  strokeWidth?: number
  /** 无障碍标签；有值则渲染 aria-label，否则 aria-hidden="true" */
  'aria-label'?: string
}

const sizeToClass: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-12 h-12'
}

/**
 * 统一的图标组件。
 * 优先从 Lucide 图标库查找，未找到则回退到自定义 SVG 图标。
 * 颜色由父元素的 `text-*` 类控制，组件不干预颜色语义。
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  className,
  strokeWidth,
  'aria-label': ariaLabel
}) => {
  const mergedClass = twMerge(sizeToClass[size], 'shrink-0', className)

  // Lucide 图标
  const LucideComponent = iconMap[name as LucideIconName]
  if (LucideComponent) {
    return (
      <LucideComponent
        className={mergedClass}
        strokeWidth={strokeWidth}
        aria-label={ariaLabel}
        aria-hidden={!ariaLabel}
      />
    )
  }

  // 自定义 SVG 图标
  const CustomComponent = customIconMap[name as CustomIconName]
  if (CustomComponent) {
    return (
      <CustomComponent className={mergedClass} strokeWidth={strokeWidth} aria-label={ariaLabel} />
    )
  }

  return null
}
