import { getSSH } from '@/lib/sshPool'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * 文件写入工具
 * 修改远程服务器上的文件内容
 */
export class FileWriteTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'file_write',
      description: 'Write or modify a file on the remote server',
      parameters: [
        {
          name: 'path',
          type: 'string',
          description: 'The absolute path to the file',
          required: true
        },
        {
          name: 'content',
          type: 'string',
          description: 'The content to write to the file',
          required: true
        },
        {
          name: 'mode',
          type: 'string',
          description: 'Write mode: overwrite or append',
          required: false,
          enum: ['overwrite', 'append'],
          default: 'overwrite'
        }
      ],
      requiresApproval: true,
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

      const { path, content, mode = 'overwrite' } = params
      const ssh = getSSH(context.sessionId)

      if (!ssh) {
        return this.formatError('SSH connection not found', Date.now() - startTime)
      }

      // 转义内容中的特殊字符
      const escapedContent = content.replace(/'/g, "'\\''")

      // 根据模式选择命令
      const operator = mode === 'append' ? '>>' : '>'
      const command = `echo '${escapedContent}' ${operator} "${path}"`

      const result = await ssh.execCommand(command)

      if (result.code !== 0) {
        return this.formatError(result.stderr || 'Failed to write file', Date.now() - startTime)
      }

      return this.formatSuccess(
        {
          path,
          mode,
          bytesWritten: Buffer.byteLength(content, 'utf-8')
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
