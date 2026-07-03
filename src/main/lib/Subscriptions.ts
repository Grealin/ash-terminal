import { WebContents } from 'electron'

/**
 * 集中式 IPC 订阅清理注册表
 *
 * 问题背景：12 个 IPC handler 使用 `event.sender.on('destroyed', cleanup)` 模式
 * 向同一个 WebContents 注册清理函数。单窗口应用中 WebContents 始终是同一个对象，
 * `'destroyed'` 事件仅在窗口关闭时触发。每次连接新 SSH 会话都新增 12 个 `destroyed`
 * 监听器，旧的从不移除，导致 MaxListenersExceededWarning。
 *
 * 解决方案：
 * 1. `trackSubscription` 仅将清理函数存入 Map，不操作 WebContents
 * 2. `initSubscriptionCleanup` 向 WebContents 注册唯一一个 `destroyed` 监听器
 * 3. 会话断开时通过 `cleanupSubscriptions` 主动执行清理
 *
 * 这样 WebContents 上始终只有 1 个 `destroyed` 监听器（而非 12+ 个）。
 */

/** key: "channelName:sessionId"，value: 清理函数 */
const cleanupRegistry = new Map<string, () => void>()

/**
 * 注册 IPC 订阅的清理函数。
 *
 * 对于同一 (channel, sessionId) 组合，自动执行旧的清理函数后再替换，
 * 确保底层 EventEmitter 监听器不会累积。
 *
 * @param channel   IPC channel 名称（如 'onShellData', 'onTaskStream'）
 * @param sessionId SSH 会话 ID
 * @param cleanup   资源清理函数（解除底层 EventEmitter 监听）
 */
export function trackSubscription(
  channel: string,
  sessionId: string,
  _webContents: WebContents, // 保留参数以兼容现有调用方，不再用于注册 destroy 监听器
  cleanup: () => void
): void {
  const key = `${channel}:${sessionId}`

  // 同一 channel+sessionId 重新注册时，先执行旧的清理函数
  const existing = cleanupRegistry.get(key)
  if (existing) {
    try {
      existing()
    } catch (err) {
      console.warn(`[Subscriptions] 清理旧订阅 ${key} 时出错:`, err)
    }
  }

  // 仅存储清理函数，不向 WebContents 添加 destroy 监听器
  cleanupRegistry.set(key, cleanup)
}

/**
 * 清理指定 session 的所有订阅
 *
 * 执行所有清理函数（移除底层 EventEmitter 监听器），
 * 并从注册表中删除。
 * 通常在 SSH 会话断开、AI 会话关闭时调用。
 *
 * @param sessionId SSH 会话 ID
 */
export function cleanupSubscriptions(sessionId: string): void {
  const keysToDelete: string[] = []

  for (const [key, cleanup] of cleanupRegistry) {
    if (key.endsWith(`:${sessionId}`)) {
      try {
        cleanup()
      } catch (err) {
        console.warn(`[Subscriptions] 清理 ${key} 时出错:`, err)
      }
      keysToDelete.push(key)
    }
  }

  for (const key of keysToDelete) {
    cleanupRegistry.delete(key)
  }
}

/**
 * 清理所有订阅（窗口销毁时调用）
 */
export function cleanupAllSubscriptions(): void {
  for (const [key, cleanup] of cleanupRegistry) {
    try {
      cleanup()
    } catch (err) {
      console.warn(`[Subscriptions] 清理 ${key} 时出错:`, err)
    }
  }
  cleanupRegistry.clear()
}

/**
 * 注册全局 WebContents destroyed 监听器
 *
 * 仅在应用启动时调用一次。向 webContents 注册**唯一一个** `destroyed` 监听器，
 * 窗口关闭时统一清理所有订阅。这是 WebContents 上唯一的 `destroyed` 监听器。
 *
 * @param webContents 主窗口的 WebContents
 */
export function initSubscriptionCleanup(webContents: WebContents): void {
  webContents.on('destroyed', () => {
    cleanupAllSubscriptions()
  })
}

/**
 * 获取当前注册的订阅数量（用于调试）
 */
export function getSubscriptionCount(): number {
  return cleanupRegistry.size
}
