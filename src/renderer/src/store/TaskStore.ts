import { Message, Task } from '@shared/models/Task'
import { atom } from 'jotai'

/**
 * 任务相关状态管理
 */

// 当前会话的任务列表
export const tasksAtom = atom<Task[]>([])

// 历史列表中当前选中的任务 ID（用于高亮显示）
export const selectedTaskIdAtom = atom<string | null>(null)

// 当前激活的任务
export const currentTaskAtom = atom<Task | null>(null)

// 当前任务的消息列表
export const currentMessagesAtom = atom<Message[]>([])

// AI 是否正在执行任务
export const isAiProcessingAtom = atom<boolean>(false)

// 当前正在流式输出的消息内容
export const streamingMessageAtom = atom<string>('')

// 当前思考过程
export const currentThoughtAtom = atom<string>('')

// 待审批的工具调用请求
export interface PendingToolApproval {
  requestId: string
  sessionId: string
  toolName: string
  params: Record<string, any>
  reason: string
}

export const pendingToolApprovalAtom = atom<PendingToolApproval | null>(null)
