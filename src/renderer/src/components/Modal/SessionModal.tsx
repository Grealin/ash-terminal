import { useModalSession } from '@/hooks'
import { SSHService } from '@/services'
import { editingSessionAtom, sessionsAtom } from '@/store'
import { SSHConfig } from '@shared/models'
import { useAtom, useSetAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { SheetModal } from '@/components/SheetModal'

// 会话表单数据类型
interface SessionFormData {
  name: string
  host: string
  port: number
  username: string
  password: string
  privateKey: string
  passphrase: string
  authMode: 'password' | 'key'
  privateKeySource: 'content' | 'path'
}

export const SessionModal: React.FC = () => {
  const { isModalOpen, closeModal } = useModalSession()
  const setSessions = useSetAtom(sessionsAtom)
  const [editingSession, setEditingSession] = useAtom(editingSessionAtom)
  const [saving, setSaving] = useState(false)

  // 表单数据状态
  const [formData, setFormData] = useState<SessionFormData>({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: '',
    passphrase: '',
    authMode: 'password',
    privateKeySource: 'content'
  })

  // 校验密钥内容是否为私钥格式（排除误粘贴公钥的情况）
  const validatePrivateKey = (content: string): string | null => {
    if (!content.trim()) return null
    const trimmed = content.trim()
    // 公钥格式特征：以 ssh-rsa / ssh-ed25519 / ecdsa-sha2-* / ssh-dss 开头
    if (/^(ssh-(?:rsa|ed25519|dss)|ecdsa-sha2-nistp(?:256|384|521))[\s+]/.test(trimmed)) {
      return '您粘贴的是公钥，SSH 认证需要私钥（以 -----BEGIN 开头），请确认后重试。'
    }
    if (!trimmed.startsWith('-----BEGIN')) {
      return '私钥内容需以 -----BEGIN 开头，请检查输入。'
    }
    return null
  }

  // 密钥校验错误信息
  const keyValidationError =
    formData.authMode === 'key' && formData.privateKeySource === 'content'
      ? validatePrivateKey(formData.privateKey)
      : null

  // 当编辑会话改变时，更新表单数据
  useEffect(() => {
    if (editingSession) {
      const authMode = editingSession.authMethod || (editingSession.privateKey ? 'key' : 'password')
      const privateKeySource = editingSession.privateKeySource || 'content'
      setFormData({
        name: editingSession.name,
        host: editingSession.host,
        port: editingSession.port,
        username: editingSession.username,
        password: editingSession.password || '',
        privateKey: editingSession.privateKey || '',
        passphrase: editingSession.passphrase || '',
        authMode,
        privateKeySource
      })
    } else {
      setFormData({
        name: '',
        host: '',
        port: 22,
        username: '',
        password: '',
        privateKey: '',
        passphrase: '',
        authMode: 'password',
        privateKeySource: 'content'
      })
    }
  }, [editingSession])

  // 处理保存
  const handleSave = async (): Promise<void> => {
    if (!formData.name || !formData.host || !formData.username || saving) return

    try {
      setSaving(true)
      // 对直接输入的密钥内容做换行符规范化
      const normalizedKey =
        formData.authMode === 'key' && formData.privateKeySource === 'content'
          ? formData.privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
          : formData.privateKey
      const sessionConfig: SSHConfig = {
        id: editingSession?.id || `session_${Date.now()}`,
        name: formData.name,
        host: formData.host,
        port: formData.port,
        username: formData.username,
        authMethod: formData.authMode,
        password: formData.authMode === 'key' ? undefined : formData.password,
        privateKey: formData.authMode === 'key' ? normalizedKey : undefined,
        privateKeySource: formData.authMode === 'key' ? formData.privateKeySource : undefined,
        passphrase: formData.authMode === 'key' ? formData.passphrase : undefined
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
  const handleCancel = (): void => {
    setEditingSession(null)
    setFormData({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKey: '',
      passphrase: '',
      authMode: 'password',
      privateKeySource: 'content'
    })
    closeModal()
  }

  // 表单验证
  const isFormValid =
    formData.name.trim() &&
    formData.host.trim() &&
    formData.username.trim() &&
    (formData.authMode === 'key'
      ? formData.privateKey.trim() && !keyValidationError
      : formData.password.trim())

  // 认证方式切换（两个 checkbox 互斥）
  const handleAuthModeChange = (mode: 'password' | 'key'): void => {
    if (mode === formData.authMode) return // 不允许取消选中
    setFormData((prev) => ({
      ...prev,
      authMode: mode,
      password: mode === 'key' ? '' : prev.password,
      privateKey: mode === 'password' ? '' : prev.privateKey,
      privateKeySource: 'content',
      passphrase: mode === 'password' ? '' : prev.passphrase
    }))
  }

  // 密钥来源切换（两个 checkbox 互斥）
  const handleKeySourceChange = (source: 'content' | 'path'): void => {
    if (source === formData.privateKeySource) return // 不允许取消选中
    setFormData((prev) => ({
      ...prev,
      privateKeySource: source,
      privateKey: '' // 切换来源时清空已输入内容
    }))
  }

  // 选择私钥文件
  const handleSelectKeyFile = async (): Promise<void> => {
    try {
      const files = await window.electron.openFileDialog()
      if (files && files.length > 0) {
        setFormData((prev) => ({ ...prev, privateKey: files[0] }))
      }
    } catch (error) {
      console.error('选择私钥文件失败:', error)
    }
  }

  return (
    <SheetModal
      isOpen={isModalOpen}
      onClose={handleCancel}
      title={editingSession ? '编辑会话' : '创建新会话'}
      width="md"
      footer={
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className={twMerge(
              'px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-200',
              'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]'
            )}
            disabled={saving}
          >
            取消
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={twMerge(
              'px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-200',
              'text-white bg-[var(--ash-accent)] hover:opacity-90',
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
      }
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              spellCheck={false}
              className={twMerge(
                'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-primary)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                'placeholder-[var(--color-text-tertiary)]'
              )}
              placeholder="会话名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              主机地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.host}
              onChange={(e) => setFormData((prev) => ({ ...prev, host: e.target.value }))}
              spellCheck={false}
              className={twMerge(
                'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-primary)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                'placeholder-[var(--color-text-tertiary)]'
              )}
              placeholder="服务器IP或域名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              端口
            </label>
            <input
              type="number"
              value={formData.port}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, port: parseInt(e.target.value) || 22 }))
              }
              spellCheck={false}
              className={twMerge(
                'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-primary)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                'placeholder-[var(--color-text-tertiary)]'
              )}
              placeholder="22"
              min="1"
              max="65535"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
              spellCheck={false}
              className={twMerge(
                'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                'border-[var(--color-border-primary)]',
                'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                'placeholder-[var(--color-text-tertiary)]'
              )}
              placeholder="SSH用户名"
            />
          </div>

          {/* 认证方式选择（二选一） */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
              认证方式
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm accent-[var(--ash-accent)]"
                  checked={formData.authMode === 'password'}
                  onChange={() => handleAuthModeChange('password')}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">密码认证</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm accent-[var(--ash-accent)]"
                  checked={formData.authMode === 'key'}
                  onChange={() => handleAuthModeChange('key')}
                />
                <span className="text-sm text-[var(--color-text-secondary)]">密钥认证</span>
              </label>
            </div>
          </div>

          {/* 密码认证字段 */}
          {formData.authMode !== 'key' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                spellCheck={false}
                className={twMerge(
                  'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                  'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                  'border-[var(--color-border-primary)]',
                  'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                  'placeholder-[var(--color-text-tertiary)]'
                )}
                placeholder="SSH密码"
              />
            </div>
          )}

          {/* 密钥认证字段 */}
          {formData.authMode === 'key' && (
            <>
              {/* 密钥来源选择（二选一） */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  密钥来源
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm accent-[var(--ash-accent)]"
                      checked={formData.privateKeySource === 'content'}
                      onChange={() => handleKeySourceChange('content')}
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">直接输入</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm accent-[var(--ash-accent)]"
                      checked={formData.privateKeySource === 'path'}
                      onChange={() => handleKeySourceChange('path')}
                    />
                    <span className="text-sm text-[var(--color-text-secondary)]">选择文件</span>
                  </label>
                </div>
              </div>

              {/* 直接输入密钥内容 */}
              {formData.privateKeySource === 'content' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    私钥内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.privateKey}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, privateKey: e.target.value }))
                    }
                    spellCheck={false}
                    rows={3}
                    style={{ maxHeight: '8rem', resize: 'vertical' }}
                    className={twMerge(
                      'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                      'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                      keyValidationError
                        ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
                        : 'border-[var(--color-border-primary)] focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                      'focus:outline-none',
                      'placeholder-[var(--color-text-tertiary)]',
                      'font-mono text-xs'
                    )}
                    placeholder={
                      '-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----'
                    }
                  />
                  {keyValidationError && (
                    <p className="mt-2 text-xs text-[var(--color-error)] leading-relaxed">
                      {keyValidationError}
                    </p>
                  )}
                </div>
              )}

              {/* 选择密钥文件 */}
              {formData.privateKeySource === 'path' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    私钥文件路径 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.privateKey}
                      readOnly
                      spellCheck={false}
                      className={twMerge(
                        'flex-1 px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                        'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
                        'border-[var(--color-border-primary)]',
                        'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                        'placeholder-[var(--color-text-tertiary)]',
                        'font-mono text-xs cursor-default'
                      )}
                      placeholder="请点击右侧按钮选择私钥文件"
                    />
                    <button
                      type="button"
                      onClick={handleSelectKeyFile}
                      className={twMerge(
                        'px-4 py-2 rounded-[var(--radius-lg)] text-sm font-medium transition-all duration-200 whitespace-nowrap',
                        'text-white bg-[var(--ash-accent)] hover:opacity-90'
                      )}
                    >
                      选择文件
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  口令短语{' '}
                  <span className="text-[var(--color-text-tertiary)] text-xs ml-1">(可选)</span>
                </label>
                <input
                  type="password"
                  value={formData.passphrase}
                  onChange={(e) => setFormData((prev) => ({ ...prev, passphrase: e.target.value }))}
                  spellCheck={false}
                  className={twMerge(
                    'w-full px-3 py-2 rounded-[var(--radius-lg)] border transition-all duration-200',
                    'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]',
                    'border-[var(--color-border-primary)]',
                    'focus:outline-none focus:ring-1 focus:ring-[var(--ash-accent)] focus:border-[var(--ash-accent)]',
                    'placeholder-[var(--color-text-tertiary)]'
                  )}
                  placeholder="私钥口令短语（如果私钥有加密）"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </SheetModal>
  )
}
