import { AIService } from '@/services'
import { currentSessionIdAtom } from '@/store/SessionStore'
import {
  currentMessagesAtom,
  currentTaskAtom,
  currentThoughtAtom,
  isAiProcessingAtom,
  selectedTaskIdAtom,
  streamingMessageAtom
} from '@/store/TaskStore'
import { Task } from '@shared/models/Task'
import { useAtomValue, useSetAtom } from 'jotai'
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
  return (
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-l border-gray-300 dark:border-[var(--color-border-primary)]',
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

  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const isProcessing = useAtomValue(isAiProcessingAtom)
  const setCurrentTask = useSetAtom(currentTaskAtom)
  const setCurrentMessages = useSetAtom(currentMessagesAtom)
  const setStreamingMessage = useSetAtom(streamingMessageAtom)
  const setCurrentThought = useSetAtom(currentThoughtAtom)
  const setIsProcessing = useSetAtom(isAiProcessingAtom)
  const setSelectedTaskId = useSetAtom(selectedTaskIdAtom)

  const handleNewTask = async (): Promise<void> => {
    // 如果当前任务正在执行，先停止它
    if (isProcessing && currentSessionId) {
      try {
        await AIService.stopTask(currentSessionId)
      } catch (error) {
        console.error('Failed to stop current task:', error)
      }
    }

    // 创建临时 Task 对象
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      sessionId: currentSessionId || '',
      name: '新任务',
      createdAt: Date.now(),
      messages: [],
      messageCount: 0
    }

    // 设置临时任务并清空状态
    setCurrentTask(tempTask)
    setCurrentMessages([])
    setStreamingMessage('')
    setCurrentThought('')
    setIsProcessing(false)
    setSelectedTaskId(null) // 清空历史列表中的选中状态

    // 清空后端 Agent 状态
    if (currentSessionId) {
      try {
        await AIService.prepareNewTask(currentSessionId)
      } catch (error) {
        console.error('Failed to prepare new task:', error)
      }
    }

    // 切换到对话视图
    setCurrentView('chat')
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* 顶栏 */}
      <AiTopBar
        onViewChange={setCurrentView}
        currentView={currentView}
        onNewTask={handleNewTask}
        onApiError={setApiConfigError}
      />

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className={currentView === 'chat' ? 'h-full' : 'hidden'}>
          <AiChatView
            apiConfigError={apiConfigError}
            onClearError={() => setApiConfigError('')}
            isVisible={currentView === 'chat'}
            onNavigateToSettings={() => setCurrentView('settings')}
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
