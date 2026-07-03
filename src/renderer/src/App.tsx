import {
  AboutModal,
  AiAgentContent,
  AiInterfaceMain,
  CentralBar,
  CommandListContent,
  CommandListMain,
  DraggableTopBar,
  FileListContent,
  FileListMain,
  FileSettingsModal,
  LayoutModal,
  LeftSideBar,
  MainContent,
  MonitorListContent,
  MonitorListMain,
  MonitorSettingsModal,
  RightSideBar,
  RootLayout,
  SessionListContent,
  SessionListMain,
  SessionModal,
  ShortcutModal,
  TerminalListContent,
  TerminalListMain,
  TerminalSettingsModal,
  ThemeModal,
  ToolModal,
  UploadModal
} from '@/components'
import { ToastHost } from '@/components/Toast'

const App: React.FC = () => {
  return (
    <>
      <RootLayout>
        <DraggableTopBar />
        <MainContent>
          {/* 左侧区域 */}
          <LeftSideBar>
            <AiInterfaceMain>
              <AiAgentContent />
            </AiInterfaceMain>
          </LeftSideBar>
          {/* 中央区域 */}
          <CentralBar>
            <TerminalListMain>
              <TerminalListContent />
            </TerminalListMain>
            <CommandListMain>
              <CommandListContent />
            </CommandListMain>
          </CentralBar>
          {/* 右侧区域 */}
          <RightSideBar>
            <SessionListMain>
              <SessionListContent />
            </SessionListMain>
            <FileListMain>
              <FileListContent />
            </FileListMain>
            <MonitorListMain>
              <MonitorListContent />
            </MonitorListMain>
          </RightSideBar>
        </MainContent>
        {/* 模态框 */}
        <SessionModal />
        <ThemeModal />
        <LayoutModal />
        <ToolModal />
        <TerminalSettingsModal />
        <MonitorSettingsModal />
        <AboutModal />
        <FileSettingsModal />
        <ShortcutModal />
        <UploadModal />
        {/* 全局 Toast Host */}
        <ToastHost />
      </RootLayout>
    </>
  )
}

export default App
