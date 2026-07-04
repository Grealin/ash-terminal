import { Icon } from '@/components/Icon'
import { ToolCallCard } from './ToolCallCard'
import MarkdownRenderer from './MarkdownRenderer'
import { AIService, AiConfigService, ToolApprovalService } from '@/services'
import { useToast } from '@/hooks'
import { activeProviderIdAtom } from '@/store/AiConfigAtom'
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
import { AiErrorSeverity, AiTaskError } from '@shared/models/AiError'
import { Message, Task } from '@shared/models/Task'
import { useAtom, useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { twMerge } from 'tailwind-merge'

type RunMode = 'ask' | 'agent'

interface ToolExecutionRecord {
  id: string
  name: string
  params: Record<string, any>
  result?: any
  timestamp: number
  status: 'calling' | 'completed'
}

interface AiChatViewProps {
  apiConfigError?: string
  onClearError?: () => void
  isVisible?: boolean
  onNavigateToSettings?: () => void
}

export const AiChatView: React.FC<AiChatViewProps> = ({
  apiConfigError: externalApiConfigError,
  onClearError,
  isVisible,
  onNavigateToSettings
}) => {
  const [message, setMessage] = useState('')
  const [runMode, setRunMode] = useState<RunMode>('agent')
  const [providers, setProviders] = useState<AiProviderConfig[]>([])
  const [selectedProviderId, setSelectedProviderId] = useAtom(activeProviderIdAtom)
  const [toolExecutions, setToolExecutions] = useState<ToolExecutionRecord[]>([])
  const [providerDropdownOpen, setProviderDropdownOpen] = useState(false)
  const providerDropdownRef = useRef<HTMLDivElement>(null)
  const [apiConfigError, setApiConfigError] = useState<string>('')
  const [aiErrors, setAiErrors] = useState<
    Array<{ id: string; error: AiTaskError; timestamp: number }>
  >([])

  // 合并外部和内部的错误状态
  const displayError = externalApiConfigError || apiConfigError
  const handleClearError = (): void => {
    setApiConfigError('')
    setAiErrors([])
    onClearError?.()
  }

  const currentSessionId = useAtomValue(currentSessionIdAtom)
  const [currentTask, setCurrentTask] = useAtom(currentTaskAtom)
  const [messages, setMessages] = useAtom(currentMessagesAtom)
  const [isProcessing, setIsProcessing] = useAtom(isAiProcessingAtom)
  const [streamingMessage, setStreamingMessage] = useAtom(streamingMessageAtom)
  const [currentThought, setCurrentThought] = useAtom(currentThoughtAtom)
  const [pendingApproval, setPendingApproval] = useAtom(pendingToolApprovalAtom)
  const toast = useToast()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const eventCleanupRef = useRef<Array<() => void>>([])
  const listenersSetupRef = useRef(false)
  const taskIdRef = useRef<string | null>(null) // 跟踪上一个任务 ID

  // 自动滚动到底部
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, currentThought, toolExecutions])

  // 加载供应商列表
  useEffect(() => {
    const loadProviders = async (): Promise<void> => {
      try {
        const providerList = await AiConfigService.getProviders()
        setProviders(providerList)

        // activeProviderId 已在 useInitializeConfig 中初始化，这里只需确保有默认值
        const activeProvider = await AiConfigService.getActiveProvider()
        if (activeProvider) {
          setSelectedProviderId(activeProvider.id)
        } else if (providerList.length > 0) {
          // 如果配置文件中没有激活的供应商，设置第一个为默认
          setSelectedProviderId(providerList[0].id)
          await AiConfigService.setActiveProvider(providerList[0].id)
        }
      } catch (error) {
        console.error('Failed to load providers:', error)
      }
    }

    loadProviders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 当组件可见时，重新加载供应商列表
  useEffect(() => {
    if (isVisible) {
      const loadProviders = async (): Promise<void> => {
        try {
          const providerList = await AiConfigService.getProviders()
          setProviders(providerList)

          const activeProvider = await AiConfigService.getActiveProvider()
          if (activeProvider) {
            setSelectedProviderId(activeProvider.id)
          }
        } catch (error) {
          console.error('Failed to refresh providers:', error)
        }
      }

      loadProviders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  // 初始化会话（确保 Agent 存在并加载当前任务）
  useEffect(() => {
    if (!currentSessionId) {
      // 当 SSH 连接断开时，清空对话消息
      setMessages([])
      setStreamingMessage('')
      setCurrentThought('')
      setToolExecutions([])
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
          // 创建临时任务对象
          const tempTask: Task = {
            id: `temp-${Date.now()}`,
            sessionId: currentSessionId,
            name: '新任务',
            createdAt: Date.now(),
            messages: [],
            messageCount: 0
          }
          setCurrentTask(tempTask)
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
          setApiConfigError('API 配置有误，请检查您的配置后创建新的任务。')
        }
      }
    }

    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId])

  // 监听 currentTask 变化，加载对应的消息列表
  useEffect(() => {
    if (!currentSessionId) {
      return
    }

    const newTaskId = currentTask?.id || null
    const oldTaskId = taskIdRef.current

    // 判断是否是临时任务升级为真实任务
    // 临时任务升级：旧任务是 temp-xxx，新任务不是 temp-xxx
    const isTempTaskUpgrade =
      oldTaskId?.startsWith('temp-') && newTaskId && !newTaskId.startsWith('temp-')

    // 只在真正的任务切换时清理监听器和资源
    // 临时任务升级为真实任务时，保持监听器继续工作
    if (!isTempTaskUpgrade) {
      cleanupEventListeners()
      setStreamingMessage('')
      setCurrentThought('')
      setToolExecutions([])
    }

    // 更新任务 ID 引用
    taskIdRef.current = newTaskId

    if (!currentTask) {
      setMessages([])
      return
    }

    // 加载该任务的消息列表
    if (currentTask.messages) {
      setMessages(currentTask.messages)
    } else {
      // 临时任务或新任务，消息列表为空
      setMessages([])
    }

    // 清理函数：组件卸载或下次任务变化前执行
    // 这里不执行清理，因为已经在上面判断后执行了
    // 避免重复清理和清理时机错误
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTask?.id, currentSessionId]) // 监听任务 ID 和会话 ID 的变化

  // 清理事件监听器
  const cleanupEventListeners = (): void => {
    eventCleanupRef.current.forEach((cleanup) => cleanup())
    eventCleanupRef.current = []
    listenersSetupRef.current = false
  }

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      cleanupEventListeners()
    }
  }, [])

  // 点击外部关闭下拉
  useEffect(() => {
    if (!providerDropdownOpen) return
    const handler = (e: MouseEvent): void => {
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(e.target as Node)) {
        setProviderDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [providerDropdownOpen])

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

  // 当会话切换时，清理监听器状态和重置任务引用
  useEffect(() => {
    cleanupEventListeners()
    taskIdRef.current = null // 重置任务 ID 引用
    setAiErrors([]) // 清空错误气泡
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
      // 先清理可能存在的旧监听器（确保清理彻底）
      cleanupEventListeners()
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
            // 如果当前是临时任务（ID 以 temp- 开头），替换为真实任务
            if (currentTask?.id.startsWith('temp-')) {
              setCurrentTask(task)
            }
          }
        } catch (error) {
          console.error('Failed to reload task messages:', error)
        }
        setStreamingMessage('')
        setCurrentThought('')
      })

      const toolCallCleanup = AIService.onTaskToolCall(currentSessionId, (data) => {
        const recordId = `tool-${Date.now()}-${Math.random()}`
        setToolExecutions((prev) => [
          ...prev,
          {
            id: recordId,
            name: data.name,
            params: data.params,
            timestamp: Date.now(),
            status: 'calling'
          }
        ])
      })

      const toolResultCleanup = AIService.onTaskToolResult(currentSessionId, (data) => {
        setToolExecutions((prev) => {
          // 查找最近的匹配工具调用记录
          const lastCallIndex = [...prev]
            .reverse()
            .findIndex((record) => record.name === data.name && record.status === 'calling')

          if (lastCallIndex !== -1) {
            const actualIndex = prev.length - 1 - lastCallIndex
            const updated = [...prev]
            updated[actualIndex] = {
              ...updated[actualIndex],
              result: data.result,
              status: 'completed'
            }
            return updated
          }

          // 如果没找到对应的调用记录，创建一个新的完成记录
          return [
            ...prev,
            {
              id: `tool-${Date.now()}-${Math.random()}`,
              name: data.name,
              params: {},
              result: data.result,
              timestamp: Date.now(),
              status: 'completed'
            }
          ]
        })
      })

      const taskDoneCleanup = AIService.onTaskDone(currentSessionId, () => {
        setIsProcessing(false)
      })

      const taskErrorCleanup = AIService.onTaskError(currentSessionId, (error: AiTaskError) => {
        console.error('Task error:', error)
        setIsProcessing(false)

        // 1. Toast 通知
        toast.error(error.title, {
          position: 'top-center',
          duration: error.severity === AiErrorSeverity.CONFIGURATION ? 0 : 5000
        })

        // 2. 错误气泡加入聊天（去重：同类型错误替换而非追加）
        setAiErrors((prev) => {
          const filtered = prev.filter((e) => e.error.type !== error.type)
          return [
            ...filtered,
            { id: `err-${Date.now()}-${Math.random()}`, error, timestamp: Date.now() }
          ]
        })

        // 3. 配置类错误同时设置横幅
        if (error.severity === AiErrorSeverity.CONFIGURATION) {
          setApiConfigError(`${error.title}: ${error.message}\n\n${error.suggestion}`)
        }
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
      const errorMessage = error instanceof Error ? error.message : String(error)
      toast.error(`发送消息失败：${errorMessage}`)
      setApiConfigError(`发送消息失败：${errorMessage}。如若配置无误请创建新的任务重试。`)
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

  // 根据消息的时间戳查找对应的工具执行记录
  const findToolExecutionForMessage = (msg: Message): ToolExecutionRecord | undefined => {
    if (msg.role !== MessageRole.TOOL) return undefined

    // 查找时间戳最接近且在消息之前的已完成工具执行记录
    const matchingExecution = toolExecutions
      .filter((exec) => exec.status === 'completed' && exec.timestamp <= msg.createdAt)
      .sort(
        (a, b) => Math.abs(msg.createdAt - a.timestamp) - Math.abs(msg.createdAt - b.timestamp)
      )[0]

    return matchingExecution
  }

  // 获取所有已经与 TOOL 消息或 observation 消息绑定的工具执行记录 ID
  const getBoundToolExecutionIds = (): Set<string> => {
    const boundIds = new Set<string>()
    messages.forEach((msg) => {
      // TOOL 消息绑定的工具执行记录
      if (msg.role === MessageRole.TOOL) {
        const execution = findToolExecutionForMessage(msg)
        if (execution) {
          boundIds.add(execution.id)
        }
      }
      // observation 消息绑定的工具执行记录
      if (msg.role === MessageRole.USER && hasObservationTag(msg.content)) {
        const execution = toolExecutions
          .filter((exec) => exec.status === 'completed' && exec.timestamp <= msg.createdAt)
          .sort(
            (a, b) => Math.abs(msg.createdAt - a.timestamp) - Math.abs(msg.createdAt - b.timestamp)
          )[0]
        if (execution) {
          boundIds.add(execution.id)
        }
      }
    })
    return boundIds
  }

  // 获取未绑定的工具执行记录（用于实时显示）
  const getUnboundToolExecutions = (): ToolExecutionRecord[] => {
    const boundIds = getBoundToolExecutionIds()
    return toolExecutions.filter((exec) => !boundIds.has(exec.id))
  }

  // 清理消息内容中的特殊标签
  const cleanMessageContent = (content: string | null): string => {
    if (!content) return ''
    let cleaned = content
    // 移除 <thought> 标签但保留内容
    cleaned = cleaned.replace(/<\/?thought>/g, '')
    // 移除 <action>...</action> 及其内容
    cleaned = cleaned.replace(/<action>[\s\S]*?<\/action>/g, '')
    // 移除 <final_answer> 标签但保留内容
    cleaned = cleaned.replace(/<\/?final_answer>/g, '')
    return cleaned.trim()
  }

  // 检测消息是否包含 observation 标签
  const hasObservationTag = (content: string | null): boolean => {
    if (!content) return false
    return /<observation>[\s\S]*?<\/observation>/i.test(content)
  }

  // 提取 observation 标签中的内容
  const extractObservationContent = (content: string | null): string => {
    if (!content) return ''
    const match = content.match(/<observation>([\s\S]*?)<\/observation>/i)
    return match ? match[1].trim() : ''
  }

  // ToolCallCard 已替代内联渲染，见 ./ToolCallCard.tsx

  const renderMessage = (msg: Message): React.JSX.Element => {
    if (msg.role === MessageRole.USER) {
      // 检查是否包含 observation 标签
      if (hasObservationTag(msg.content)) {
        const observationContent = extractObservationContent(msg.content)
        // 尝试查找对应的工具执行记录
        const toolExecution = toolExecutions
          .filter((exec) => exec.status === 'completed' && exec.timestamp <= msg.createdAt)
          .sort(
            (a, b) => Math.abs(msg.createdAt - a.timestamp) - Math.abs(msg.createdAt - b.timestamp)
          )[0]

        return (
          <div key={msg.id}>
            {toolExecution ? (
              <ToolCallCard
                toolName={toolExecution.name}
                params={toolExecution.params}
                result={toolExecution.result}
                status="completed"
              />
            ) : (
              <ToolCallCard
                toolName="unknown"
                params={{}}
                result={observationContent}
                status="completed"
              />
            )}
          </div>
        )
      }

      // 普通用户消息
      return (
        <div key={msg.id} className="flex justify-end mb-4 animate-[fadeIn_200ms_ease-out]">
          <div className="max-w-[85%] bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] p-3 min-w-0">
            <p className="can-select text-[13px] text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
              {cleanMessageContent(msg.content)}
            </p>
          </div>
        </div>
      )
    } else if (msg.role === MessageRole.ASSISTANT) {
      const cleanedContent = cleanMessageContent(msg.content)
      const hasContent = cleanedContent.length > 0
      const hasToolCalls = msg.tool_calls && msg.tool_calls.length > 0

      // 如果既没有文本内容也没有工具调用，不渲染任何内容（防止空白气泡）
      if (!hasContent && !hasToolCalls) {
        return <div key={msg.id}></div>
      }

      // 过滤掉已有对应 TOOL 消息且该 TOOL 消息能找到 toolExecution 的 tool_call
      // - 实时会话：TOOL 消息 + toolExecution 都存在 → TOOL 分支负责渲染 → ASSISTANT 跳过
      // - 页面刷新：TOOL 消息存在但 toolExecutions 为空 → TOOL 分支不渲染 → ASSISTANT 负责渲染
      const orphanToolCalls = hasToolCalls
        ? msg.tool_calls!.filter((tc) => {
            const toolMsg = messages.find(
              (m) => m.role === MessageRole.TOOL && m.tool_call_id === tc.id
            )
            if (!toolMsg) return true
            return !findToolExecutionForMessage(toolMsg)
          })
        : []

      return (
        <div key={msg.id}>
          {/* 文本内容气泡（仅当有实际文本内容时显示） */}
          {hasContent && (
            <div className="mb-4 animate-[fadeIn_200ms_ease-out]">
              <div className="w-full bg-[var(--color-bg-secondary)] rounded-[var(--radius-md)] p-3 text-[13px] text-[var(--color-text-primary)]">
                <MarkdownRenderer content={cleanedContent} />
              </div>
            </div>
          )}
          {/* 历史孤儿 tool_call（无对应 TOOL 消息） */}
          {orphanToolCalls.map((tc) => {
            let params: Record<string, unknown> = {}
            try {
              params = JSON.parse(tc.function.arguments)
            } catch {
              /* keep empty */
            }
            return (
              <ToolCallCard
                key={tc.id}
                toolName={tc.function.name}
                params={params}
                status="completed"
              />
            )
          })}
        </div>
      )
    } else if (msg.role === MessageRole.TOOL) {
      const toolExecution = findToolExecutionForMessage(msg)

      return (
        <div key={msg.id}>
          {/* 如果找到对应的工具执行记录，先显示工具调用和结果卡片 */}
          {toolExecution && (
            <>
              {/* 工具调用卡片 */}
              <div className="flex justify-start mb-2 animate-[fadeIn_200ms_ease-out]">
                <div className="w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] p-2 border-l-[2px] border-l-[var(--ash-accent)]">
                  <p className="text-[11px] text-[var(--color-text-primary)] font-semibold mb-1">
                    调用工具：{toolExecution.name}
                  </p>
                  <details className="text-[11px] text-[var(--color-text-secondary)] min-w-0">
                    <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                      查看参数
                    </summary>
                    <pre className="can-select mt-2 p-2 bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] text-[11px] overflow-x-auto overflow-y-auto max-h-60 border border-[var(--color-border-primary)] whitespace-pre">
                      {JSON.stringify(toolExecution.params, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>

              {/* 工具结果卡片 */}
              {toolExecution.result !== undefined && (
                <div className="flex justify-start mb-2 animate-[fadeIn_200ms_ease-out]">
                  <div className="w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] p-2 border-l-[2px] border-l-[var(--ash-accent)]">
                    <p className="text-[11px] text-[var(--color-text-primary)] font-semibold mb-1">
                      工具结果：{toolExecution.name}
                    </p>
                    <details className="text-[11px] text-[var(--color-text-secondary)] min-w-0">
                      <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                        查看结果
                      </summary>
                      <pre className="can-select mt-2 p-2 bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] text-[11px] overflow-x-auto overflow-y-auto max-h-40 border border-[var(--color-border-primary)] whitespace-pre">
                        {typeof toolExecution.result === 'string'
                          ? toolExecution.result
                          : JSON.stringify(toolExecution.result, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TOOL 消息卡片 */}
          <div className="flex justify-start mb-2 animate-[fadeIn_200ms_ease-out]">
            <div className="w-full bg-[var(--color-bg-tertiary)] rounded-[var(--radius-sm)] p-2 border-l-[2px] border-l-[var(--ash-accent)]">
              <p className="text-[11px] text-[var(--color-text-primary)] font-semibold mb-1">
                工具执行结果
              </p>
              <details className="text-[11px] text-[var(--color-text-secondary)] min-w-0">
                <summary className="cursor-pointer hover:text-[var(--color-text-primary)] transition-colors">
                  查看结果
                </summary>
                <pre className="can-select mt-2 p-2 bg-[var(--color-bg-primary)] rounded-[var(--radius-sm)] text-[11px] overflow-x-auto overflow-y-auto max-h-40 border border-[var(--color-border-primary)] whitespace-pre">
                  {msg.content}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )
    }
    return <div key={msg.id}></div>
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
      {/* API 配置错误提示卡片 */}
      {displayError && (
        <div className="mx-4 mt-4 mb-2">
          <div className="alert alert-error bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Icon
                name="x-circle"
                size="md"
                className="text-red-600 dark:text-red-400 flex-shrink-0"
              />
              <div className="flex-1">
                <p className="can-select text-sm font-medium text-red-800 dark:text-red-200">
                  {displayError}
                </p>
              </div>
              <button
                onClick={handleClearError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 对话记录显示区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && !streamingMessage && !currentThought ? (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-[var(--color-text-tertiary)] text-sm">
            {currentSessionId ? '请输入您的任务开始对话' : '请先连接 SSH 会话'}
          </div>
        ) : (
          <div className="space-y-2">
            {messages.sort((a, b) => a.index - b.index).map((msg) => renderMessage(msg))}

            {/* 未绑定的工具执行记录（实时显示） */}
            {getUnboundToolExecutions().map((execution) => (
              <ToolCallCard
                key={execution.id}
                toolName={execution.name}
                params={execution.params}
                result={execution.result}
                status={execution.status}
              />
            ))}

            {/* AI 错误气泡 */}
            {aiErrors.map((aiError) => (
              <div
                key={aiError.id}
                className="flex justify-start mb-4 animate-in fade-in duration-300"
              >
                <div className="max-w-[90%] bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-start gap-2">
                    <Icon
                      name="x-circle"
                      size="md"
                      className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                        {aiError.error.title}
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-300 mb-2 leading-relaxed">
                        {aiError.error.message}
                      </p>
                      {aiError.error.suggestion && (
                        <p className="text-xs text-gray-600 dark:text-[var(--color-text-tertiary)] mb-2 leading-relaxed">
                          {aiError.error.suggestion}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {aiError.error.suggestNavigateToSettings && onNavigateToSettings && (
                          <button
                            onClick={onNavigateToSettings}
                            className="px-3 py-1 text-xs rounded-md bg-red-500 hover:bg-red-600 text-white transition-colors font-medium"
                          >
                            前往设置
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setAiErrors((prev) => prev.filter((e) => e.id !== aiError.id))
                          }
                          className="px-3 py-1 text-xs rounded-md bg-gray-200 dark:bg-[var(--color-bg-tertiary)] hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-[var(--color-text-secondary)] transition-colors"
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* 思考过程 */}
            {currentThought && (
              <div className="mb-4 animate-[fadeIn_200ms_ease-out]">
                <details className="text-[11px] text-[var(--color-text-tertiary)]">
                  <summary className="cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors select-none">
                    思考过程
                  </summary>
                  <p className="can-select mt-1 whitespace-pre-wrap leading-relaxed">
                    {currentThought}
                  </p>
                </details>
              </div>
            )}

            {/* 加载动画 */}
            {isProcessing && !streamingMessage && !currentThought && (
              <div className="flex justify-start mb-4 animate-in fade-in duration-300">
                <div className="max-w-[90%] bg-[var(--color-bg-primary)] border border-gray-200 dark:border-[var(--color-border-primary)] rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-[var(--ash-accent)] rounded-full animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-[var(--ash-accent)] rounded-full animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      ></span>
                      <span
                        className="w-2 h-2 bg-[var(--ash-accent)] rounded-full animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      ></span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-[var(--color-text-tertiary)]">
                      AI 正在思考...
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 流式输出 */}
            {streamingMessage && (
              <div className="mb-4 animate-[fadeIn_200ms_ease-out]">
                <div className="w-full text-[13px] text-[var(--color-text-primary)]">
                  <MarkdownRenderer content={streamingMessage} isStreaming={true} />
                  <span className="inline-block w-1 h-4 ml-1 bg-[var(--ash-accent)] animate-pulse"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* 工具审批对话框 */}
      {pendingApproval && (
        <div className="border-t border-gray-200 dark:border-[var(--color-border-primary)] bg-yellow-50 dark:bg-yellow-900/20 p-3">
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-[var(--color-text-primary)] mb-1">
                工具调用请求：{pendingApproval.toolName}
              </p>
              <p className="text-xs text-gray-600 dark:text-[var(--color-text-tertiary)] mb-2">
                {pendingApproval.reason}
              </p>
              <details className="text-xs text-gray-600 dark:text-[var(--color-text-tertiary)] min-w-0">
                <summary className="cursor-pointer">查看参数</summary>
                <pre className="can-select mt-1 p-2 bg-[var(--color-bg-primary)] rounded text-xs overflow-x-auto overflow-y-auto max-h-60 max-w-[180px] whitespace-pre">
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
                <Icon name="check" size="sm" />
              </button>
              <button
                onClick={handleReject}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="拒绝"
              >
                <Icon name="x" size="sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 输入框区域 */}
      <div className="border-t border-gray-200 dark:border-[var(--color-border-primary)] p-3">
        {/* 输入框 */}
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={currentSessionId ? '在此处输入您的任务...' : '请先连接 SSH 会话'}
            disabled={!currentSessionId || isProcessing}
            spellCheck={false}
            className="w-full min-h-[80px] max-h-[200px] px-3 py-2 text-[13px] border border-[var(--color-border-primary)] rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--ash-accent)] focus:ring-1 focus:ring-[var(--ash-accent)] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* 底部控制栏 */}
        <div className="flex items-center justify-between mt-2">
          {/* 左侧选择器 */}
          <div className="flex items-center space-x-3">
            {/* 运行模式选择 */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setRunMode('agent')}
                disabled={!currentSessionId || isProcessing}
                className={twMerge(
                  'px-3 py-0.5 text-[11px] rounded-[var(--radius-full)] transition-colors',
                  runMode === 'agent'
                    ? 'bg-[var(--ash-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                )}
              >
                Agent
              </button>
              <button
                onClick={() => setRunMode('ask')}
                disabled={!currentSessionId || isProcessing}
                className={twMerge(
                  'px-3 py-0.5 text-[11px] rounded-[var(--radius-full)] transition-colors',
                  runMode === 'ask'
                    ? 'bg-[var(--ash-accent)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]'
                )}
              >
                Ask
              </button>
            </div>
          </div>

          {/* 右侧控制区 */}
          <div className="flex items-center space-x-3">
            {/* 供应商选择 */}
            <div className="flex items-center space-x-2">
              <div className="relative" ref={providerDropdownRef}>
                <button
                  type="button"
                  disabled={providers.length === 0 || isProcessing}
                  onClick={() => setProviderDropdownOpen(!providerDropdownOpen)}
                  className="flex items-center h-7 w-24 pl-2 pr-5 text-[11px] border border-[var(--color-border-primary)] rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--ash-accent)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="truncate">
                    {providers.find((p) => p.id === selectedProviderId)?.configName || '暂无配置'}
                  </span>
                  <Icon
                    name="chevron-up"
                    size="xs"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-tertiary)]"
                  />
                </button>
                {providerDropdownOpen && (
                  <ul className="absolute bottom-full mb-1 left-0 w-24 max-h-40 overflow-y-auto bg-[var(--color-bg-elevated)] border border-[var(--color-border-primary)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] z-50">
                    {providers.map((provider) => (
                      <li key={provider.id}>
                        <button
                          type="button"
                          onClick={() => {
                            changeSelectedProviderId(provider.id)
                            setProviderDropdownOpen(false)
                          }}
                          className={[
                            'w-full text-left px-2 py-1 text-[11px] transition-colors',
                            provider.id === selectedProviderId
                              ? 'bg-[var(--ash-accent-subtle)] text-[var(--ash-accent)]'
                              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                          ].join(' ')}
                        >
                          {provider.configName}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
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
                  'px-4 py-1.5 text-xs rounded-[var(--radius-md)] transition-colors font-medium',
                  message.trim() && providers.length > 0 && currentSessionId
                    ? 'bg-[var(--ash-accent)] hover:bg-[var(--ash-accent)]-hover text-white'
                    : 'opacity-50 bg-[var(--color-bg-tertiary)] text-[var(--color-text-tertiary)] cursor-not-allowed'
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
