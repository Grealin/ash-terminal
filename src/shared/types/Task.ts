import { AiMode } from '@shared/models'
import { AiTaskError } from '@shared/models/AiError'
import { Task } from '@shared/models/Task'

/**
 * 任务管理相关类型定义
 *
 * 前端应该使用这些任务级别的接口，而不是直接操作 Agent
 */

// ==================== 任务管理 ====================

/**
 * 准备创建新任务（仅清空状态，实际任务在首次发送消息时自动创建）
 */
export type PrepareNewTask = (sessionId: string) => Promise<{ success: boolean }>

/**
 * 切换到指定任务
 */
export type SwitchTask = (
  sessionId: string,
  taskId: string
) => Promise<{ success: boolean; task: Task }>

/**
 * 向当前任务提问
 * @param mode AI 模式（AGENT 可使用工具，ASK 仅回答问题）
 */
export type AskTask = (
  sessionId: string,
  question: string,
  mode?: AiMode
) => Promise<{ success: boolean }>

/**
 * 获取任务列表
 */
export type GetTaskList = (sessionId: string) => Promise<{ success: boolean; tasks: Task[] }>

/**
 * 获取当前任务
 */
export type GetCurrentTask = (sessionId: string) => Promise<{ success: boolean; task: Task | null }>

/**
 * 删除任务
 */
export type DeleteTask = (
  sessionId: string,
  taskId: string
) => Promise<{ success: boolean; deleted: boolean }>

/**
 * 更新任务名称
 */
export type UpdateTaskName = (
  sessionId: string,
  taskId: string,
  newName: string
) => Promise<{ success: boolean; updated: boolean }>

/**
 * 清空当前任务的对话历史
 */
export type ClearCurrentTask = (sessionId: string) => Promise<{ success: boolean }>

/**
 * 停止当前任务的执行
 */
export type StopTask = (sessionId: string) => Promise<{ success: boolean }>

/**
 * 关闭会话（清理所有资源）
 */
export type CloseTaskSession = (sessionId: string) => Promise<{ success: boolean }>

/**
 * 清空当前会话的所有任务
 */
export type ClearAllTasks = (
  sessionId: string
) => Promise<{ success: boolean; deletedCount: number }>

// ==================== 任务事件监听 ====================

/**
 * 任务事件监听函数签名
 */
export type OnTaskEvent = (sessionId: string, callback: (data: any) => void) => () => void

/**
 * 监听任务流式输出
 */
export type OnTaskStream = OnTaskEvent

/**
 * 监听任务思考过程
 */
export type OnTaskThought = OnTaskEvent

/**
 * 监听任务工具调用
 */
export type OnTaskToolCall = OnTaskEvent

/**
 * 监听任务工具执行结果
 */
export type OnTaskToolResult = OnTaskEvent

/**
 * 监听任务最终回答
 */
export type OnTaskAnswer = OnTaskEvent

/**
 * 监听任务错误
 */
export type OnTaskError = (sessionId: string, callback: (data: AiTaskError) => void) => () => void

/**
 * 监听任务完成
 */
export type OnTaskDone = OnTaskEvent

/**
 * 监听任务切换事件
 */
export type OnTaskSwitched = OnTaskEvent

// ==================== 辅助接口 ====================

/**
 * 获取操作系统信息
 */
export type GetOperatingSystem = (sessionId: string) => Promise<string>
