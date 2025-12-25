import { writeToShell } from '@/lib/Shell'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * Sudo 命令执行工具
 * 执行需要 sudo 权限的命令（需要用户手动输入密码）
 */
export class SudoCommandTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'execute_sudo_command',
      description: 'Execute a command with sudo privileges (requires password input from user)',
      parameters: [
        {
          name: 'command',
          type: 'string',
          description: 'The command to execute with sudo',
          required: true
        },
        {
          name: 'workingDirectory',
          type: 'string',
          description: 'Working directory for command execution',
          required: false
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

      const { command, workingDirectory } = params

      // 构建 sudo 命令
      const cdCommand = workingDirectory ? `cd "${workingDirectory}" && ` : ''
      const sudoCommand = `${cdCommand}sudo ${command}\n`

      // 通过交互式 Shell 发送命令
      try {
        writeToShell(context.sessionId, sudoCommand)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error: any) {
        return this.formatError(
          'Interactive shell not found. Please create a shell session first.',
          Date.now() - startTime
        )
      }

      return this.formatSuccess(
        {
          command: sudoCommand.trim(),
          message:
            'Sudo command sent to interactive shell. Please enter your password in the terminal.',
          requiresUserInput: true
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
