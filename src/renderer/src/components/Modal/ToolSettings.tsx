import { Icon } from '@/components/Icon'
import { useConfig, useModalTool } from '@/hooks'
import {
  useAiInterface,
  useCommandList,
  useFileList,
  useMonitorList,
  useSessionList
} from '@/hooks/AreaClosed'
import { SheetModal } from '@/components/SheetModal'

export const ToolModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalTool()
  const { loading } = useConfig()

  // 使用各个功能区域的 hooks
  const { visible: aiInterfaceVisible, setVisible: setAiInterfaceVisible } = useAiInterface()
  const { visible: sessionListVisible, setVisible: setSessionListVisible } = useSessionList()
  const { visible: fileListVisible, setVisible: setFileListVisible } = useFileList()
  const { visible: monitorListVisible, setVisible: setMonitorListVisible } = useMonitorList()
  const { visible: commandListVisible, setVisible: setCommandListVisible } = useCommandList()

  if (loading) {
    return (
      <SheetModal isOpen={isModalOpen} onClose={closeModal} title="功能区设置" width="sm">
        <div className="flex justify-center items-center h-32 bg-gradient-to-br from-[var(--ash-accent-subtle)] to-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]">
          <Icon name="loader-2" size="lg" className="animate-spin text-[var(--ash-accent)]" />
        </div>
      </SheetModal>
    )
  }

  const handleAiInterfaceToggle = async (checked: boolean): Promise<void> => {
    await setAiInterfaceVisible(checked)
  }

  const handleSessionListToggle = async (checked: boolean): Promise<void> => {
    await setSessionListVisible(checked)
  }

  const handleFileListToggle = async (checked: boolean): Promise<void> => {
    await setFileListVisible(checked)
  }

  const handleMonitorListToggle = async (checked: boolean): Promise<void> => {
    await setMonitorListVisible(checked)
  }

  const handleCommandListToggle = async (checked: boolean): Promise<void> => {
    await setCommandListVisible(checked)
  }

  return (
    <SheetModal isOpen={isModalOpen} onClose={closeModal} title="功能区设置" width="sm">
      <div className="space-y-6 p-4">
        {/* 左侧栏功能组件 */}
        <div className="card bg-[var(--color-bg-secondary)] shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-[var(--color-text-primary)]">
              左侧栏功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)]">AI 界面</span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={aiInterfaceVisible}
                    onChange={(e) => handleAiInterfaceToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧栏功能组件 */}
        <div className="card bg-[var(--color-bg-secondary)] shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-[var(--color-text-primary)]">
              右侧栏功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)]">会话管理</span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={sessionListVisible}
                    onChange={(e) => handleSessionListToggle(e.target.checked)}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)]">文件管理</span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={fileListVisible}
                    onChange={(e) => handleFileListToggle(e.target.checked)}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)]">系统监控</span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={monitorListVisible}
                    onChange={(e) => handleMonitorListToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 中央区域功能组件 */}
        <div className="card bg-[var(--color-bg-secondary)] shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-[var(--color-text-primary)]">
              中央区域功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)]">批量命令</span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={commandListVisible}
                    onChange={(e) => handleCommandListToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheetModal>
  )
}
