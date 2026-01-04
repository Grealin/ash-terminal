import { AiMode } from '@shared/models'
import { executeSSHCommand } from '../Command'
import { Agent, AgentEvent } from './core/Agent'

import { AgentConfig } from '@shared/models/AI'

/**
 * Agent 池，管理多个 Agent 实例
 */
class AgentPool {
  private agents: Map<string, Agent> = new Map()

  /**
   * 获取 Agent 实例
   */
  getAgent(sessionId: string): Agent | undefined {
    return this.agents.get(sessionId)
  }

  /**
   * 创建 Agent 实例（会自动获取系统信息）
   */
  async createAgent(
    config: Partial<AgentConfig> & { sessionId: string; mode: AiMode }
  ): Promise<Agent> {
    const sessionId = config.sessionId

    // 检查是否已存在
    if (this.agents.has(sessionId)) {
      throw new Error(`Agent already exists for session: ${sessionId}`)
    }

    // 自动获取系统信息
    const operatingSystem = config.operatingSystem || (await this.getOperatingSystem(sessionId))

    const fullConfig: AgentConfig = {
      sessionId,
      mode: config.mode,
      operatingSystem
    }

    const agent = new Agent(fullConfig)
    this.agents.set(sessionId, agent)
    return agent
  }

  /**
   * 删除 Agent 实例
   */
  removeAgent(sessionId: string): boolean {
    const agent = this.agents.get(sessionId)
    if (agent) {
      agent.stop()
      agent.removeAllListeners()
      return this.agents.delete(sessionId)
    }
    return false
  }

  /**
   * 清空所有 Agent
   */
  clear(): void {
    this.agents.forEach((agent) => {
      agent.stop()
      agent.removeAllListeners()
    })
    this.agents.clear()
  }

  /**
   * 获取操作系统信息
   * 返回格式：<系统>-<版本>，例如 "Ubuntu Server-22.04 LTS"
   */
  async getOperatingSystem(sessionId: string): Promise<string> {
    try {
      // 首先检测系统类型
      const kernelResult = await executeSSHCommand(sessionId, 'uname -s')
      const kernel = kernelResult.stdout?.trim() || ''

      // Linux 系统：从 /etc/os-release 获取详细信息
      if (kernel === 'Linux') {
        const osReleaseResult = await executeSSHCommand(
          sessionId,
          'cat /etc/os-release 2>/dev/null'
        )

        if (osReleaseResult.code === 0 && osReleaseResult.stdout) {
          const lines = osReleaseResult.stdout.split('\n')
          let name = ''
          let version = ''
          let prettyName = ''

          // 解析 os-release 文件
          for (const line of lines) {
            if (line.startsWith('PRETTY_NAME=')) {
              prettyName = line.substring(12).replace(/^"|"$/g, '')
            } else if (line.startsWith('NAME=')) {
              name = line.substring(5).replace(/^"|"$/g, '')
            } else if (line.startsWith('VERSION=')) {
              version = line.substring(8).replace(/^"|"$/g, '')
            }
          }

          // 优先使用 PRETTY_NAME
          if (prettyName) {
            return prettyName
          }

          // 否则组合 NAME 和 VERSION
          if (name && version) {
            return `${name}-${version}`
          }

          if (name) {
            return name
          }
        }

        // 如果 os-release 失败，尝试 lsb_release
        const lsbResult = await executeSSHCommand(
          sessionId,
          'lsb_release -d 2>/dev/null | cut -f2-'
        )
        if (lsbResult.code === 0 && lsbResult.stdout?.trim()) {
          return lsbResult.stdout.trim()
        }

        return 'Linux-Unknown'
      }

      // macOS 系统：使用 sw_vers
      if (kernel === 'Darwin') {
        const versionResult = await executeSSHCommand(
          sessionId,
          'sw_vers -productName && sw_vers -productVersion'
        )
        if (versionResult.code === 0 && versionResult.stdout) {
          const lines = versionResult.stdout.trim().split('\n')
          if (lines.length >= 2) {
            return `${lines[0]}-${lines[1]}`
          }
        }
        return 'macOS-Unknown'
      }

      // 其他 Unix 系统：尝试 uname -sr
      if (kernel) {
        const versionResult = await executeSSHCommand(sessionId, 'uname -r')
        if (versionResult.code === 0 && versionResult.stdout?.trim()) {
          return `${kernel}-${versionResult.stdout.trim()}`
        }
        return kernel
      }

      return 'Unknown'
    } catch (error) {
      console.error('Failed to get operating system:', error)
      return 'Unknown'
    }
  }
}

// 导出单例
export const agentPool = new AgentPool()

// ==================== 内部使用的低级 API ====================
// 这些方法主要供 TaskManager 内部使用，不应该直接暴露给前端

/**
 * 创建 AI 会话（内部使用，推荐使用 TaskManager.createTask）
 * @internal
 */
export const createAiSession = async (
  config: Partial<AgentConfig> & { sessionId: string; mode: AiMode }
): Promise<Agent> => {
  return await agentPool.createAgent(config)
}

/**
 * 获取 Agent 实例（内部使用）
 * @internal
 */
export const getAgent = (sessionId: string): Agent | undefined => {
  return agentPool.getAgent(sessionId)
}

/**
 * 停止 AI 会话（内部使用，推荐使用 TaskManager.closeSession）
 * @internal
 */
export const stopAiSession = (sessionId: string): void => {
  agentPool.removeAgent(sessionId)
}

// 导出 AgentEvent 枚举
export { AgentEvent, type AgentConfig }
