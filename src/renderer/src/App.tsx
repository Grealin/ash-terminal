import {
  AiInterfaceMain,
  CentralBar,
  CommandListMain,
  DraggableTopBar,
  FileListMain,
  LeftSideBar,
  MainContent,
  MonitorListMain,
  RightSideBar,
  RootLayout,
  SessionListMain,
  TerminalListMain,
  ThemeModal
} from '@/components'

const App: React.FC = () => {
  return (
    <>
      <RootLayout>
        <DraggableTopBar />
        <MainContent>
          <LeftSideBar>
            <AiInterfaceMain />
          </LeftSideBar>
          <CentralBar>
            <TerminalListMain />
            <CommandListMain />
          </CentralBar>
          <RightSideBar>
            <SessionListMain />
            <FileListMain />
            <MonitorListMain />
          </RightSideBar>
        </MainContent>
        <ThemeModal />
      </RootLayout>
    </>
  )
}

export default App
