import { useModalUpload } from '@/hooks/ModalOpen'
import { useToast } from '@/hooks/Toast'
import { SSHService } from '@/services'
import {
  currentSessionIdAtom,
  fileListRefreshPathAtom,
  fileListRefreshTokenAtom,
  uploadTargetDirAtom
} from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useMemo, useRef, useState } from 'react'
import { GeneralModal } from './GeneralModal'

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
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
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

  const addFiles = useCallback((files: FileList) => {
    const newItems: UploadItem[] = []
    for (const file of Array.from(files)) {
      const anyFile: any = file as any
      const filePath = anyFile.path || anyFile.filepath || ''
      if (!filePath) {
        // 无法获得本地路径时忽略该文件
        continue
      }
      newItems.push({ name: file.name, path: filePath, status: 'pending' })
    }
    if (newItems.length) {
      setItems((prev) => {
        // 去重（按 path）
        const map = new Map<string, UploadItem>()
        ;[...prev, ...newItems].forEach((it) => map.set(it.path, it))
        return Array.from(map.values())
      })
    }
  }, [])

  const handleDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (e.dataTransfer?.files?.length) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  const handleDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  const handleBrowse = () => inputRef.current?.click()

  const handleSystemDialogSelect = async () => {
    try {
      const paths = await window.electron.openFileDialog()
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

  const onFilesSelected: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files) addFiles(e.target.files)
    // 允许重复选择同一文件
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleUpload = async () => {
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
    <GeneralModal isOpen={isModalOpen} onClose={onClose} title="上传文件" width="lg">
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600 dark:text-gray-300">目标目录</label>
          <input
            className="flex-1 input input-bordered input-sm dark:bg-gray-700 dark:text-gray-100"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
            placeholder="/home/user"
          />
        </div>

        <div
          className={
            'border-2 border-dashed rounded-md p-6 text-center select-none transition-colors min-h-32 flex flex-col justify-center ' +
            (dragOver
              ? 'border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600')
          }
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300">
            拖放文件到此处，或
            {/* <button type="button" className="ml-1 link link-primary" onClick={handleBrowse}>
              浏览选择
            </button>
            <span className="mx-1">/</span> */}
            <button type="button" className="link link-primary" onClick={handleSystemDialogSelect}>
              点此处选择文件
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFilesSelected}
          />
        </div>

        {items.length > 0 && (
          <div className="max-h-48 overflow-y-auto border rounded-md dark:border-gray-600">
            {items.map((it) => (
              <div
                key={it.path}
                className="flex items-center justify-between px-3 py-2 text-sm border-b last:border-b-0 dark:border-gray-600"
              >
                <div className="truncate mr-2 dark:text-gray-100">{it.name}</div>
                <div className="flex items-center space-x-2">
                  {it.status === 'pending' && <span className="text-gray-400">待上传</span>}
                  {it.status === 'uploading' && (
                    <span className="text-blue-500 flex items-center">
                      <span className="loading loading-spinner loading-xs mr-1"></span>上传中
                    </span>
                  )}
                  {it.status === 'success' && <span className="text-green-600">完成</span>}
                  {it.status === 'error' && (
                    <span className="text-red-500" title={it.error}>
                      失败
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end space-x-3 pt-2">
          <button type="button" className="btn" onClick={onClose} disabled={isUploading}>
            取消
          </button>
          <button
            type="button"
            className="btn btn-primary dark:btn-primary-dark"
            onClick={handleUpload}
            disabled={!canSubmit}
          >
            {isUploading ? (
              <>
                <span className="loading loading-spinner loading-xs"></span> 上传中...
              </>
            ) : (
              '开始上传'
            )}
          </button>
        </div>
      </div>
    </GeneralModal>
  )
}
