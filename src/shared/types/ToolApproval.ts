/**
 * 工具批准请求
 */
export interface ApprovalRequest {
  requestId: string
  sessionId: string
  toolName: string
  params: Record<string, any>
  reason: string
}

/**
 * 工具批准响应
 */
export interface ApprovalResponse {
  requestId: string
  approved: boolean
  reason?: string
}

/**
 * 监听工具批准请求
 */
export type OnToolApprovalRequest = (
  sessionId: string,
  callback: (request: ApprovalRequest) => void
) => () => void

/**
 * 响应工具批准
 */
export type RespondToolApproval = (response: ApprovalResponse) => Promise<{ success: boolean }>
