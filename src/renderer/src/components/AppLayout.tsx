import { Icon } from '@/components/Icon'
import { Splitter } from '@/components/Splitter'
import { useInitializeConfig, useLeftSideBar, useRightSideBar } from '@/hooks'
import { useAccentColor } from '@/hooks/useAccentColor'
import { useSplitter } from '@/hooks/useSplitter'
import { darkStateAtom } from '@/store'
import { useAtomValue } from 'jotai'
import { type ComponentProps, useState } from 'react'
import { twMerge } from 'tailwind-merge'

// ===== RootLayout =====
export const RootLayout: React.FC<ComponentProps<'main'>> = ({ children, className, ...props }) => {
  const { loading } = useInitializeConfig()
  const isDark = useAtomValue(darkStateAtom)
  useAccentColor() // 应用强调色到全局 CSS 变量

  if (loading) {
    return (
      <main
        className={twMerge(
          'flex h-screen flex-col m-0 p-0 overflow-hidden bg-[var(--color-bg-primary)]',
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-center h-full">
          <Icon
            name="loader-2"
            size="xl"
            className="animate-spin text-[var(--color-text-tertiary)]"
          />
        </div>
      </main>
    )
  }

  return (
    <main
      className={twMerge(
        'flex h-screen flex-col m-0 p-0 overflow-hidden bg-[var(--color-bg-primary)]',
        isDark && 'dark',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}

// ===== MainContent (三栏 + 可拖拽分隔条) =====
export const MainContent: React.FC<ComponentProps<'div'>> = ({ children, className, ...props }) => {
  const { visible: leftVisible } = useLeftSideBar()
  const { visible: rightVisible } = useRightSideBar()

  const [leftWidth, setLeftWidth] = useState(320)
  const [rightWidth, setRightWidth] = useState(320)

  const leftSplitter = useSplitter({
    direction: 'horizontal',
    minSize: 240,
    maxSize: 480,
    currentSize: leftWidth,
    onResize: setLeftWidth,
    defaultSize: 320
  })

  const rightSplitter = useSplitter({
    direction: 'horizontal',
    minSize: 240,
    maxSize: 480,
    currentSize: rightWidth,
    onResize: setRightWidth,
    defaultSize: 320
  })

  const childArray = Array.isArray(children) ? children : [children]

  return (
    <div className={twMerge('flex flex-row flex-1 min-h-0 overflow-hidden', className)} {...props}>
      {leftVisible && (
        <>
          <div
            className="flex flex-col h-full shrink-0 overflow-hidden border-r border-[var(--color-border-primary)]"
            style={{ width: leftWidth + 'px' }}
          >
            {childArray[0]}
          </div>
          <Splitter {...leftSplitter} />
        </>
      )}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">{childArray[1]}</div>
      {rightVisible && (
        <>
          <Splitter {...rightSplitter} />
          <div
            className="flex flex-col h-full shrink-0 overflow-hidden border-l border-[var(--color-border-primary)]"
            style={{ width: rightWidth + 'px' }}
          >
            {childArray[2]}
          </div>
        </>
      )}
    </div>
  )
}

// ===== 子布局容器 =====
export const LeftSideBar: React.FC<ComponentProps<'div'>> = ({ children, className, ...props }) => (
  <div className={twMerge('flex flex-col h-full overflow-hidden', className)} {...props}>
    {children}
  </div>
)

export const CentralBar: React.FC<ComponentProps<'div'>> = ({ children, className, ...props }) => (
  <div
    className={twMerge('flex flex-col flex-1 h-full min-h-0 overflow-hidden', className)}
    {...props}
  >
    {children}
  </div>
)

export const RightSideBar: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => (
  <div className={twMerge('flex flex-col h-full min-h-0 overflow-hidden', className)} {...props}>
    {children}
  </div>
)
