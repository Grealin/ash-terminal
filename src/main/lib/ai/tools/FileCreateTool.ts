import { getSSH } from '../../SSHPool'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 文件创建工具
 * 用于在远程服务器上创建新文件（文件必须不存在）
 */
export class FileCreateTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'create_file',
      description:
        '在远程服务器上创建一个新文件。如果文件已存在则会失败。会自动创建所需的目录结构。适用于创建新的配置文件、脚本等。',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '要创建的文件的完整路径（例如：/home/user/config.txt）'
          },
          content: {
            type: 'string',
            description: '文件的初始内容。可以是空字符串创建空文件。'
          },
          mode: {
            type: 'string',
            description: '文件权限模式（例如：644, 755）。可选，默认使用系统默认权限。'
          }
        },
        required: ['file_path', 'content']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const { file_path, content, mode } = params

    if (!file_path || typeof file_path !== 'string') {
      return {
        success: false,
        error: 'file_path 参数必须是有效的字符串'
      }
    }

    if (content === undefined || content === null) {
      return {
        success: false,
        error: 'content 参数不能为空'
      }
    }

    // 验证 mode 参数
    if (mode !== undefined && (typeof mode !== 'string' || !/^[0-7]{3,4}$/.test(mode))) {
      return {
        success: false,
        error: 'mode 必须是有效的权限模式（例如：644, 755）'
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
      // 提取父目录路径
      const dir = file_path.substring(0, file_path.lastIndexOf('/'))

      // 使用 base64 编码来避免特殊字符问题
      const contentBase64 = Buffer.from(String(content)).toString('base64')

      // 合并为单次 SSH 调用：检查文件是否存在 → 创建目录 → base64 写入 → chmod → 验证 → 获取文件信息
      const chmodCmd = mode ? ` && chmod ${mode} "${file_path}"` : ''
      const createCommand =
        `if test -f "${file_path}"; then ` +
        `echo "EXISTS"; ` +
        `else ` +
        (dir ? `mkdir -p "${dir}" && ` : '') +
        `echo "${contentBase64}" | base64 -d > "${file_path}"` +
        chmodCmd +
        ` && test -f "${file_path}" && echo "CREATED" && ls -lh "${file_path}"; ` +
        `fi`

      const result = await ssh.execCommand(createCommand)
      const stdout = result.stdout.trim()

      // 检查文件是否已存在
      if (stdout.startsWith('EXISTS')) {
        return {
          success: false,
          error: `文件已存在: ${file_path}。如需修改现有文件，请使用 modify_file 工具。`
        }
      }

      if (result.code !== 0 && result.stderr) {
        return {
          success: false,
          error: `创建文件失败: ${result.stderr}`
        }
      }

      // 验证是否创建成功
      if (!stdout.includes('CREATED')) {
        return {
          success: false,
          error: '文件创建后验证失败'
        }
      }

      // 从输出中提取 ls -lh 的结果（"CREATED" 之后的内容）
      const fileInfo = stdout.includes('CREATED')
        ? stdout.substring(stdout.indexOf('CREATED') + 'CREATED'.length).trim()
        : ''

      return {
        success: true,
        message: `成功创建文件: ${file_path}`,
        data: {
          file_path,
          content_length: String(content).length,
          mode: mode || 'default',
          file_info: fileInfo
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
