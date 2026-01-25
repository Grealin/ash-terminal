import { getSSH } from '../../SSHPoolT'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 文件读取工具
 * 用于读取远程服务器上的文件内容，支持按行范围读取
 */
export class FileReadTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'read_file',
      description:
        '读取远程服务器上指定路径的文件内容。支持读取完整文件或指定行范围。使用 sed 命令按行读取，适合处理大文件。',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description:
              '要读取的文件的完整路径（例如：/home/user/config.txt）。支持相对路径和绝对路径。'
          },
          start_line: {
            type: 'integer',
            description: '起始行号（从 1 开始）。如果不指定，则从第一行开始读取。'
          },
          end_line: {
            type: 'integer',
            description: '结束行号（包含）。如果不指定，则读取到文件末尾。'
          },
          max_lines: {
            type: 'integer',
            description: '最大读取行数。用于限制输出大小，避免读取过大文件。默认无限制。'
          }
        },
        required: ['file_path']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const { file_path, start_line, end_line, max_lines } = params

    if (!file_path || typeof file_path !== 'string') {
      return {
        success: false,
        error: 'file_path 参数必须是有效的字符串'
      }
    }

    // 参数验证
    if (start_line !== undefined && (typeof start_line !== 'number' || start_line < 1)) {
      return {
        success: false,
        error: 'start_line 必须是大于 0 的整数'
      }
    }

    if (end_line !== undefined && (typeof end_line !== 'number' || end_line < 1)) {
      return {
        success: false,
        error: 'end_line 必须是大于 0 的整数'
      }
    }

    if (start_line !== undefined && end_line !== undefined && start_line > end_line) {
      return {
        success: false,
        error: 'start_line 不能大于 end_line'
      }
    }

    if (max_lines !== undefined && (typeof max_lines !== 'number' || max_lines < 1)) {
      return {
        success: false,
        error: 'max_lines 必须是大于 0 的整数'
      }
    }

    const ssh = getSSH(context.sessionId)
    if (!ssh) {
      return {
        success: false,
        error: 'SSH 连接未找到'
      }
    }

    try {
      // 构建 sed 命令
      let sedCommand: string

      if (start_line !== undefined || end_line !== undefined) {
        // 读取指定行范围
        const startLineNum = start_line || 1
        const endLineNum = end_line || '$' // $ 表示最后一行
        sedCommand = `sed -n '${startLineNum},${endLineNum}p' "${file_path}"`
      } else {
        // 读取整个文件
        sedCommand = `sed -n '1,$p' "${file_path}"`
      }

      // 如果指定了 max_lines，使用 head 限制输出行数
      if (max_lines !== undefined) {
        sedCommand = `${sedCommand} | head -n ${max_lines}`
      }

      const result = await ssh.execCommand(sedCommand)

      if (result.stderr && result.code !== 0) {
        return {
          success: false,
          error: `读取文件失败: ${result.stderr}`
        }
      }

      // 统计实际读取的行数
      const lines = result.stdout ? result.stdout.split('\n') : []
      const actualLines = result.stdout ? lines.length : 0

      return {
        success: true,
        data: result.stdout,
        message: `成功读取文件: ${file_path}${start_line || end_line ? ` (行 ${start_line || 1}-${end_line || '末尾'})` : ''}`,
        metadata: {
          file_path,
          start_line: start_line || 1,
          end_line: end_line || 'EOF',
          lines_read: actualLines,
          truncated: max_lines !== undefined && actualLines >= max_lines
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
