import { useConfig, useModalTool } from '@/hooks'
import {
  useAiInterface,
  useCommandList,
  useFileList,
  useMonitorList,
  useSessionList
} from '@/hooks/AreaClosed'
import { GeneralModal } from './GeneralModal'

export const ToolModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalTool()
  const { config, loading } = useConfig()

  // 使用各个功能区域的 hooks
  const { visible: aiInterfaceVisible, setVisible: setAiInterfaceVisible } = useAiInterface()
  const { visible: sessionListVisible, setVisible: setSessionListVisible } = useSessionList()
  const { visible: fileListVisible, setVisible: setFileListVisible } = useFileList()
  const { visible: monitorListVisible, setVisible: setMonitorListVisible } = useMonitorList()
  const { visible: commandListVisible, setVisible: setCommandListVisible } = useCommandList()

  if (loading) {
    return (
      <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="功能区设置" width="lg">
        <div className="flex justify-center items-center h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-lg">
          <div className="loading loading-spinner loading-lg text-blue-600 dark:text-blue-400"></div>
        </div>
      </GeneralModal>
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
    <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="功能区设置" width="lg">
      <div className="space-y-6 p-4">
        {/* 左侧栏功能组件 */}
        <div className="card bg-base-100 dark:bg-slate-800 shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-gray-800 dark:text-gray-200">
              左侧栏功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-gray-700 dark:text-gray-300">AI 界面</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    checked={aiInterfaceVisible}
                    onChange={(e) => handleAiInterfaceToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 右侧栏功能组件 */}
        <div className="card bg-base-100 dark:bg-slate-800 shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-gray-800 dark:text-gray-200">
              右侧栏功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-gray-700 dark:text-gray-300">会话管理</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    checked={sessionListVisible}
                    onChange={(e) => handleSessionListToggle(e.target.checked)}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-gray-700 dark:text-gray-300">文件管理</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    checked={fileListVisible}
                    onChange={(e) => handleFileListToggle(e.target.checked)}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-gray-700 dark:text-gray-300">系统监控</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    checked={monitorListVisible}
                    onChange={(e) => handleMonitorListToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* 中央区域功能组件 */}
        <div className="card bg-base-100 dark:bg-slate-800 shadow-md">
          <div className="card-body p-4">
            <h3 className="card-title text-base font-medium mb-3 text-gray-800 dark:text-gray-200">
              中央区域功能
            </h3>
            <div className="space-y-3">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text text-gray-700 dark:text-gray-300">批量命令</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-accent"
                    checked={commandListVisible}
                    onChange={(e) => handleCommandListToggle(e.target.checked)}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GeneralModal>
  )
}
