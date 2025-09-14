import type { ComponentProps } from 'react'
import { twMerge } from 'tailwind-merge'

export const RootLayout: React.FC<ComponentProps<'main'>> = ({ children, className, ...props }) => {
  return (
    <main
      className={twMerge(
        'flex h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen overflow-auto',
        className
      )}
      {...props}
    >
      {children}
    </main>
  )
}
