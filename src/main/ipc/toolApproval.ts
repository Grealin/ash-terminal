import type { ApprovalRequest, ApprovalResponse } from '@/lib/ai/tools/ToolManager'
import { toolManager } from '@/lib/ai/tools/ToolManager'
import { ipcMain } from 'electron'

/**
 * 注册工具批准相关的 IPC handlers
 */
export function registerToolApprovalHandlers(): void {
  // 按需订阅工具批准请求
  ipcMain.handle('onToolApprovalRequest', (event, sessionId: string) => {
    // 创建过滤后的监听器，只处理匹配 sessionId 的请求
    const listener = (request: ApprovalRequest): void => {
      if (request.sessionId === sessionId) {
        event.sender.send('tool-approval-request', sessionId, request)
      }
    }

    // 订阅 toolManager 的 approval-request 事件
    toolManager.on('approval-request', listener)

    // 在渲染进程窗口关闭时清理监听器
    const cleanup = (): void => {
      toolManager.off('approval-request', listener)
    }
    event.sender.on('destroyed', cleanup)

    return { success: true }
  })

  // 处理前端的批准响应
  ipcMain.handle('respondToolApproval', async (_, response: ApprovalResponse) => {
    try {
      toolManager.handleApprovalResponse(response)
      return { success: true }
    } catch (error) {
      console.error('Failed to handle tool approval response:', error)
      throw error
    }
  })
}
