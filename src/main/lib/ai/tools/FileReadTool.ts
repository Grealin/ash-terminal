import { getSSH } from '@/lib/SSHPool'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * 文件读取工具
 * 读取远程服务器上的文件内容
 */
export class FileReadTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'file_read',
      description: 'Read the contents of a file from the remote server',
      parameters: [
        {
          name: 'path',
          type: 'string',
          description: 'The absolute path to the file to read',
          required: true
        },
        {
          name: 'encoding',
          type: 'string',
          description: 'File encoding (default: utf-8)',
          required: false,
          enum: ['utf-8', 'ascii', 'base64'],
          default: 'utf-8'
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

      const { path, encoding = 'utf-8' } = params
      const ssh = getSSH(context.sessionId)

      if (!ssh) {
        return this.formatError('SSH connection not found', Date.now() - startTime)
      }

      // 使用 cat 命令读取文件
      const result = await ssh.execCommand(`cat "${path}"`)

      if (result.code !== 0) {
        return this.formatError(result.stderr || 'Failed to read file', Date.now() - startTime)
      }

      return this.formatSuccess(
        {
          path,
          content: result.stdout,
          size: Buffer.byteLength(result.stdout, encoding as BufferEncoding)
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
