import { ConfirmModal } from '@/components/Modal/GeneralModal'
import { useToast } from '@/hooks'
import { AiConfigService } from '@/services'
import { activeProviderIdAtom } from '@/store/AiConfigAtom'
import type { AiProviderConfig } from '@shared/models'
import { useAtom } from 'jotai'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { v4 as uuidv4 } from 'uuid'

type SettingsTab = 'providers' | 'autoApproval' | 'prompt'

export const AiSettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('providers')

  return (
    <div className="flex h-full bg-white dark:bg-gray-900 overflow-hidden">
      {/* 左侧导航 */}
      <div className="flex-[1] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center pb-4">
        <button
          onClick={() => setActiveTab('providers')}
          title="供应商"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'providers'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'
          )}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('autoApproval')}
          title="自动批准"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'autoApproval'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'
          )}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          title="提示词"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'prompt'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-500'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent'
          )}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        </button>
      </div>

      {/* 右侧内容区 */}
      <div className="flex-[4] overflow-y-auto min-w-0">
        {activeTab === 'providers' && <ProvidersSettings isVisible={activeTab === 'providers'} />}
        {activeTab === 'autoApproval' && <AutoApprovalSettings />}
        {activeTab === 'prompt' && <PromptSettings />}
      </div>
    </div>
  )
}

// 供应商设置组件
interface ProvidersSettingsProps {
  isVisible: boolean
}

