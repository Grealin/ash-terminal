import { writeToShell } from '../../Shell'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * Sudo 命令执行工具
 * 在交互式 Shell 中执行需要 sudo 权限的命令，支持用户手动输入密码
 */
export class SudoCommandTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'execute_sudo_command',
      description:
        '在交互式终端中执行需要 sudo 权限的命令。命令会发送到用户的交互式 Shell，用户可以实时看到输出并手动输入 sudo 密码。适用于需要管理员权限的操作，如安装软件、修改系统配置等。注意：此工具不会等待命令执行完成，只是将命令发送到终端。',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的命令（不需要包含 sudo 前缀，系统会自动添加）'
          },
          working_directory: {
            type: 'string',
            description: '命令执行的工作目录。如果指定，会先 cd 到该目录。'
          },
          auto_confirm: {
            type: 'boolean',
            description:
              '是否自动添加回车符执行命令。默认为 true。如果为 false，只发送命令文本不执行。'
          }
        },
        required: ['command']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const command: string = params.command
    // AI 显式指定的 working_directory 优先，否则自动使用 context 中的工作目录
    const working_directory: string | undefined =
      params.working_directory || context.workingDirectory
    const auto_confirm: boolean = params.auto_confirm ?? true

    if (!command || typeof command !== 'string') {
      return {
        success: false,
        error: 'command 参数必须是有效的字符串'
      }
    }

    try {
      // 构建完整的命令
      let fullCommand = `sudo ${command}`

      // 如果指定了工作目录，先 cd
      if (working_directory) {
        fullCommand = `cd "${working_directory}" && ${fullCommand}`
      }

      // 如果自动确认，添加换行符
      if (auto_confirm) {
        fullCommand += '\n'
      }

      // 将命令写入交互式 Shell
      writeToShell(context.sessionId, fullCommand)

      return {
        success: true,
        message: '命令已发送到交互式终端，请在终端中查看执行结果并输入密码（如需要）',
        data: {
          command: fullCommand.trim(),
          sent_to_shell: true,
          interactive: true,
          note: '此命令在交互式 Shell 中执行，用户可以实时查看输出和输入密码'
        },
        metadata: {
          requires_password: true,
          execution_mode: 'interactive',
          auto_confirmed: auto_confirm
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
