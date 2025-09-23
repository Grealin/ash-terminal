import { useModalSession } from '@/hooks'
import { SSHService, sessionsAtom } from '@/services'
import { editingSessionAtom } from '@/store'
import { SSHConfig } from '@shared/models'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { GeneralModal } from './GeneralModal'

// 会话表单数据类型
interface SessionFormData {
  name: string
  host: string
  port: number
  username: string
  password: string
}

export const SessionModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalSession()
  const [sessions, setSessions] = useAtom(sessionsAtom)
  const [editingSession, setEditingSession] = useAtom(editingSessionAtom)
  const [saving, setSaving] = useState(false)

  // 表单数据状态
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: ''
  })

  // 当编辑会话改变时，更新表单数据
  useEffect(() => {
    if (editingSession) {
      setFormData({
        name: editingSession.name,
        host: editingSession.host,
        port: editingSession.port,
        username: editingSession.username,
        password: editingSession.password || ''
      })
    } else {
      setFormData({ name: '', host: '', port: 22, username: '', password: '' })
    }
  }, [editingSession])

  // 处理保存
  const handleSave = async () => {
    if (!formData.name || !formData.host || !formData.username || saving) return

    try {
      setSaving(true)
      const sessionConfig: SSHConfig = {
        id: editingSession?.id || `session_${Date.now()}`,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        password: formData.password
      }

      await SSHService.saveSession(sessionConfig)

      // 更新本地状态
      if (editingSession) {
        setSessions((prev) => prev.map((s) => (s.id === sessionConfig.id ? sessionConfig : s)))
      } else {
        setSessions((prev) => [...prev, sessionConfig])
      }

      handleCancel()
    } catch (error) {
      console.error('Failed to save session:', error)
      alert('保存会话配置失败')
    } finally {
      setSaving(false)
    }
  }

  // 处理取消
  const handleCancel = () => {
    setEditingSession(null)
    setFormData({ name: '', host: '', port: 22, username: '', password: '' })
    closeModal()
  }

  // 表单验证
  const isFormValid = formData.name.trim() && formData.host.trim() && formData.username.trim()

  return (
    <GeneralModal
      isOpen={isModalOpen}
      onClose={handleCancel}
      title={editingSession ? '编辑会话' : '创建新会话'}
      width="lg"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={twMerge(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-slate-400 dark:placeholder-slate-500'
              )}
              placeholder="会话名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              主机地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => setFormData((prev) => ({ ...prev, host: e.target.value }))}
              className={twMerge(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-slate-400 dark:placeholder-slate-500'
              )}
              placeholder="服务器IP或域名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              端口
            </label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, port: parseInt(e.target.value) || 22 }))
              }
              className={twMerge(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-slate-400 dark:placeholder-slate-500'
              )}
              placeholder="22"
              min="1"
              max="65535"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              className={twMerge(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-slate-400 dark:placeholder-slate-500'
              )}
              placeholder="SSH用户名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              密码
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className={twMerge(
                'w-full px-3 py-2 rounded-lg border transition-all duration-200',
                'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100',
                'border-slate-300 dark:border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                'placeholder-slate-400 dark:placeholder-slate-500'
              )}
              placeholder="SSH密码（可选）"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-600">
          <button
            type="button"
            onClick={handleCancel}
            className={twMerge(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'text-slate-600 bg-slate-100 hover:bg-slate-200',
              'dark:text-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
            )}
            disabled={saving}
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={twMerge(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              'text-white bg-blue-500 hover:bg-blue-600',
              'dark:bg-blue-600 dark:hover:bg-blue-700',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            disabled={!isFormValid || saving}
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="m100 50v6h4l-2 6-2-6h4zm-6 0v6h4l-2 6-2-6h4z"
                  ></path>
                </svg>
                保存中...
              </>
            ) : editingSession ? (
              '更新'
            ) : (
              '创建'
            )}
          </button>
        </div>
      </div>
    </GeneralModal>
  )
}
