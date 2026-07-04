import { Icon } from '@/components/Icon'
import { useModalUpload } from '@/hooks/ModalOpen'
import { useToast } from '@/hooks/Toast'
import { ElectronService, SSHService } from '@/services'
import {
  currentSessionIdAtom,
  fileListRefreshPathAtom,
  fileListRefreshTokenAtom,
  uploadTargetDirAtom
} from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { SheetModal } from '@/components/SheetModal'

interface UploadItem {
  name: string
  path: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

export const UploadModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalUpload()
  const [targetDir, setTargetDir] = useAtom(uploadTargetDirAtom)
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [items, setItems] = useState<UploadItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const toast = useToast()
  const [, setRefreshToken] = useAtom(fileListRefreshTokenAtom)
  const [, setRefreshPath] = useAtom(fileListRefreshPathAtom)

  const canSubmit = useMemo(
    () => !!currentSessionId && !!targetDir && items.length > 0 && !isUploading,
    [currentSessionId, targetDir, items, isUploading]
  )

  const resetState = useCallback(() => {
    setItems([])
    setIsUploading(false)
  }, [])

  const onClose = useCallback(() => {
    if (isUploading) return
    resetState()
    closeModal()
  }, [isUploading, resetState, closeModal])

  const handleSystemDialogSelect = async (): Promise<void> => {
    try {
      const paths = await ElectronService.openFileDialog()
      if (paths && paths.length) {
        const items = paths.map((p) => ({
          name: p.split(/[/\\]/).pop() || p,
          path: p,
          status: 'pending' as const
        }))
        setItems((prev) => {
          const map = new Map<string, UploadItem>()
          ;[...prev, ...items].forEach((it) => map.set(it.path, it))
          return Array.from(map.values())
        })
      }
    } catch (e) {
      console.error('openFileDialog failed', e)
    }
  }

  const handleUpload = async (): Promise<void> => {
    if (!currentSessionId || !targetDir || items.length === 0) return
    setIsUploading(true)

    const updated = [...items]
    setItems(updated)

    for (let i = 0; i < updated.length; i++) {
      updated[i].status = 'uploading'
      setItems([...updated])
      try {
        await SSHService.uploadFile(currentSessionId, updated[i].path, targetDir)
        updated[i].status = 'success'
      } catch (err: any) {
        updated[i].status = 'error'
        updated[i].error = err?.message || '上传失败'
      }
      setItems([...updated])
    }

    const failed = updated.filter((x) => x.status === 'error')
    if (failed.length === 0) {
      toast.show({
        type: 'success',
        title: '上传完成',
        message: `${updated.length} 个文件已上传`,
        position: 'bottom-right',
        size: 'sm',
        duration: 3000
      })
      // 触发文件列表刷新
      setRefreshPath(targetDir)
      setRefreshToken((v) => v + 1)
      resetState()
      closeModal()
    } else {
      toast.show({
        type: 'warning',
        title: '部分失败',
        message: `${failed.length}/${updated.length} 个文件上传失败`,
        position: 'bottom-right',
        size: 'sm',
        duration: 4000
      })
      setIsUploading(false)
    }
  }

  return (
    <SheetModal
      isOpen={isModalOpen}
      onClose={onClose}
      title="上传文件"
      width="lg"
      footer={
        <>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border-primary)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
            onClick={onClose}
            disabled={isUploading}
          >
            取消
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--ash-accent)] hover:opacity-90 text-white transition-colors"
            onClick={handleUpload}
            disabled={!canSubmit}
          >
            {isUploading ? (
              <>
                <Icon name="loader-2" size="xs" className="animate-spin" /> 上传中...
              </>
            ) : (
              '开始上传'
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-[var(--color-text-secondary)]">目标目录</label>
          <input
            className="flex-1 input input-bordered input-sm bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder="/home/user"
          />
        </div>

        <div className="border rounded-md p-6 text-center select-none border-[var(--color-border-primary)] min-h-32 flex flex-col justify-center">
          <div className="text-sm text-[var(--color-text-secondary)]">
            <button type="button" className="link link-primary" onClick={handleSystemDialogSelect}>
              点此处选择文件
            </button>
          </div>
        </div>

        {items.length > 0 && (
          <div className="max-h-48 overflow-y-auto border rounded-md border-[var(--color-border-primary)]">
            {items.map((it) => (
              <div
                key={it.path}
                className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 border-[var(--color-border-primary)]"
              >
                <div className="truncate mr-2 text-[var(--color-text-primary)]">{it.name}</div>
                <div className="flex items-center space-x-2">
                  {it.status === 'pending' && (
                    <span className="text-[var(--color-text-tertiary)]">待上传</span>
                  )}
                  {it.status === 'uploading' && (
                    <span className="text-[var(--ash-accent)] flex items-center">
                      <Icon name="loader-2" size="xs" className="animate-spin mr-1" />
                      上传中
                    </span>
                  )}
                  {it.status === 'success' && (
                    <span className="text-[var(--color-success)]">完成</span>
                  )}
                  {it.status === 'error' && (
                    <span className="text-[var(--color-error)]" title={it.error}>
                      失败
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SheetModal>
  )
}
