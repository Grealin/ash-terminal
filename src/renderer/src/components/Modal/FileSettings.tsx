import { Icon } from '@/components/Icon'
import { useConfig, useModalFileSetting } from '@/hooks'
import { backupOnAiModifyAtom, backupOnManualEditAtom } from '@/store'
import { useAtom } from 'jotai'
import { GeneralModal } from './GeneralModal'

export const FileSettingsModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalFileSetting()
  const { loading, updateConfigField } = useConfig()
  const [backupOnAiModify, setBackupOnAiModify] = useAtom(backupOnAiModifyAtom)
  const [backupOnManualEdit, setBackupOnManualEdit] = useAtom(backupOnManualEditAtom)

  if (loading) {
    return (
      <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="文件管理设置" width="lg">
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

  const handleBackupOnAiModifyToggle = async (checked: boolean): Promise<void> => {
    setBackupOnAiModify(checked)
    try {
      await updateConfigField('file.backupOnAiModify', checked)
    } catch {
      setBackupOnAiModify(!checked)
    }
  }

  const handleBackupOnManualEditToggle = async (checked: boolean): Promise<void> => {
    setBackupOnManualEdit(checked)
    try {
      await updateConfigField('file.backupOnManualEdit', checked)
    } catch {
      setBackupOnManualEdit(!checked)
    }
  }

  return (
    <GeneralModal isOpen={isModalOpen} onClose={closeModal} title="文件管理设置" width="lg">
      <div className="space-y-4 p-4 overflow-hidden">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              className="toggle toggle-accent shrink-0"
              checked={backupOnAiModify}
              onChange={(e) => handleBackupOnAiModifyToggle(e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                AI 修改文件时创建 .bak 备份
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                AI 修改远程文件后自动创建备份以便回滚
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              className="toggle toggle-accent shrink-0"
              checked={backupOnManualEdit}
              onChange={(e) => handleBackupOnManualEditToggle(e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                手动编辑文件时创建 .old 备份
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 break-words">
                手动编辑上传文件前备份原文件，便于恢复
              </p>
            </div>
          </label>
        </div>
      </div>
    </GeneralModal>
  )
}
