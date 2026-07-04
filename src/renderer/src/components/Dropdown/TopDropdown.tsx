import type { ComponentProps } from 'react'
import { useRef } from 'react'
import { twMerge } from 'tailwind-merge'

export const TopDropdown: React.FC<ComponentProps<'ul'>> = ({ children, className, ...props }) => {
  const dropdownRef = useRef<HTMLUListElement>(null)

  const handleClick = (event: React.MouseEvent): void => {
    // 检查点击的是否是子元素（不是 ul 本身）
    if (event.target !== event.currentTarget) {
      // 关闭 popover
      dropdownRef.current?.hidePopover()
    }
  }

  return (
    <ul
      ref={dropdownRef}
      className={twMerge(
        'w-50 dropdown',
        'bg-[var(--color-bg-elevated)] shadow-[var(--shadow-md)] rounded-[var(--radius-lg)] border border-[var(--color-border-primary)]',
        className
      )}
      popover="auto"
      onClick={handleClick}
      {...props}
    >
      <li className="flex flex-col p-1.5">{children}</li>
    </ul>
  )
}
