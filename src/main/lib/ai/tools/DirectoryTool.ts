import { getSSH } from '@/lib/sshPool'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * 目录查询工具
 * 查询目录结构（递归或非递归）
 */
export class DirectoryTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'directory_list',
      description: 'List directory contents or tree structure on the remote server',
      parameters: [
        {
          name: 'path',
          type: 'string',
          description: 'The directory path to list',
          required: true
        },
        {
          name: 'recursive',
          type: 'boolean',
          description: 'Whether to list recursively (tree view)',
          required: false,
          default: false
        },
        {
          name: 'maxDepth',
          type: 'number',
          description: 'Maximum depth for recursive listing (default: 3)',
          required: false,
          default: 3
        }
      ],
      requiresApproval: false,
      category: 'file'
    }
  }

  async execute(
    context: ToolExecutionContext,
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
      this.validateParams(params, this.getDefinition())

      const { path, recursive = false, maxDepth = 3 } = params
      const ssh = getSSH(context.sessionId)

      if (!ssh) {
        return this.formatError('SSH connection not found', Date.now() - startTime)
      }

      let command: string
      if (recursive) {
        // 使用 tree 命令（如果可用）或 find 命令
        command = `if command -v tree &> /dev/null; then tree -L ${maxDepth} -F "${path}"; else find "${path}" -maxdepth ${maxDepth} -print | sed 's|[^/]*/| |g'; fi`
      } else {
        // 使用 ls -lah 列出详细信息
        command = `ls -lah "${path}"`
      }

      const result = await ssh.execCommand(command)

      if (result.code !== 0) {
        return this.formatError(result.stderr || 'Failed to list directory', Date.now() - startTime)
      }

      return this.formatSuccess(
        {
          path,
          recursive,
          content: result.stdout
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
