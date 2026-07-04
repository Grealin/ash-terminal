import { Icon } from '@/components/Icon'
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
    <div className="flex h-full min-w-[248px] bg-[var(--color-bg-primary)] overflow-hidden">
      {/* 左侧导航 */}
      <div className="flex-[1] flex-shrink-0 border-r border-gray-200 dark:border-[var(--color-border-primary)] flex flex-col items-center pb-4">
        <button
          onClick={() => setActiveTab('providers')}
          title="供应商"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'providers'
              ? 'bg-[var(--ash-accent)]-subtle text-[var(--ash-accent)] border-[var(--ash-accent)]'
              : 'text-gray-700 dark:text-[var(--color-text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--color-bg-tertiary)] border-transparent'
          )}
        >
          <Icon name="server" size="lg" />
        </button>
        <button
          onClick={() => setActiveTab('autoApproval')}
          title="自动批准"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'autoApproval'
              ? 'bg-[var(--ash-accent)]-subtle text-[var(--ash-accent)] border-[var(--ash-accent)]'
              : 'text-gray-700 dark:text-[var(--color-text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--color-bg-tertiary)] border-transparent'
          )}
        >
          <Icon name="check-circle" size="lg" />
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          title="提示词"
          className={twMerge(
            'w-full py-3 flex items-center justify-center transition-colors border-l-2',
            activeTab === 'prompt'
              ? 'bg-[var(--ash-accent)]-subtle text-[var(--ash-accent)] border-[var(--ash-accent)]'
              : 'text-gray-700 dark:text-[var(--color-text-secondary)] hover:bg-gray-50 dark:hover:bg-[var(--color-bg-tertiary)] border-transparent'
          )}
        >
          <Icon name="message-square" size="lg" />
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--color-text-primary)] mb-4">
            {isCreating ? '创建供应商' : '编辑供应商'}
          </h3>

          <div className="space-y-4">
            {/* 配置名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
                配置名称
              </label>
              <input
                type="text"
                value={editingProvider.configName}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, configName: e.target.value })
                }
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* API 基础 URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
                API 基础 URL
              </label>
              <input
                type="text"
                value={editingProvider.baseUrl}
                onChange={(e) =>
                  setEditingProvider({ ...editingProvider, baseUrl: e.target.value })
                }
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* API 密钥 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
                API 密钥
              </label>
              <input
                type="password"
                value={editingProvider.apiKey}
                onChange={(e) => setEditingProvider({ ...editingProvider, apiKey: e.target.value })}
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* 模型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
                模型
              </label>
              <input
                type="text"
                value={editingProvider.model}
                onChange={(e) => setEditingProvider({ ...editingProvider, model: e.target.value })}
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* 温度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
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
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* 最大上下文 Token */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
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
                spellCheck={false}
                className="w-full min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
            </div>

            {/* 工具调用协议 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-1">
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
                className="select w-full min-w-0 px-3 py-2 text-xs border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
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
                className="w-4 h-4 text-[var(--ash-accent)] border-gray-300 rounded focus:ring-[var(--ash-accent)]"
              />
              <label className="ml-2 text-sm text-gray-700 dark:text-[var(--color-text-secondary)]">
                启用流式响应
              </label>
            </div>

            {/* 按钮组 */}
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 text-xs bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
              >
                保存
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-xs bg-gray-300 hover:bg-gray-400 dark:bg-[var(--color-bg-tertiary)] dark:hover:bg-gray-600 text-gray-700 dark:text-[var(--color-text-secondary)] rounded transition-colors"
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--color-text-primary)]">
          供应商配置
        </h3>
        <button
          onClick={handleCreateNew}
          title="新建供应商配置"
          className="p-2 bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
        >
          <Icon name="plus" size="xs" />
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-[var(--color-text-tertiary)] text-sm">
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
                  ? 'border-[var(--ash-accent)] bg-[var(--ash-accent)]-subtle'
                  : 'border-gray-200 dark:border-[var(--color-border-primary)] hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className="flex items-center justify-between min-w-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-[var(--color-text-primary)] truncate">
                      {provider.configName}
                    </div>
                  </div>
                  <div className="text-xs w-24 text-gray-500 dark:text-[var(--color-text-tertiary)] mt-0.5 truncate">
                    {provider.model}
                  </div>
                </div>

                <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                  {provider.id === activeProviderId ? (
                    <div className="p-1 text-green-600" title="当前激活">
                      <Icon name="circle-dot" size="sm" />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetActive(provider.id)}
                      className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors"
                      title="激活"
                    >
                      <Icon name="check-circle" size="sm" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(provider)}
                    className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-[var(--color-bg-tertiary)] transition-colors"
                    title="编辑"
                  >
                    <Icon name="pencil" size="sm" />
                  </button>
                  <button
                    onClick={() => handleAskDelete(provider)}
                    className="p-1 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                    title="删除"
                  >
                    <Icon name="trash-2" size="sm" />
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
  const [availableTools, setAvailableTools] = useState<
    Array<{ name: string; description: string }>
  >([])
  const [selectedTool, setSelectedTool] = useState('')
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

      // 加载可用工具列表
      const tools = await AiConfigService.getAvailableToolsWithInfo()
      setAvailableTools(tools)
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
    if (selectedTool && !allowedTools.includes(selectedTool)) {
      setAllowedTools([...allowedTools, selectedTool])
      setSelectedTool('')
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--color-text-primary)] mb-4">
          自动批准
        </h3>

        <div className="space-y-6 min-w-0">
          {/* 启用开关 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4 text-[var(--ash-accent)] border-gray-300 rounded focus:ring-[var(--ash-accent)]"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-[var(--color-text-secondary)]">
              启用自动批准
            </label>
          </div>

          {/* 允许的工具 */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-2">
              允许的工具
            </label>
            <div className="mb-2 min-w-0">
              <select
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="w-45 select px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              >
                <option value="">选择工具</option>
                {availableTools
                  .filter((tool) => !allowedTools.includes(tool.name))
                  .map((tool) => (
                    <option key={tool.name} value={tool.name} title={tool.description}>
                      {tool.name}
                    </option>
                  ))}
              </select>
              <button
                onClick={addTool}
                disabled={!selectedTool}
                className="mt-2 px-3 py-1.5 text-xs bg-[var(--ash-accent)] hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2 break-words min-w-0">
              {allowedTools.map((tool) => {
                const toolInfo = availableTools.find((t) => t.name === tool)
                return (
                  <span
                    key={tool}
                    title={toolInfo?.description || tool}
                    className="inline-flex items-center px-3 py-1 text-sm bg-gray-200 dark:bg-[var(--color-bg-tertiary)] text-gray-700 dark:text-[var(--color-text-secondary)] rounded"
                  >
                    {tool}
                    <button onClick={() => removeTool(tool)} className="ml-2 text-red-500">
                      ×
                    </button>
                  </span>
                )
              })}
            </div>
          </div>

          {/* 允许的命令前缀 */}
          <div className="min-w-0">
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-2">
              允许的命令前缀
            </label>
            <div className="mb-2 min-w-0">
              <input
                type="text"
                value={newAllowedPrefix}
                onChange={(e) => setNewAllowedPrefix(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAllowedPrefix()}
                placeholder="输入命令前缀"
                spellCheck={false}
                className="w-45 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
              <button
                onClick={addAllowedPrefix}
                className="mt-2 px-3 py-1.5 text-xs bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-2">
              禁止的命令前缀
            </label>
            <div className="mb-2 min-w-0">
              <input
                type="text"
                value={newDeniedPrefix}
                onChange={(e) => setNewDeniedPrefix(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addDeniedPrefix()}
                placeholder="输入命令前缀"
                spellCheck={false}
                className="w-45 px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)]"
              />
              <button
                onClick={addDeniedPrefix}
                className="mt-2 px-3 py-1.5 text-xs bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
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
              className="px-4 py-2 text-xs bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-[var(--color-text-primary)] mb-4">
          用户额外提示词
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-[var(--color-text-secondary)] mb-2">
              自定义提示词
            </label>
            <textarea
              value={userExtraPrompt}
              onChange={(e) => setUserExtraPrompt(e.target.value)}
              placeholder="在此输入您的自定义提示词，这些内容将被添加到系统提示词中..."
              rows={10}
              spellCheck={false}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-[var(--color-border-primary)] rounded bg-[var(--color-bg-primary)] text-gray-900 dark:text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ash-accent)] resize-none"
            />
          </div>

          {/* 保存按钮 */}
          <div className="pt-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs bg-[var(--ash-accent)] hover:opacity-90 text-white rounded transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
