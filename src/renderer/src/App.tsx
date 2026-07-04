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
  UploadModal,
  ConfigContext
} from '@/components'
import { ToastHost } from '@/components/Toast'
import { StatusBar } from '@/components/StatusBar'
import { useConfig } from '@/hooks'

const App: React.FC = () => {
  const { updateConfigField } = useConfig()

  return (
    <ConfigContext.Provider value={{ updateConfigField }}>
      <RootLayout>
        <DraggableTopBar />
        <MainContent>
          <LeftSideBar>
            <AiInterfaceMain>
              <AiAgentContent />
            </AiInterfaceMain>
          </LeftSideBar>
          <CentralBar>
            <TerminalListMain>
              <TerminalListContent />
            </TerminalListMain>
            <CommandListMain>
              <CommandListContent />
            </CommandListMain>
          </CentralBar>
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
        <StatusBar />
        <SessionModal />
        <ThemeModal />
        <LayoutModal />
        <TerminalSettingsModal />
        <MonitorSettingsModal />
        <AboutModal />
        <FileSettingsModal />
        <ShortcutModal />
        <UploadModal />
        <ToastHost />
      </RootLayout>
    </ConfigContext.Provider>
  )
}

export default App
