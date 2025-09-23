import {
  AiInterfaceMain,
  CentralBar,
  CommandListMain,
  DraggableTopBar,
  FileListContent,
  FileListMain,
  LayoutModal,
  LeftSideBar,
  MainContent,
  MonitorListMain,
  RightSideBar,
  RootLayout,
  SessionListContent,
  SessionListMain,
  SessionModal,
  TerminalListContent,
  TerminalListMain,
  ThemeModal,
  ToolModal
} from '@/components'

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
            <CommandListMain />
          </CentralBar>
          {/* 右侧区域 */}
          <RightSideBar>
            <SessionListMain>
              <SessionListContent />
            </SessionListMain>
            <FileListMain>
              <FileListContent />
            </FileListMain>
            <MonitorListMain />
          </RightSideBar>
        </MainContent>
        {/* 模态框 */}
        <SessionModal />
        <ThemeModal />
        <LayoutModal />
        <ToolModal />
      </RootLayout>
    </>
  )
}

export default App
