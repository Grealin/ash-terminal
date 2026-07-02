import { executeSSHCommand } from '../../Command'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 命令执行工具
 * 执行普通 Shell 命令（非交互式）
 */
export class CommandTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'execute_command',
      description:
        '在远程服务器上执行 Shell 命令。适用于非交互式命令，如 ls、cat、echo 等。命令会在独立的会话中执行，不会影响交互式终端。',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的 Shell 命令（例如：ls -la /home/user）'
          },
          timeout: {
            type: 'integer',
            description: '命令执行超时时间（秒）。默认为 30 秒。'
          },
          working_directory: {
            type: 'string',
            description: '命令执行的工作目录。如果不指定，使用当前工作目录。'
          }
        },
        required: ['command']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const command: string = params.command
    const timeout: number | undefined = params.timeout
    // AI 显式指定的 working_directory 优先，否则自动使用 context 中的工作目录
    const working_directory: string | undefined =
      params.working_directory || context.workingDirectory

    if (!command || typeof command !== 'string') {
      return {
        success: false,
        error: 'command 参数必须是有效的字符串'
      }
    }

    try {
      // 如果指定了工作目录，则先 cd 到该目录
      let finalCommand = command
      if (working_directory) {
        finalCommand = `cd "${working_directory}" && ${finalCommand}`
      }

      // 如果指定了超时，使用 timeout 命令包裹
      if (timeout !== undefined && typeof timeout === 'number' && timeout > 0) {
        finalCommand = `timeout ${Math.floor(timeout)} ${finalCommand}`
      }

      const result = await executeSSHCommand(context.sessionId, finalCommand)

      // 命令执行成功（退出码为 0）
      if (result.code === 0) {
        return {
          success: true,
          message: '命令执行成功',
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
            exit_code: result.code
          }
        }
      } else {
        // 命令执行失败（非零退出码）
        return {
          success: false,
          error: `命令执行失败（退出码: ${result.code}）`,
          data: {
            stdout: result.stdout,
            stderr: result.stderr,
            exit_code: result.code
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}
