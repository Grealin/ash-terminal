import { getSSH } from './SSHPool'

/**
 * 获取 PTY Shell 会话的真实当前工作目录
 *
 * 通过 /proc/<PID>/cwd（Linux）或 lsof（macOS/BSD）解析 PTY 终端进程的工作目录。
 * execCommand() 每次创建独立会话，工作目录始终是 ~，
 * 而 PTY Shell 中 cd 后的目录需要通过进程级追踪获取。
 *
 * @param sessionId SSH 会话 ID
 * @returns 解析后的工作目录路径，如果无法获取则返回 undefined
 */
export async function getPTYWorkingDirectory(sessionId: string): Promise<string | undefined> {
  const ssh = getSSH(sessionId)
  if (!ssh) return undefined

  const pid = ssh.getShellPid()
  if (!pid) return undefined

  // 主方案：Linux /proc/<PID>/cwd 符号链接
  try {
    const result = await ssh.execCommand(`readlink /proc/${pid}/cwd 2>/dev/null`)
    if (result.code === 0 && result.stdout.trim()) {
      return result.stdout.trim()
    }
  } catch {
    // 继续尝试回退方案
  }

  // 回退方案：lsof（macOS、BSD 等非 Linux 系统）
  try {
    const lsofResult = await ssh.execCommand(
      `lsof -a -p ${pid} -d cwd -Fn 2>/dev/null | grep '^n' | cut -c2- | head -1`
    )
    if (lsofResult.code === 0 && lsofResult.stdout.trim()) {
      return lsofResult.stdout.trim()
    }
  } catch {
    // 所有方案均失败，返回 undefined
  }

  return undefined
}
