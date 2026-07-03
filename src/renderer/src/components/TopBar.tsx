import icon from '@/assets/images/icon.png'
import { Icon, MenuButton, TopButton, TopDropdown } from '@/components'
import {
  useDarkTheme,
  useModalAbout,
  useModalFileSetting,
  useModalLayout,
  useModalSession,
  useModalShortcut,
  useModalTheme,
  useModalTool
} from '@/hooks'
import { useModalMonitorSettings, useModalTerminalSettings } from '@/hooks/ModalOpen'
import { AIService, ElectronService } from '@/services'
import {
  currentMessagesAtom,
  currentSessionIdAtom,
  currentTaskAtom,
  currentThoughtAtom,
  editingSessionAtom,
  isAiProcessingAtom,
  streamingMessageAtom
} from '@/store'
import { Task } from '@shared/models/Task'
import { useAtomValue, useSetAtom } from 'jotai'
import { ComponentProps, useEffect, useState } from 'react'

export const DraggableTopBar: React.FC<ComponentProps<'header'>> = () => {
  const { isDark, toggleTheme } = useDarkTheme()
  const [isMaximized, setIsMaximized] = useState(false)
  const { openModal: openThemeModal } = useModalTheme()
  const { openModal: openLayoutModal } = useModalLayout()
  const { openModal: openToolModal } = useModalTool()
  const { openModal: openTerminalSettingsModal } = useModalTerminalSettings()
  const { openModal: openMonitorSettingsModal } = useModalMonitorSettings()
  const { openModal: openAboutModal } = useModalAbout()
  const { openModal: openFileSettingModal } = useModalFileSetting()
  const { openModal: openShortcutModal } = useModalShortcut()
  const { openModal: openSessionModal } = useModalSession()
  const setEditingSession = useSetAtom(editingSessionAtom)
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const setCurrentTask = useSetAtom(currentTaskAtom)
  const setCurrentMessages = useSetAtom(currentMessagesAtom)
  const setStreamingMessage = useSetAtom(streamingMessageAtom)
  const setCurrentThought = useSetAtom(currentThoughtAtom)
  const isProcessing = useAtomValue(isAiProcessingAtom)
  const setIsProcessing = useSetAtom(isAiProcessingAtom)

  useEffect(() => {
    // 获取初始窗口状态
    const getInitialState = async (): Promise<void> => {
      const maximized = await ElectronService.isWindowMaximized()
      setIsMaximized(maximized)
    }
    getInitialState()

    // 监听窗口状态变化
    const unsubscribe = ElectronService.onWindowMaximizeChanged(setIsMaximized)
    return unsubscribe
  }, [])

  // 新建 SSH 会话
  const handleCreateSession = (): void => {
    setEditingSession(null)
    openSessionModal()
  }

  // 新建 Agent 任务
  const handleNewTask = async (): Promise<void> => {
    // 如果当前任务正在执行，先停止它
    if (isProcessing && currentSessionId) {
      try {
        await AIService.stopTask(currentSessionId)
      } catch (error) {
        console.error('Failed to stop current task:', error)
      }
    }

    // 创建临时 Task 对象（使用时间戳生成临时 ID）
    const tempTask: Task = {
      id: `temp-${Date.now()}`,
      sessionId: currentSessionId || '',
      name: '新任务',
      createdAt: Date.now(),
      messages: [],
      messageCount: 0
    }

    // 设置临时任务为当前任务
    setCurrentTask(tempTask)
    setCurrentMessages([])
    setStreamingMessage('')
    setCurrentThought('')
    setIsProcessing(false)

    // 如果存在 SSH 连接，清空后端 Agent 的状态
    if (currentSessionId) {
      try {
        await AIService.prepareNewTask(currentSessionId)
      } catch (error) {
        console.error('Failed to prepare new task:', error)
      }
    }
  }

  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 shadow-sm p-0 dark:bg-slate-900/80 dark:border-slate-700/60">
      <div className="flex items-center justify-between h-12">
        <div className="flex items-center space-x-1">
          {/* 应用图标 */}
          <div className="flex items-center justify-center px-3">
            <img src={icon} alt="ASH Terminal Icon" className="w-5 h-5" />
          </div>

          {/* 选项按钮 */}
          <TopButton
            popoverTarget="popover-session"
            style={{ anchorName: '--anchor-session' } as React.CSSProperties}
          >
            会话
          </TopButton>
          <TopDropdown
            id="popover-session"
            style={{ positionAnchor: '--anchor-session' } as React.CSSProperties}
          >
            <MenuButton onClick={handleCreateSession}>新建SSH会话</MenuButton>
            <MenuButton onClick={handleNewTask}>新建Agent任务</MenuButton>
          </TopDropdown>
          <TopButton
            popoverTarget="popover-edit"
            style={{ anchorName: '--anchor-edit' } as React.CSSProperties}
          >
            编辑
          </TopButton>
          <TopDropdown
            id="popover-edit"
            style={{ positionAnchor: '--anchor-edit' } as React.CSSProperties}
          >
            <MenuButton onClick={() => openShortcutModal()}>快捷键说明</MenuButton>
          </TopDropdown>
          <TopButton
            popoverTarget="popover-layout"
            style={{ anchorName: '--anchor-layout' } as React.CSSProperties}
          >
            布局
          </TopButton>
          <TopDropdown
            id="popover-layout"
            style={{ positionAnchor: '--anchor-layout' } as React.CSSProperties}
          >
            <MenuButton onClick={() => openLayoutModal()}>布局设置</MenuButton>
            <MenuButton onClick={() => openToolModal()}>功能区设置</MenuButton>
          </TopDropdown>
          <TopButton
            popoverTarget="popover-settings"
            style={{ anchorName: '--anchor-settings' } as React.CSSProperties}
          >
            设置
          </TopButton>
          <TopDropdown
            id="popover-settings"
            style={{ positionAnchor: '--anchor-settings' } as React.CSSProperties}
          >
            <MenuButton onClick={() => openThemeModal()}>默认主题设置</MenuButton>
            <MenuButton onClick={() => openTerminalSettingsModal()}>终端设置</MenuButton>
            <MenuButton onClick={() => openMonitorSettingsModal()}>性能监视器设置</MenuButton>
            <MenuButton onClick={() => openFileSettingModal()}>文件管理设置</MenuButton>
          </TopDropdown>
          <TopButton
            popoverTarget="popover-help"
            style={{ anchorName: '--anchor-help' } as React.CSSProperties}
          >
            帮助
          </TopButton>
          <TopDropdown
            id="popover-help"
            style={{ positionAnchor: '--anchor-help' } as React.CSSProperties}
          >
            <MenuButton onClick={() => openAboutModal()}>关于</MenuButton>
          </TopDropdown>
        </div>
        <div className="flex items-center space-x-2">
          {/* 主题切换按钮 */}
          <button
            className="w-8 h-8 rounded-md text-slate-600 hover:text-slate-700 hover:bg-gray-200  transition-all duration-200 flex items-center justify-center group dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-gray-700"
            onClick={toggleTheme}
            title={isDark ? '切换到亮色模式' : '切换到暗色模式'}
          >
            {isDark ? (
              <Icon name="sun" size="sm" className="group-hover:scale-110 transition-transform" />
            ) : (
              <Icon name="moon" size="sm" className="group-hover:scale-110 transition-transform" />
            )}
          </button>

          <button
            className="w-8 h-8 rounded-md text-yellow-600 hover:text-yellow-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => ElectronService.minimizeFocusedWindow()}
            title="最小化窗口"
          >
            <Icon name="minus" size="sm" className="group-hover:scale-110 transition-transform" />
          </button>

          <button
            className="w-8 h-8 rounded-md text-green-600 hover:text-green-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => ElectronService.toggleMaximizeFocusedWindow()}
            title={isMaximized ? '恢复窗口' : '最大化窗口'}
          >
            {isMaximized ? (
              <Icon
                name="window-restore"
                size="sm"
                className="group-hover:scale-110 transition-transform"
              />
            ) : (
              <Icon
                name="maximize-2"
                size="sm"
                className="group-hover:scale-110 transition-transform"
              />
            )}
          </button>

          <button
            className="w-8 h-8 mr-3 rounded-md text-red-600 hover:text-red-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 flex items-center justify-center group"
            onClick={() => ElectronService.closeFocusedWindow()}
            title="关闭窗口"
          >
            <Icon name="x" size="sm" className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  )
}
