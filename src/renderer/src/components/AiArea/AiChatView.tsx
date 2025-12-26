import { AiConfigService } from '@/services'
import type { AiProviderConfig } from '@shared/models'
import { useEffect, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type RunMode = 'Ask' | 'Agent'

export const AiChatView: React.FC = () => {
  const [message, setMessage] = useState('')
  const [runMode, setRunMode] = useState<RunMode>('Agent')
  const [providers, setProviders] = useState<AiProviderConfig[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')

  // 加载供应商列表
  useEffect(() => {
    const loadProviders = async (): Promise<void> => {
      try {
        const providerList = await AiConfigService.getProviders()
        setProviders(providerList)

        // 获取并设置当前激活的供应商
        const activeProvider = await AiConfigService.getActiveProvider()
        if (activeProvider) {
          setSelectedProviderId(activeProvider.id)
        } else if (providerList.length > 0) {
          setSelectedProviderId(providerList[0].id)
        }
      } catch (error) {
        console.error('Failed to load providers:', error)
      }
    }

    loadProviders()
  }, [])

  const handleSend = (): void => {
    if (!message.trim()) return
    // TODO: 实现发送消息逻辑
    console.log('Sending message:', { message, runMode, selectedProviderId })
    setMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* 对话记录显示区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
          暂无对话记录
        </div>
      </div>

      {/* 输入框区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        {/* 输入框 */}
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="在此处输入您的任务... (@添加上下文, /输入命令, Shift+拖拽文件/图片)"
            className="w-full min-h-[80px] max-h-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none"
          />
        </div>

        {/* 底部控制栏 */}
        <div className="flex items-center justify-between mt-2">
          {/* 左侧选择器 */}
          <div className="flex items-center space-x-3">
            {/* 运行模式选择 */}
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">模式:</label>
              <select
                value={runMode}
                onChange={(e) => setRunMode(e.target.value as RunMode)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Ask">Ask</option>
                <option value="Agent">Agent</option>
              </select>
            </div>

            {/* 供应商选择 */}
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-600 dark:text-gray-400">供应商:</label>
              <select
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={providers.length === 0}
              >
                {providers.length === 0 ? (
                  <option value="">暂无配置</option>
                ) : (
                  providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.configName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* 右侧发送按钮 */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || providers.length === 0}
            className={twMerge(
              'px-4 py-1.5 text-xs rounded-lg transition-colors font-medium',
              message.trim() && providers.length > 0
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
            )}
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
