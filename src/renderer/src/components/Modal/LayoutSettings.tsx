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
          <div className="loading loading-spinner loading-lg text-blue-600 dark:text-blue-400"></div>
        </div>
      </GeneralModal>
    )
  }

  const handleLeftSideBarToggle = async (checked: boolean) => {
    await setLeftSideBarVisible(checked)
  }

  const handleRightSideBarToggle = async (checked: boolean) => {
    await setRightSideBarVisible(checked)
  }

  return (
    <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="布局设置" width="lg">
      <div className="space-y-6 p-4 rounded-lg">
        <div className="card bg-white/80 dark:bg-slate-800/80 shadow-lg border border-blue-100 dark:border-slate-700 backdrop-blur-sm">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              侧边栏显示设置
            </h3>
            <div className="space-y-4">
              {/* 左侧边栏设置 */}
              <div className="form-control bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-xl border border-blue-100 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all duration-200">
                <label className="label cursor-pointer">
                  <span className="label-text text-slate-700 dark:text-slate-200 font-medium flex items-center">
                    <svg
                      className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
                    <svg
                      className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400 rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-blue-600 dark:stroke-blue-400 shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span className="text-blue-800 dark:text-blue-200 font-medium">
            布局设置会立即生效并自动保存
          </span>
        </div>
      </div>
    </GeneralModal>
  )
}
