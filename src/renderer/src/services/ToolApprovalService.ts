import type { ApprovalRequest, ApprovalResponse } from '@shared/types/ToolApproval'

/**
 * 工具批准服务
 */
export class ToolApprovalService {
  /**
   * 监听工具批准请求
   */
  static onToolApprovalRequest(
    sessionId: string,
    callback: (request: ApprovalRequest) => void
  ): () => void {
    return window.toolApproval.onToolApprovalRequest(sessionId, callback)
  }

  /**
   * 响应工具批准
   */
  static async respondToolApproval(response: ApprovalResponse): Promise<void> {
    await window.toolApproval.respondToolApproval(response)
  }

  /**
   * 批准工具执行
   */
  static async approveToolExecution(requestId: string): Promise<void> {
    await this.respondToolApproval({
      requestId,
      approved: true
    })
  }

  /**
   * 拒绝工具执行
   */
  static async rejectToolExecution(requestId: string, reason?: string): Promise<void> {
    await this.respondToolApproval({
      requestId,
      approved: false,
      reason: reason || '用户拒绝执行'
    })
  }
}
