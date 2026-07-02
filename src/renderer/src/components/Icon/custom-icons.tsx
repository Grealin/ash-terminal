import { twMerge } from 'tailwind-merge'

interface CustomIconProps {
  className?: string
  strokeWidth?: number
  'aria-label'?: string
}

/**
 * 窗口恢复图标 — 两个重叠的矩形，近似 Windows 标准的"还原"按钮。
 * Lucide 中没有完全对应的图标，使用自定义 SVG 补齐。
 */
export const WindowRestore: React.FC<CustomIconProps> = ({
  className,
  strokeWidth = 2,
  'aria-label': ariaLabel
}) => (
  <svg
    className={twMerge('shrink-0', className)}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label={ariaLabel}
    aria-hidden={!ariaLabel}
  >
    {/* 后方窗口（右下角露出） */}
    <rect x="7" y="8" width="12" height="10" rx="2" />
    {/* 前方窗口（左上角为主） */}
    <rect x="5" y="5" width="12" height="10" rx="2" />
  </svg>
)
