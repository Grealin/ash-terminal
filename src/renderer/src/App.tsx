import {
  AiInterfaceMain,
  CentralBar,
  CommandListContent,
  CommandListMain,
  DraggableTopBar,
  FileListContent,
  FileListMain,
  LayoutModal,
  LeftSideBar,
  MainContent,
  MonitorListContent,
  MonitorListMain,
  RightSideBar,
  RootLayout,
  SessionListContent,
  SessionListMain,
  SessionModal,
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
            <AiInterfaceMain />
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
        <UploadModal />
        {/* 全局 Toast Host */}
        <ToastHost />
      </RootLayout>
    </>
  )
}

export default App