const ProvidersSettings: React.FC<ProvidersSettingsProps> = ({ isVisible }) => {
  const [providers, setProviders] = useState<AiProviderConfig[]>([])
  const [activeProviderId, setActiveProviderId] = useAtom(activeProviderIdAtom)
  const [editingProvider, setEditingProvider] = useState<AiProviderConfig | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingDeleteProvider, setPendingDeleteProvider] = useState<AiProviderConfig | null>(null)
  const toast = useToast()

  useEffect(() => {
    loadProviders()
    // activeProviderId 已在 useInitializeConfig 中初始化，无需重复加载
  }, [])

  // 当组件可见时，重新加载供应商列表
  useEffect(() => {
    if (isVisible) {
      loadProviders()
    }
  }, [isVisible])

  const loadProviders = async (): Promise<void> => {
    try {
      const providerList = await AiConfigService.getProviders()
      setProviders(providerList)
      // activeProviderId 由全局状态管理，无需在此设置
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const handleCreateNew = (): void => {
    const newProvider: AiProviderConfig = {
      id: uuidv4(),
      configName: '',
      providerType: 'OpenAI Compatible',
      baseUrl: '',
      apiKey: '',
      model: '',
      streaming: true,
      temperature: 0.7,
      maxContextTokens: 10240,
      toolCallProtocol: 'Native JSON'
    }
    setEditingProvider(newProvider)
    setIsCreating(true)
  }

  const handleEdit = (provider: AiProviderConfig): void => {
    setEditingProvider({ ...provider })
    setIsCreating(false)
  }

  const handleSave = async (): Promise<void> => {
    if (!editingProvider) return

    try {
      if (isCreating) {
        await AiConfigService.addProvider(editingProvider)
        toast.simple('供应商配置已创建', { type: 'info' })
      } else {
        await AiConfigService.updateProvider(editingProvider.id, editingProvider)
        toast.simple('供应商配置已更新', { type: 'info' })
      }
      await loadProviders()
      setEditingProvider(null)
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to save provider:', error)
    }
  }

  // 触发删除确认
  const handleAskDelete = (provider: AiProviderConfig): void => {
    setPendingDeleteProvider(provider)
    setConfirmOpen(true)
  }

  // 确认删除
  const handleConfirmDelete = async (): Promise<void> => {
    if (!pendingDeleteProvider) return

    try {
      await AiConfigService.removeProvider(pendingDeleteProvider.id)
      await loadProviders()
      toast.simple('供应商配置已删除', { type: 'info' })
    } catch (error) {
      console.error('Failed to delete provider:', error)
      toast.simple('删除失败', { type: 'error' })
    } finally {
      setConfirmOpen(false)
      setPendingDeleteProvider(null)
    }
  }

  const handleSetActive = async (providerId: string): Promise<void> => {
    try {
      await AiConfigService.setActiveProvider(providerId)
      setActiveProviderId(providerId)
    } catch (error) {
      console.error('Failed to set active provider:', error)
    }
  }

  const handleCancel = (): void => {
    setEditingProvider(null)
    setIsCreating(false)
  }

  if (editingProvider) {
    return (
      <div className="p-6 min-w-0">
        <div className="max-w-2xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {isCreating ? '创建供应商' : '编辑供应商'}
          </h3>

          <div className="space-y-4">
            {/* 配置名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                配置名称
              </label>
              <input
                type="text"
                value={editingProvider.configName}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, configName: e.target.value })
                }
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* API 基础 URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API 基础 URL
              </label>
              <input
                type="text"
                value={editingProvider.baseUrl}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, baseUrl: e.target.value })
                }
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* API 密钥 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                API 密钥
              </label>
              <input
                type="password"
                value={editingProvider.apiKey}
                onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 模型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模型
              </label>
              <input
                type="text"
                value={editingProvider.model}
                onChange={(e) => setEditingProvider({ ...editingProvider, model: e.target.value })}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 温度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                温度 (0-2)
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={editingProvider.temperature ?? 0.7}
                onChange={(e) =>
                  setEditingProvider({
                    ...editingProvider,
                    temperature: parseFloat(e.target.value)
                  })
                }
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 最大上下文 Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                最大上下文 Token
              </label>
              <input
                type="number"
                min="1024"
                step="1024"
                value={editingProvider.maxContextTokens}
                onChange={(e) =>
                  setEditingProvider({
                    ...editingProvider,
                    maxContextTokens: parseInt(e.target.value)
                  })
                }
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 工具调用协议 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                工具调用协议
              </label>
              <select
                value={editingProvider.toolCallProtocol}
                onChange={(e) =>
                  setEditingProvider({
                    ...editingProvider,
                    toolCallProtocol: e.target.value as 'XML' | 'Native JSON'
                  })
                }
                className="select select-info w-full min-w-0 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Native JSON">Native JSON</option>
                <option value="XML">XML</option>
              </select>
            </div>

            {/* 流式响应 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={editingProvider.streaming}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, streaming: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">启用流式响应</label>
            </div>

            {/* 按钮组 */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">供应商配置</h3>
        <button
          onClick={handleCreateNew}
          title="新建供应商配置"
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          暂无供应商配置
        </div>
      ) : (
        <div className="space-y-2 -mr-3 pr-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={twMerge(
                'p-2 rounded-lg border transition-all min-w-0',
                provider.id === activeProviderId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {provider.configName}
                    </div>
                  </div>
                  <div className="text-xs w-24 text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    {provider.model}
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                  {provider.id === activeProviderId ? (
                    <div className="p-1 text-green-600" title="当前激活">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="9" strokeWidth="2" />
                        <circle cx="12" cy="12" r="4" fill="currentColor" />
                      </svg>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                      title="激活"
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
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="编辑"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleAskDelete(provider)}
                    className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 确认删除对话框 */}
      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => {
          setConfirmOpen(false)
          setPendingDeleteProvider(null)
        }}
        onConfirm={handleConfirmDelete}
        title="确认删除"
        message={`确定要删除供应商配置${pendingDeleteProvider ? `「${pendingDeleteProvider.configName}」` : ''}吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
      />
    </div>
  )
}

// 自动批准设置组件
const AutoApprovalSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false)
  const [allowedTools, setAllowedTools] = useState<string[]>([])
  const [allowedPrefixes, setAllowedPrefixes] = useState<string[]>([])
  const [deniedPrefixes, setDeniedPrefixes] = useState<string[]>([])
  const [newTool, setNewTool] = useState('')
  const [newAllowedPrefix, setNewAllowedPrefix] = useState('')
  const [newDeniedPrefix, setNewDeniedPrefix] = useState('')
  const toast = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    try {
      const config = await AiConfigService.getAiConfig()
      const autoApproval = config.userSettings.autoApproval
      setEnabled(autoApproval.enabled)
      setAllowedTools(autoApproval.allowedTools)
      setAllowedPrefixes(autoApproval.commandFilter.allowedCommandPrefixes)
      setDeniedPrefixes(autoApproval.commandFilter.deniedCommandPrefixes)
    } catch (error) {
      console.error('Failed to load auto approval settings:', error)
    }
  }

  const handleSave = async (): Promise<void> => {
    try {
      await AiConfigService.updateAiConfigField('userSettings.autoApproval', {
        enabled,
        allowedTools,
        commandFilter: {
          allowedCommandPrefixes: allowedPrefixes,
          deniedCommandPrefixes: deniedPrefixes
        }
      })
      toast.simple('自动批准设置已保存', { type: 'info' })
    } catch (error) {
      console.error('Failed to save auto approval settings:', error)
      toast.simple('保存失败', { type: 'error' })
    }
  }

  const addTool = (): void => {
    if (newTool.trim() && !allowedTools.includes(newTool.trim())) {
      setAllowedTools([...allowedTools, newTool.trim()])
      setNewTool('')
    }
  }

  const removeTool = (tool: string): void => {
    setAllowedTools(allowedTools.filter((t) => t !== tool))
  }

  const addAllowedPrefix = (): void => {
    if (newAllowedPrefix.trim() && !allowedPrefixes.includes(newAllowedPrefix.trim())) {
      setAllowedPrefixes([...allowedPrefixes, newAllowedPrefix.trim()])
      setNewAllowedPrefix('')
    }
  }

  const removeAllowedPrefix = (prefix: string): void => {
    setAllowedPrefixes(allowedPrefixes.filter((p) => p !== prefix))
  }

  const addDeniedPrefix = (): void => {
    if (newDeniedPrefix.trim() && !deniedPrefixes.includes(newDeniedPrefix.trim())) {
      setDeniedPrefixes([...deniedPrefixes, newDeniedPrefix.trim()])
      setNewDeniedPrefix('')
    }
  }

  const removeDeniedPrefix = (prefix: string): void => {
    setDeniedPrefixes(deniedPrefixes.filter((p) => p !== prefix))
  }

  return (
    <div className="p-6 min-w-0">
      <div className="max-w-2xl min-w-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">自动批准</h3>

        <div className="space-y-6 min-w-0">
          {/* 启用开关 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">启用自动批准</label>
          </div>

          {/* 允许的工具 */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              允许的工具
            </label>
            <div className="mb-2 min-w-0">
              <input
                type="text"
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTool()}
                placeholder="输入工具名称"
                className="min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addTool}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2 break-words min-w-0">
              {allowedTools.map((tool) => (
                <span
                  key={tool}
                  className="inline-flex items-center px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                >
                  {tool}
                  <button onClick={() => removeTool(tool)} className="ml-2 text-red-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 允许的命令前缀 */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              允许的命令前缀
            </label>
            <div className="mb-2 min-w-0">
              <input
                type="text"
                value={newAllowedPrefix}
                onChange={(e) => setNewAllowedPrefix(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAllowedPrefix()}
                placeholder="输入命令前缀"
                className="min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addAllowedPrefix}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2 break-words min-w-0">
              {allowedPrefixes.map((prefix) => (
                <span
                  key={prefix}
                  className="inline-flex items-center px-3 py-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded"
                >
                  {prefix}
                  <button onClick={() => removeAllowedPrefix(prefix)} className="ml-2 text-red-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 禁止的命令前缀 */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              禁止的命令前缀
            </label>
            <div className="mb-2 min-w-0">
              <input
                type="text"
                value={newDeniedPrefix}
                onChange={(e) => setNewDeniedPrefix(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDeniedPrefix()}
                placeholder="输入命令前缀"
                className="min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addDeniedPrefix}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2 break-words min-w-0">
              {deniedPrefixes.map((prefix) => (
                <span
                  key={prefix}
                  className="inline-flex items-center px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded"
                >
                  {prefix}
                  <button onClick={() => removeDeniedPrefix(prefix)} className="ml-2 text-red-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 提示词设置组件
const PromptSettings: React.FC = () => {
  const [userExtraPrompt, setUserExtraPrompt] = useState('')
  const toast = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async (): Promise<void> => {
    try {
      const config = await AiConfigService.getAiConfig()
      setUserExtraPrompt(config.userSettings.userExtraPrompt)
    } catch (error) {
      console.error('Failed to load prompt settings:', error)
    }
  }

  const handleSave = async (): Promise<void> => {
    try {
      await AiConfigService.updateAiConfigField('userSettings.userExtraPrompt', userExtraPrompt)
      toast.simple('提示词设置已保存', { type: 'info' })
    } catch (error) {
      console.error('Failed to save prompt settings:', error)
      toast.simple('保存失败', { type: 'error' })
    }
  }

  return (
    <div className="p-6 min-w-0">
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          用户额外提示词
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              自定义提示词
            </label>
            <textarea
              value={userExtraPrompt}
              onChange={(e) => setUserExtraPrompt(e.target.value)}
              placeholder="在此输入您的自定义提示词，这些内容将被添加到系统提示词中..."
              rows={10}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* 保存按钮 */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
