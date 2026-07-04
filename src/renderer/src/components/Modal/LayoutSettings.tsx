import { Icon } from '@/components/Icon'
import { useConfig, useLeftSideBar, useModalLayout, useRightSideBar } from '@/hooks'
import { SheetModal } from '@/components/SheetModal'

export const LayoutModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalLayout()
  const { loading } = useConfig()
  const { visible: leftSideBarVisible, setVisible: setLeftSideBarVisible } = useLeftSideBar()
  const { visible: rightSideBarVisible, setVisible: setRightSideBarVisible } = useRightSideBar()

  if (loading) {
    return (
      <SheetModal isOpen={isModalOpen} onClose={closeModal} title="布局设置" width="sm">
        <div className="flex justify-center items-center h-32 bg-gradient-to-br from-[var(--ash-accent-subtle)] to-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]">
          <Icon name="loader-2" size="lg" className="animate-spin text-[var(--ash-accent)]" />
        </div>
      </SheetModal>
    )
  }

  const handleLeftSideBarToggle = async (checked: boolean): Promise<void> => {
    await setLeftSideBarVisible(checked)
  }

  const handleRightSideBarToggle = async (checked: boolean): Promise<void> => {
    await setRightSideBarVisible(checked)
  }

  return (
    <SheetModal isOpen={isModalOpen} onClose={closeModal} title="布局设置" width="sm">
      <div className="space-y-6 p-4 rounded-[var(--radius-lg)]">
        <div className="card bg-[var(--color-bg-primary)] shadow-lg border border-[var(--color-border-primary)] backdrop-blur-sm">
          <div className="card-body">
            <h3 className="card-title text-lg font-semibold text-[var(--color-text-secondary)] mb-4 flex items-center">
              <Icon name="layout" size="md" className="mr-2 text-[var(--ash-accent)]" />
              侧边栏显示设置
            </h3>
            <div className="space-y-4">
              {/* 左侧边栏设置 */}
              <div className="form-control bg-[var(--ash-accent)]-subtle p-4 rounded-xl border border-[var(--color-border-primary)] hover:bg-[var(--ash-accent)]-subtle transition-all duration-200">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)] font-medium flex items-center">
                    <Icon
                      name="chevron-right"
                      size="sm"
                      className="mr-2 text-[var(--ash-accent)]"
                    />
                    显示左侧边栏
                  </span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={leftSideBarVisible}
                    onChange={(e) => handleLeftSideBarToggle(e.target.checked)}
                  />
                </label>
                <div className="label">
                  <span className="label-text-alt text-[var(--color-text-tertiary)]">
                    控制左侧功能区域的显示
                  </span>
                </div>
              </div>

              {/* 右侧边栏设置 */}
              <div className="form-control bg-[var(--ash-accent)]-subtle p-4 rounded-xl border border-[var(--color-border-primary)] hover:bg-[var(--ash-accent)]-subtle transition-all duration-200">
                <label className="label cursor-pointer">
                  <span className="label-text text-[var(--color-text-secondary)] font-medium flex items-center">
                    <Icon
                      name="chevron-right"
                      size="sm"
                      className="mr-2 text-[var(--ash-accent)] rotate-180"
                    />
                    显示右侧边栏
                  </span>
                  <input
                    type="checkbox"
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
                    checked={rightSideBarVisible}
                    onChange={(e) => handleRightSideBarToggle(e.target.checked)}
                  />
                </label>
                <div className="label">
                  <span className="label-text-alt text-[var(--color-text-tertiary)]">
                    控制右侧功能区域的显示
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="alert bg-[var(--color-bg-primary)] border border-[var(--ash-accent)]-subtle rounded-xl shadow-sm">
          <Icon name="alert-circle" size="lg" className="text-[var(--ash-accent)]" />
          <span className="text-[var(--ash-accent)] font-medium">布局设置会立即生效并自动保存</span>
        </div>
      </div>
    </SheetModal>
  )
}
