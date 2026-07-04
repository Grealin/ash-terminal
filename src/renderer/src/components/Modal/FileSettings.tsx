import { Icon } from '@/components/Icon'
import { useConfig, useModalFileSetting } from '@/hooks'
import { backupOnAiModifyAtom, backupOnManualEditAtom } from '@/store'
import { useAtom } from 'jotai'
import { SheetModal } from '@/components/SheetModal'

export const FileSettingsModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalFileSetting()
  const { loading, updateConfigField } = useConfig()
  const [backupOnAiModify, setBackupOnAiModify] = useAtom(backupOnAiModifyAtom)
  const [backupOnManualEdit, setBackupOnManualEdit] = useAtom(backupOnManualEditAtom)

  if (loading) {
    return (
      <SheetModal isOpen={isModalOpen} onClose={closeModal} title="文件管理设置" width="sm">
        <div className="flex justify-center items-center h-32 bg-gradient-to-br from-[var(--ash-accent-subtle)] to-[var(--color-bg-secondary)] rounded-[var(--radius-lg)]">
          <Icon name="loader-2" size="lg" className="animate-spin text-[var(--ash-accent)]" />
        </div>
      </SheetModal>
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
    <SheetModal isOpen={isModalOpen} onClose={closeModal} title="文件管理设置" width="sm">
      <div className="space-y-4 p-4 overflow-hidden">
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
              checked={backupOnAiModify}
              onChange={(e) => handleBackupOnAiModifyToggle(e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                AI 修改文件时创建 .bak 备份
              </span>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 break-words">
                AI 修改远程文件后自动创建备份以便回滚
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer py-1">
            <input
              type="checkbox"
              className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors bg-[var(--color-bg-tertiary)] checked:bg-[var(--ash-accent)]"
              checked={backupOnManualEdit}
              onChange={(e) => handleBackupOnManualEditToggle(e.target.checked)}
            />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                手动编辑文件时创建 .old 备份
              </span>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 break-words">
                手动编辑上传文件前备份原文件，便于恢复
              </p>
            </div>
          </label>
        </div>
      </div>
    </SheetModal>
  )
}
