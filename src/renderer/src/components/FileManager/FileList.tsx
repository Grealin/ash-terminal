import { ConfirmModal, GeneralModal } from '@/components/Modal/GeneralModal'
import { useSSHConnection, useToast } from '@/hooks'
import { useFileList } from '@/hooks/AreaClosed'
import { useModalUpload } from '@/hooks/ModalOpen'
import { ElectronService, SSHService } from '@/services'
import {
  currentSessionIdAtom,
  fileListRefreshPathAtom,
  fileListRefreshTokenAtom,
  uploadTargetDirAtom
} from '@/store'
import { FileInfo } from '@shared/models'
import { useAtom, useAtomValue } from 'jotai'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

export const FileListMain: React.FC<ComponentProps<'div'>> = ({
  children,
  className,
  ...props
}) => {
  const { visible } = useFileList()

  if (!visible) {
    return null
  }

  return (
    <div
      className={twMerge(
        'flex flex-col flex-1 min-h-0 border-b border-r border-gray-300 dark:border-gray-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const FileListContent: React.FC = () => {
  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const { isConnected, isDisconnected } = useSSHConnection()
  const [files, setFiles] = useState<FileInfo[]>([])
  const [currentPath, setCurrentPath] = useState('~')
  const [realPath, setRealPath] = useState('~') // 存储真实路径
  const [isEditingPath, setIsEditingPath] = useState(false)
  const [editPath, setEditPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeletePath, setPendingDeletePath] = useState<string | null>(null)
  const [editConfirmOpen, setEditConfirmOpen] = useState(false)
  const [editingLocalPath, setEditingLocalPath] = useState<string | null>(null)
  const [editingRemotePath, setEditingRemotePath] = useState<string | null>(null)
  const [isSyncingBack, setIsSyncingBack] = useState(false)
  const toast = useToast()
  const { openModal: openUploadModal } = useModalUpload()
  const [, setUploadTargetDir] = useAtom(uploadTargetDirAtom)
  const [refreshToken] = useAtom(fileListRefreshTokenAtom)
  const [refreshPath] = useAtom(fileListRefreshPathAtom)

  // 加载文件列表
  const loadFiles = async (path: string = currentPath): Promise<void> => {
    if (!currentSessionId || !isConnected) {
      setFiles([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 首先获取真实路径
      let actualPath = path
      if (path.includes('~')) {
        const homeResult = await SSHService.executeCommand(currentSessionId, 'echo ~')
        if (homeResult.stdout && !homeResult.stderr) {
          const homePath = homeResult.stdout.trim()
          actualPath = path.replace(/^~/, homePath)
        }
      }

      // 使用 realpath 获取规范化的绝对路径
      const realpathResult = await SSHService.executeCommand(
        currentSessionId,
        `realpath "${actualPath}" 2>/dev/null || echo "${actualPath}"`
      )
      const canonicalPath = realpathResult.stdout ? realpathResult.stdout.trim() : actualPath

      const fileList = await SSHService.getDirectoryFiles(currentSessionId, canonicalPath)
      // 过滤以“.”开头的隐藏文件/目录
      const visibleList = fileList.filter((f) => !f.name.startsWith('.'))
      setFiles(visibleList)
      setCurrentPath(path)
      setRealPath(canonicalPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  // 当会话变化或连接状态变化时重新加载文件
  useEffect(() => {
    if (currentSessionId && isConnected) {
      loadFiles('~')
    } else {
      setFiles([])
      setCurrentPath('~')
      setRealPath('~')
      setError(null)
    }
  }, [currentSessionId, isConnected])

  // 当连接断开时重置状态
  useEffect(() => {
    if (isDisconnected) {
      setFiles([])
      setCurrentPath('~')
      setRealPath('~')
      setError(null)
      setLoading(false)
      // 添加编辑文件状态重置
      setEditingLocalPath(null)
      setEditingRemotePath(null)
      setEditConfirmOpen(false)
      setIsSyncingBack(false)
    }
  }, [isDisconnected])

  // 监听来自其它组件的刷新信号
  useEffect(() => {
    if (!refreshToken) return
    const path = refreshPath || realPath
    loadFiles(path)
  }, [refreshToken])

  // 进入目录
  const handleDirectoryEnter = (dirName: string): void => {
    const newPath = realPath === '/' ? `/${dirName}` : `${realPath}/${dirName}`
    loadFiles(newPath)
  }

  // 下载文件
  const handleDownload = async (file: FileInfo): Promise<void> => {
    if (!currentSessionId) return
    const remotePath = `${realPath === '/' ? '' : realPath}/${file.name}`
    try {
      await SSHService.downloadFile(currentSessionId, remotePath)
      // 全局 Toast 提示下载成功
      toast.show({
        type: 'success',
        title: '下载成功',
        message: `位于系统下载目录文件：${file.name}`,
        position: 'bottom-right',
        size: 'md',
        duration: 6000
      })
    } catch (e) {
      // 全局 Toast 提示下载失败
      const msg = e instanceof Error ? e.message : '下载失败'
      toast.show({
        type: 'error',
        title: '下载失败',
        message: msg,
        position: 'bottom-right',
        size: 'md',
        duration: 6000
      })
    }
  }

  // 编辑文件：下载到 EditCache -> 打开“用此打开” -> 3秒后询问是否完成
  const handleEdit = async (file: FileInfo): Promise<void> => {
    if (!currentSessionId) return
    const remotePath = `${realPath === '/' ? '' : realPath}/${file.name}`
    try {
      const localPath = await SSHService.downloadFileToEditCache(currentSessionId, remotePath)
      setEditingLocalPath(localPath)
      setEditingRemotePath(remotePath)
      // 打开系统“你要如何打开这个文件？”
      await ElectronService.openWithChooser(localPath)
      // 3 秒后弹确认模态
      setTimeout(() => {
        // 若仍处于同一次编辑
        if (editingLocalPath === null || editingLocalPath === localPath) {
          setEditConfirmOpen(true)
        }
      }, 3000)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '编辑准备失败'
      toast.show({
        type: 'error',
        title: '编辑失败',
        message: msg,
        position: 'bottom-right',
        size: 'md',
        duration: 6000
      })
      // 删除本地缓存（如果有）
      if (editingLocalPath) {
        await ElectronService.deleteEditCacheFile(editingLocalPath)
      }
    }
  }

  const cleanupEditCache = async (): Promise<void> => {
    try {
      if (editingLocalPath) {
        await ElectronService.deleteEditCacheFile(editingLocalPath)
      }
    } catch (e) {
      // 仅记录，不打断流程
      console.error('deleteEditCacheFile failed', e)
    }
    setEditingLocalPath(null)
    setEditingRemotePath(null)
  }

  const reopenChooser = async (): Promise<void> => {
    if (editingLocalPath) {
      try {
        await ElectronService.openWithChooser(editingLocalPath)
      } catch (e) {
        const msg = e instanceof Error ? e.message : '无法打开编辑器'
        toast.show({
          type: 'error',
          title: '打开失败',
          message: msg,
          position: 'bottom-right',
          size: 'sm'
        })
      }
    }
  }

  const confirmEditedAndSyncBack = async (): Promise<void> => {
    if (!currentSessionId || !editingLocalPath || !editingRemotePath) return
    setIsSyncingBack(true)
    try {
      // 1) 远程备份
      await SSHService.backupRemoteFile(currentSessionId, editingRemotePath)
      // 2) 上传覆盖
      const remoteDir = editingRemotePath.substring(0, editingRemotePath.lastIndexOf('/')) || '/'
      await SSHService.uploadFile(currentSessionId, editingLocalPath, remoteDir)
      // 3) 清理本地缓存
      await cleanupEditCache()
      setEditConfirmOpen(false)
      // 刷新文件列表
      await loadFiles(realPath)
      toast.show({
        type: 'success',
        title: '同步完成',
        message: '修改已上传并完成备份(.old)',
        position: 'bottom-right',
        size: 'md'
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : '同步失败'
      toast.show({
        type: 'error',
        title: '同步失败',
        message: msg,
        position: 'bottom-right',
        size: 'md'
      })
    } finally {
      setIsSyncingBack(false)
    }
  }

  // 触发删除确认
  const handleAskDelete = (file: FileInfo): void => {
    const remotePath = `${realPath === '/' ? '' : realPath}/${file.name}`
    setPendingDeletePath(remotePath)
    setConfirmOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async (): Promise<void> => {
    if (!currentSessionId || !pendingDeletePath) return
    try {
      await SSHService.deleteRemoteFile(currentSessionId, pendingDeletePath)
      setPendingDeletePath(null)
      setConfirmOpen(false)
      // 刷新列表
      loadFiles(realPath)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
      setTimeout(() => setError(null), 3000)
    }
  }

  // 返回上级目录
  const handleGoBack = (): void => {
    const parentPath =
      realPath === '/' ? '/' : realPath.substring(0, realPath.lastIndexOf('/')) || '/'
    loadFiles(parentPath)
  }

  // 开始编辑路径
  const handleStartEditPath = (): void => {
    setIsEditingPath(true)
    setEditPath(realPath)
  }

  // 取消编辑路径（延迟执行以避免与按钮点击冲突）
  const handleCancelEditPath = (): void => {
    setTimeout(() => {
      setIsEditingPath(false)
      setEditPath('')
    }, 100)
  }

  // 处理输入框失去焦点
  const handlePathBlur = (): void => {
    // 延迟取消以允许按钮点击事件先执行
    setTimeout(() => {
      if (isEditingPath) {
        handleCancelEditPath()
      }
    }, 150)
  }

  // 确认路径编辑
  const handleConfirmEditPath = (): void => {
    if (editPath.trim() && editPath.trim() !== realPath) {
      loadFiles(editPath.trim())
    }
    setIsEditingPath(false)
    setEditPath('')
  }

  // 处理路径输入键盘事件
  const handlePathKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleConfirmEditPath()
    } else if (e.key === 'Escape') {
      handleCancelEditPath()
    }
  }

  // 获取文件图标
  const getFileIcon = (file: FileInfo): React.ReactNode => {
    if (file.type === 'directory') {
      return (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      )
    } else {
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
        return (
          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
              clipRule="evenodd"
            />
          </svg>
        )
      } else if (['txt', 'md', 'log'].includes(extension || '')) {
        return (
          <svg className="w-6 h-6 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        )
      } else {
        return (
          <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        )
      }
    }
  }

  // 格式化文件大小
  const formatFileSize = (size: number): string => {
    if (size === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(size) / Math.log(k))
    return `${parseFloat((size / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  if (!currentSessionId || !isConnected) {
    return (
      <div className="flex flex-col h-full p-3 bg-white dark:bg-gray-900">
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <svg
              className="w-12 h-12 mx-auto mb-4 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm">
              {!currentSessionId ? '选择 SSH 会话以浏览文件' : '等待 SSH 连接建立...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 头部工具栏 */}
      <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleGoBack}
            disabled={realPath === '/'}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="返回上级"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <button
            onClick={() => {
              setUploadTargetDir(realPath)
              openUploadModal()
            }}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="上传"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14V4m0 0l-4 4m4-4l4 4M20 20H4a2 2 0 01-2-2V7"
              />
            </svg>
          </button>
          <button
            onClick={() => loadFiles(realPath)}
            className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="刷新"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{files.length} 个项目</span>
        </div>
      </div>

      {/* 路径栏 */}
      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {isEditingPath ? (
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={editPath}
              onChange={(e) => setEditPath(e.target.value)}
              onKeyDown={handlePathKeyDown}
              onBlur={handlePathBlur}
              className="flex-1 text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 font-mono focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
              autoFocus
            />
            <button
              onMouseDown={handleConfirmEditPath}
              className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
              title="确认"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
            <button
              onMouseDown={handleCancelEditPath}
              className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
              title="取消"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
            onClick={handleStartEditPath}
            title="点击编辑路径"
          >
            <div className="text-sm text-gray-600 dark:text-gray-400 font-mono truncate">
              {realPath}
            </div>
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 文件列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-xs">加载中...</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-red-500">
              <svg
                className="w-5 h-5 mx-auto mb-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        ) : files.length === 0 ? (
          <div className="flex items-center justify-center h-24">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <svg
                className="w-5 h-5 mx-auto mb-1 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-xs">目录为空</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center w-full px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                onDoubleClick={() => {
                  if (file.type === 'directory') {
                    handleDirectoryEnter(file.name)
                  }
                }}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <div className="flex-shrink-0 mr-2">{getFileIcon(file)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center space-x-1 mt-0.5">
                      <span className="truncate max-w-16">{file.permissions}</span>
                      {file.type === 'file' && (
                        <>
                          <span>•</span>
                          <span className="whitespace-nowrap">{formatFileSize(file.size)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-0.5 ml-1">
                  {file.type === 'file' && (
                    <>
                      <button
                        className="p-0.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="下载"
                        onClick={() => handleDownload(file)}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </button>
                      <button
                        className="p-0.5 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="编辑"
                        onClick={() => handleEdit(file)}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        className="p-0.5 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                        title="删除"
                        onClick={() => handleAskDelete(file)}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* 操作提示/错误信息（保留其它操作使用 opMessage/error 的能力；下载提示改为 Toast） */}
      {error && (
        <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">
          <div className="text-red-500">{error}</div>
        </div>
      )}

      {/* 确认删除对话框 */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPendingDeletePath(null)
        }}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        message={`确定要删除该文件吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
      />

      {/* 编辑完成确认模态 */}
      <GeneralModal
        isOpen={editConfirmOpen}
        onClose={async () => {
          // 取消则清理并关闭
          await cleanupEditCache()
          setEditConfirmOpen(false)
        }}
        title="确认文件是否已修改完成"
        width="md"
        closeOnBackdropClick
      >
        <div className="space-y-4">
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            请确认是否已在外部编辑器中完成修改并保存。选择“是”将备份远程原文件并上传修改后的文件；选择“否”将再次进行编辑，保持此对话框不关闭；取消则放弃本次编辑。
          </p>
          <div className="flex justify-end space-x-2">
            <button
              className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              onClick={async () => {
                // 取消：删除本地缓存并关闭
                await cleanupEditCache()
                setEditConfirmOpen(false)
              }}
            >
              取消
            </button>
            <button
              className="px-3 py-1.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
              onClick={reopenChooser}
              disabled={!editingLocalPath}
              title="再次选择用哪个程序打开此文件"
            >
              否，继续编辑
            </button>
            <button
              className="px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-60"
              onClick={confirmEditedAndSyncBack}
              disabled={isSyncingBack || !editingLocalPath || !editingRemotePath}
            >
              {isSyncingBack ? '上传中...' : '是，上传修改'}
            </button>
          </div>
        </div>
      </GeneralModal>

      {/* 全局 Toast 已接管下载提示 */}
    </div>
  )
}
