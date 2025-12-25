import { getSSH } from '@/lib/SSHPool'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * 命令执行工具
 * 执行普通 Shell 命令
 */
export class CommandTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'execute_command',
      description: 'Execute a shell command on the remote server',
      parameters: [
        {
          name: 'command',
          type: 'string',
          description: 'The shell command to execute',
          required: true
        },
        {
          name: 'workingDirectory',
          type: 'string',
          description: 'Working directory for command execution',
          required: false
        },
        {
          name: 'timeout',
          type: 'number',
          description: 'Command timeout in seconds (default: 30)',
          required: false,
          default: 30
        }
      ],
      requiresApproval: true,
      category: 'command'
    }
  }

  async execute(
    context: ToolExecutionContext,
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
      this.validateParams(params, this.getDefinition())

      const { command, workingDirectory, timeout = 30 } = params
      const ssh = getSSH(context.sessionId)

      if (!ssh) {
        return this.formatError('SSH connection not found', Date.now() - startTime)
      }

      // 如果指定了工作目录，先切换目录
      const fullCommand = workingDirectory ? `cd "${workingDirectory}" && ${command}` : command

      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Command timeout')), timeout * 1000)
      })

      const result = await Promise.race([ssh.execCommand(fullCommand), timeoutPromise])

      return this.formatSuccess(
        {
          command,
          workingDirectory,
          exitCode: result.code,
          stdout: result.stdout,
          stderr: result.stderr
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
