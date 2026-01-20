import { AIService, AiConfigService, ToolApprovalService } from '@/services'
import { currentSessionIdAtom } from '@/store/SessionStore'
import {
  currentMessagesAtom,
  currentTaskAtom,
  currentThoughtAtom,
  isAiProcessingAtom,
  pendingToolApprovalAtom,
  streamingMessageAtom
} from '@/store/TaskStore'
import type { AiProviderConfig } from '@shared/models'
import { AiMode, MessageRole } from '@shared/models'
import { Message } from '@shared/models/Task'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type RunMode = 'ask' | 'agent'

interface ToolCallInfo {
  name: string
  params: Record<string, any>
  timestamp: number
}

interface ToolResultInfo {
  name: string
  result: any
  timestamp: number
}

interface AiChatViewProps {
  apiConfigError?: string
  onClearError?: () => void
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  apiConfigError: externalApiConfigError,
  onClearError
}) => {
  const [message, setMessage] = useState('')
  const [runMode, setRunMode] = useState<RunMode>('agent')
  const [providers, setProviders] = useState<AiProviderConfig[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>('')
  const [toolCalls, setToolCalls] = useState<ToolCallInfo[]>([])
  const [toolResults, setToolResults] = useState<ToolResultInfo[]>([])
  const [apiConfigError, setApiConfigError] = useState<string>('')

  // 合并外部和内部的错误状态
  const displayError = externalApiConfigError || apiConfigError
  const handleClearError = (): void => {
    setApiConfigError('')
    onClearError?.()
  }

  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [currentTask, setCurrentTask] = useAtom(currentTaskAtom)
  const [messages, setMessages] = useAtom(currentMessagesAtom)
  const [isProcessing, setIsProcessing] = useAtom(isAiProcessingAtom)
  const [streamingMessage, setStreamingMessage] = useAtom(streamingMessageAtom)
  const [currentThought, setCurrentThought] = useAtom(currentThoughtAtom)
  const [pendingApproval, setPendingApproval] = useAtom(pendingToolApprovalAtom)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventCleanupRef = useRef<Array<() => void>>([])
  const listenersSetupRef = useRef(false)

  // 自动滚动到底部
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, currentThought, toolCalls, toolResults])

  // 加载供应商列表
  useEffect(() => {
    const loadProviders = async (): Promise<void> => {
      try {
        const providerList = await AiConfigService.getProviders()
        setProviders(providerList)

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

  // 初始化会话（确保 Agent 存在并加载当前任务）
  useEffect(() => {
    if (!currentSessionId) {
      // 当 SSH 连接断开时，清空对话消息
      setMessages([])
      setStreamingMessage('')
      setCurrentThought('')
      setToolCalls([])
      setToolResults([])
      setIsProcessing(false)
      setCurrentTask(null)
      return
    }

    const initSession = async (): Promise<void> => {
      try {
        setApiConfigError('') // 清除之前的错误

        // 加载当前会话的任务（如果存在）
        const task = await AIService.getCurrentTask(currentSessionId)
        setCurrentTask(task)

        // 只有在没有当前任务时才初始化新任务准备
        // 这样避免在切换任务后清空消息
        if (!task) {
          await AIService.prepareNewTask(currentSessionId)
        }
      } catch (error) {
        console.error('Failed to initialize session:', error)
        // 检查是否是 API Key 配置错误
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (
          errorMessage.includes('API Key 未配置') ||
          errorMessage.includes('API Key') ||
          errorMessage.includes('OpenAI 客户端失败')
        ) {
          setApiConfigError('API 配置有误，请检查您的 API Key 配置')
        }
      }
    }

    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  // 监听 currentTask 变化，加载对应的消息列表
  useEffect(() => {
    if (!currentSessionId || !currentTask) {
      setMessages([])
      return
    }

    // 当任务切换时，加载该任务的消息列表
    if (currentTask.messages) {
      setMessages(currentTask.messages)
      // 清空流式输出和思考过程
      setStreamingMessage('')
      setCurrentThought('')
      setToolCalls([])
      setToolResults([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask])

  // 清理事件监听器
  const cleanupEventListeners = (): void => {
    eventCleanupRef.current.forEach((cleanup) => cleanup())
    eventCleanupRef.current = []
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupEventListeners()
    }
  }, [])

  // 监听工具审批请求
  useEffect(() => {
    if (!currentSessionId) return

    const unsubscribe = ToolApprovalService.onToolApprovalRequest(currentSessionId, (request) => {
      setPendingApproval({
        requestId: request.requestId,
        sessionId: request.sessionId,
        toolName: request.toolName,
        params: request.params,
        reason: request.reason
      })
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  // 当会话切换时，重置监听器状态
  useEffect(() => {
    listenersSetupRef.current = false
    cleanupEventListeners()
  }, [currentSessionId])

  const changeSelectedProviderId = async (providerId: string): Promise<void> => {
    try {
      await AiConfigService.setActiveProvider(providerId)
      setSelectedProviderId(providerId)
    } catch (error) {
      console.error('Failed to set active provider:', error)
    }
  }

  const handleSend = async (): Promise<void> => {
    if (!message.trim() || !currentSessionId) return

    const userMessage = message.trim()
    setMessage('')
    setIsProcessing(true)
    setToolCalls([])
    setToolResults([])

    // 立即添加用户消息到对话列表
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      taskId: currentTask?.id || '',
      role: MessageRole.USER,
      content: userMessage,
      createdAt: Date.now(),
      index: messages.length
    }
    setMessages((prev) => [...prev, userMsg])

    // 仅在第一次发送消息时设置监听器
    if (!listenersSetupRef.current) {
      listenersSetupRef.current = true

      // 设置新的监听器
      const streamCleanup = AIService.onTaskStream(currentSessionId, (data) => {
        setStreamingMessage((prev) => prev + data.content)
      })

      const thoughtCleanup = AIService.onTaskThought(currentSessionId, (data) => {
        setCurrentThought(data.content)
      })

      const answerCleanup = AIService.onTaskAnswer(currentSessionId, async () => {
        // 任务回答完成，重新加载任务获取最新消息
        try {
          const task = await AIService.getCurrentTask(currentSessionId)
          if (task && task.messages) {
            setMessages(task.messages)
          }
        } catch (error) {
          console.error('Failed to reload task messages:', error)
        }
        setStreamingMessage('')
        setCurrentThought('')
      })

      const toolCallCleanup = AIService.onTaskToolCall(currentSessionId, (data) => {
        setToolCalls((prev) => [
          ...prev,
          {
            name: data.name,
            params: data.params,
            timestamp: Date.now()
          }
        ])
      })

      const toolResultCleanup = AIService.onTaskToolResult(currentSessionId, (data) => {
        setToolResults((prev) => [
          ...prev,
          {
            name: data.name,
            result: data.result,
            timestamp: Date.now()
          }
        ])
      })

      const taskDoneCleanup = AIService.onTaskDone(currentSessionId, () => {
        setIsProcessing(false)
      })

      const taskErrorCleanup = AIService.onTaskError(currentSessionId, (error) => {
        console.error('Task error:', error)
        setIsProcessing(false)
      })

      eventCleanupRef.current = [
        streamCleanup,
        thoughtCleanup,
        answerCleanup,
        toolCallCleanup,
        toolResultCleanup,
        taskDoneCleanup,
        taskErrorCleanup
      ]
    }

    try {
      const mode = runMode === 'agent' ? AiMode.AGENT : AiMode.ASK
      await AIService.askTask(currentSessionId, userMessage, mode)
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsProcessing(false)
    }
  }

  const handleStop = async (): Promise<void> => {
    if (!currentSessionId) return
    try {
      await AIService.stopTask(currentSessionId)
      setIsProcessing(false)
      setStreamingMessage('')
      setCurrentThought('')
    } catch (error) {
      console.error('Failed to stop task:', error)
    }
  }

  const handleApprove = async (): Promise<void> => {
    if (!pendingApproval) return
    try {
      await ToolApprovalService.approveToolExecution(pendingApproval.requestId)
      setPendingApproval(null)
    } catch (error) {
      console.error('Failed to approve tool:', error)
    }
  }

  const handleReject = async (): Promise<void> => {
    if (!pendingApproval) return
    try {
      await ToolApprovalService.rejectToolExecution(pendingApproval.requestId)
      setPendingApproval(null)
    } catch (error) {
      console.error('Failed to reject tool:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const renderMessage = (msg: Message): React.JSX.Element => {
    if (msg.role === MessageRole.USER) {
      return (
        <div
          key={msg.id}
          className="flex justify-end mb-4 animate-in slide-in-from-right duration-300"
        >
          <div className="max-w-[70%] bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        </div>
      )
    } else if (msg.role === MessageRole.ASSISTANT) {
      return (
        <div
          key={msg.id}
          className="flex justify-start mb-4 animate-in slide-in-from-left duration-300"
        >
          <div className="max-w-[70%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
              {msg.content}
            </p>
          </div>
        </div>
      )
    } else if (msg.role === MessageRole.TOOL) {
      return (
        <div key={msg.id} className="flex justify-start mb-4 animate-in fade-in duration-300">
          <div className="max-w-[70%] bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mb-2 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              工具执行结果
            </p>
            <details className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
              <summary className="cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                查看结果
              </summary>
              <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs overflow-x-auto overflow-y-auto max-h-40 max-w-[210px] border border-gray-200 dark:border-gray-700 whitespace-pre">
                {msg.content}
              </pre>
            </details>
          </div>
        </div>
      )
    }
    return <div key={msg.id}></div>
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* API 配置错误提示卡片 */}
      {displayError && (
        <div className="mx-4 mt-4 mb-2">
          <div className="alert alert-error bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">{displayError}</p>
              </div>
              <button
                onClick={handleClearError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话记录显示区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streamingMessage && !currentThought ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
            {currentSessionId ? '请输入您的任务开始对话' : '请先连接 SSH 会话'}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg) => renderMessage(msg))}

            {/* 思考过程 */}
            {currentThought && (
              <div className="flex justify-start mb-4 animate-in fade-in duration-300">
                <div className="max-w-[70%] bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800/50 rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-xs text-purple-700 dark:text-purple-400 font-semibold mb-2 flex items-center gap-1">
                    <span className="inline-block animate-pulse">💭</span>
                    思考中...
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                    {currentThought}
                  </p>
                </div>
              </div>
            )}

            {/* 工具调用记录 */}
            {toolCalls.map((toolCall, index) => (
              <div
                key={`tool-call-${index}`}
                className="flex justify-start mb-4 animate-in slide-in-from-left duration-300"
              >
                <div className="max-w-[70%] bg-sky-50 dark:bg-sky-900/10 border border-sky-200 dark:border-sky-800/50 rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-xs text-sky-700 dark:text-sky-400 font-semibold mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    调用工具：{toolCall.name}
                  </p>
                  <details className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
                    <summary className="cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
                      查看参数
                    </summary>
                    <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs overflow-x-auto overflow-y-auto max-h-60 max-w-[210px] border border-gray-200 dark:border-gray-700 whitespace-pre">
                      {JSON.stringify(toolCall.params, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}

            {/* 工具执行结果 */}
            {toolResults.map((toolResult, index) => (
              <div
                key={`tool-result-${index}`}
                className="flex justify-start mb-4 animate-in slide-in-from-left duration-300"
              >
                <div className="max-w-[70%] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    工具结果：{toolResult.name}
                  </p>
                  <details className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
                    <summary className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                      查看结果
                    </summary>
                    <pre className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg text-xs overflow-x-auto overflow-y-auto max-h-40 max-w-[210px] border border-gray-200 dark:border-gray-700 whitespace-pre">
                      {typeof toolResult.result === 'string'
                        ? toolResult.result
                        : JSON.stringify(toolResult.result, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ))}

            {/* 加载动画 */}
            {isProcessing && !streamingMessage && !currentThought && (
              <div className="flex justify-start mb-4 animate-in fade-in duration-300">
                <div className="max-w-[70%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">AI 正在思考...</span>
                  </div>
                </div>
              </div>
            )}

            {/* 流式输出 */}
            {streamingMessage && (
              <div className="flex justify-start mb-4 animate-in slide-in-from-left duration-300">
                <div className="max-w-[70%] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 dark:text-gray-200">
                    {streamingMessage}
                    <span className="inline-block w-1 h-4 ml-1 bg-blue-500 animate-pulse"></span>
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 工具审批对话框 */}
      {pendingApproval && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                工具调用请求：{pendingApproval.toolName}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                {pendingApproval.reason}
              </p>
              <details className="text-xs text-gray-600 dark:text-gray-400 min-w-0">
                <summary className="cursor-pointer">查看参数</summary>
                <pre className="mt-1 p-2 bg-white dark:bg-gray-800 rounded text-xs overflow-x-auto overflow-y-auto max-h-60 max-w-[180px] whitespace-pre">
                  {JSON.stringify(pendingApproval.params, null, 2)}
                </pre>
              </details>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleApprove}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                title="批准"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
              <button
                onClick={handleReject}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="拒绝"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 输入框区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        {/* 输入框 */}
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={currentSessionId ? '在此处输入您的任务...' : '请先连接 SSH 会话'}
            disabled={!currentSessionId || isProcessing}
            className="w-full min-h-[80px] max-h-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* 底部控制栏 */}
        <div className="flex items-center justify-between mt-2">
          {/* 左侧选择器 */}
          <div className="flex items-center space-x-3">
            {/* 运行模式选择 */}
            <div className="flex items-center space-x-2">
              <select
                value={runMode}
                onChange={(e) => setRunMode(e.target.value as RunMode)}
                disabled={!currentSessionId || isProcessing}
                className="select select-info h-7 w-18 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="ask">Ask</option>
                <option value="agent">Agent</option>
              </select>
            </div>
          </div>

          {/* 右侧控制区 */}
          <div className="flex items-center space-x-3">
            {/* 供应商选择 */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedProviderId}
                onChange={(e) => changeSelectedProviderId(e.target.value)}
                disabled={providers.length === 0 || isProcessing}
                className="select select-info h-7 w-24 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* 发送/停止按钮 */}
            {isProcessing ? (
              <button
                onClick={handleStop}
                className="px-4 py-1.5 text-xs rounded-lg transition-colors font-medium bg-red-500 hover:bg-red-600 text-white"
              >
                停止
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!message.trim() || providers.length === 0 || !currentSessionId}
                className={twMerge(
                  'px-4 py-1.5 text-xs rounded-lg transition-colors font-medium',
                  message.trim() && providers.length > 0 && currentSessionId
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500'
                )}
              >
                发送
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
