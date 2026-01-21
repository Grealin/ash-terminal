import { useAiInterface } from '@/hooks/AreaClosed'
import type { ComponentProps } from 'react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { AiChatView } from './AiChatView'
import { AiHistoryView } from './AiHistoryView'
import { AiSettingsView } from './AiSettingsView'
import { AiTopBar } from './AiTopBar'

type ViewType = 'chat' | 'history' | 'settings'

export const AiInterfaceMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useAiInterface()

  if (!visible) {
    return null
  }

  return (
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-l border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const AiAgentContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('chat')
  const [apiConfigError, setApiConfigError] = useState<string>('')

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 顶栏 */}
      <AiTopBar
        onViewChange={setCurrentView}
        currentView={currentView}
        onApiError={setApiConfigError}
      />

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className={currentView === 'chat' ? 'h-full' : 'hidden'}>
          <AiChatView
            apiConfigError={apiConfigError}
            onClearError={() => setApiConfigError('')}
            isVisible={currentView === 'chat'}
          />
        </div>
        <div className={currentView === 'history' ? 'h-full' : 'hidden'}>
          <AiHistoryView onViewChange={setCurrentView} isVisible={currentView === 'history'} />
        </div>
        <div className={currentView === 'settings' ? 'h-full' : 'hidden'}>
          <AiSettingsView />
        </div>
      </div>
    </div>
  )
}
