import { AiMessage, ToolCall, ToolDefinition } from '../models/AI'
import {
  AiTask,
  CreateTaskParams,
  TaskQueryParams,
  TaskStatistics,
  UpdateTaskParams
} from '../models/Task'

/**
 * AI 任务相关 IPC 方法
 */

// 创建新任务（草稿状态）
export type CreateTask = (params: CreateTaskParams) => Promise<AiTask>

// 发送消息到 AI 助手
export type SendAiMessage = (params: {
  taskId: string // 任务 ID
  message: string // 用户消息内容
}) => Promise<{
  messageId: string // 新消息的 ID
}>

// 监听 AI 流式响应（Server-Sent Events）
export type OnAiStreamData = (
  taskId: string,
  callback: (data: {
    type: 'content' | 'tool_call' | 'done' | 'error'
    content?: string // 内容片段
    toolCall?: ToolCall // 工具调用信息
    error?: string // 错误信息
  }) => void
) => () => void

// 停止 AI 响应生成
export type StopAiGeneration = (taskId: string) => Promise<void>

/**
 * 工具调用相关 IPC 方法
 */

// 批准工具调用
export type ApproveToolCall = (taskId: string, toolCallId: string) => Promise<void>

// 拒绝工具调用
export type RejectToolCall = (taskId: string, toolCallId: string, reason?: string) => Promise<void>

// 获取可用工具列表
export type GetAvailableTools = (sessionId: string) => Promise<ToolDefinition[]>

/**
 * 任务管理相关 IPC 方法
 */

// 获取任务列表
export type GetTasks = (params: TaskQueryParams) => Promise<{
  tasks: AiTask[]
  total: number
}>

// 获取任务列表（简化版）
export type ListTasks = (params: TaskQueryParams) => Promise<AiTask[]>

// 获取特定任务详情
export type GetTask = (taskId: string) => Promise<AiTask | null>

// 更新任务信息
export type UpdateTask = (taskId: string, params: UpdateTaskParams) => Promise<void>

// 删除任务
export type DeleteTask = (taskId: string) => Promise<void>

// 归档/取消归档任务
export type ArchiveTask = (taskId: string, archived: boolean) => Promise<void>

// 执行 Agent 任务
export type RunAgentTask = (taskId: string, userMessage?: string) => Promise<void>

// 执行 Ask 任务
export type RunAskTask = (taskId: string, userMessage?: string) => Promise<void>

// 添加消息
export type AddMessage = (taskId: string, message: AiMessage) => Promise<void>

// 更新消息
export type UpdateMessage = (taskId: string, messageId: string, message: AiMessage) => Promise<void>

// 删除消息
export type DeleteMessage = (taskId: string, messageId: string) => Promise<void>

// 清空某个会话的所有任务
export type ClearTaskHistory = (sessionId: string) => Promise<void>

// 获取任务统计信息
export type GetTaskStatistics = (params: {
  sessionId?: string
  startDate?: number // 时间戳
  endDate?: number // 时间戳
}) => Promise<TaskStatistics>

/**
 * 消息操作相关 IPC 方法
 */

// 重新生成 AI 回复
export type RegenerateAiResponse = (params: {
  taskId: string
  messageId: string // 要重新生成的消息 ID
}) => Promise<void>

// 添加消息到任务（用于编辑历史）
export type AddMessageToTask = (params: {
  taskId: string
  message: Omit<AiMessage, 'id' | 'timestamp' | 'taskId'>
}) => Promise<AiMessage>
