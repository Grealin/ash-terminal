import { Icon } from '@/components/Icon'
import { useConfig, useLeftSideBar, useModalLayout, useRightSideBar } from '@/hooks'
import { GeneralModal } from './GeneralModal'

export const LayoutModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalLayout()
  const { loading } = useConfig()
  const { visible: leftSideBarVisible, setVisible: setLeftSideBarVisible } = useLeftSideBar()
  const { visible: rightSideBarVisible, setVisible: setRightSideBarVisible } = useRightSideBar()

  if (loading) {
    return (
      <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="布局设置" width="lg">
        <div className="flex justify-center items-center h-32 bg-gradient-to-br from-blue-50 to-indigo-50 dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-lg">
          <Icon
            name="loader-2"
            size="lg"
            className="animate-spin text-blue-600 dark:text-blue-400"
          />
        </div>
      </GeneralModal>
    )
  }

  const handleLeftSideBarToggle = async (checked: boolean): Promise<void> => {
    await setLeftSideBarVisible(checked)
  }

  const handleRightSideBarToggle = async (checked: boolean): Promise<void> => {
    await setRightSideBarVisible(checked)
  }

  return (
    <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="布局设置" width="lg">
      <div className="space-y-6 p-4 rounded-lg">
        <div className="card bg-white/80 dark:bg-slate-800/80 shadow-lg border border-blue-100 dark:border-slate-700 backdrop-blur-sm">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
              <Icon name="layout" size="md" className="mr-2 text-blue-600 dark:text-blue-400" />
              侧边栏显示设置
            </h3>
            <div className="space-y-4">
              {/* 左侧边栏设置 */}
              <div className="form-control bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-xl border border-blue-100 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200">
                <label className="label cursor-pointer">
                  <span className="label-text text-slate-700 dark:text-slate-200 font-medium flex items-center">
                    <Icon
                      name="chevron-right"
                      size="sm"
                      className="mr-2 text-blue-600 dark:text-blue-400"
                    />
                    显示左侧边栏
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary bg-blue-200 dark:bg-slate-600 border-blue-300 dark:border-slate-500 hover:bg-blue-300 dark:hover:bg-slate-500"
                    checked={leftSideBarVisible}
                    onChange={(e) => handleLeftSideBarToggle(e.target.checked)}
                  />
                </label>
                <div className="label">
                  <span className="label-text-alt text-slate-500 dark:text-slate-400">
                    控制左侧功能区域的显示
                  </span>
                </div>
              </div>

              {/* 右侧边栏设置 */}
              <div className="form-control bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-xl border border-blue-100 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200">
                <label className="label cursor-pointer">
                  <span className="label-text text-slate-700 dark:text-slate-200 font-medium flex items-center">
                    <Icon
                      name="chevron-right"
                      size="sm"
                      className="mr-2 text-blue-600 dark:text-blue-400 rotate-180"
                    />
                    显示右侧边栏
                  </span>
                  <input
                    type="checkbox"
                    className="toggle toggle-primary bg-blue-200 dark:bg-slate-600 border-blue-300 dark:border-slate-500 hover:bg-blue-300 dark:hover:bg-slate-500"
                    checked={rightSideBarVisible}
                    onChange={(e) => handleRightSideBarToggle(e.target.checked)}
                  />
                </label>
                <div className="label">
                  <span className="label-text-alt text-slate-500 dark:text-slate-400">
                    控制右侧功能区域的显示
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="alert bg-white/80 dark:bg-slate-800/80 border border-blue-200 dark:border-blue-700 rounded-xl shadow-sm">
          <Icon name="alert-circle" size="lg" className="text-blue-600 dark:text-blue-400" />
          <span className="text-blue-800 dark:text-blue-200 font-medium">
            布局设置会立即生效并自动保存
          </span>
        </div>
      </div>
    </GeneralModal>
  )
}
