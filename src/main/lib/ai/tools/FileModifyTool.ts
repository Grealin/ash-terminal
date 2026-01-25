import { getSSH } from '../../SSHPoolT'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 文件修改工具
 * 使用 sed 命令修改已存在的文件，支持正则表达式和备份
 */
export class FileModifyTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'modify_file',
      description:
        '使用 sed 命令修改远程服务器上已存在的文件。支持正则表达式匹配和替换，自动创建 .bak 备份文件。适用于配置文件修改、文本替换等操作。',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '要修改的文件的完整路径（例如：/etc/nginx/nginx.conf）。文件必须已存在。'
          },
          operation: {
            type: 'string',
            enum: ['replace', 'delete', 'insert_after', 'insert_before', 'append'],
            description:
              '操作类型：replace=替换匹配行, delete=删除匹配行, insert_after=在匹配行后插入, insert_before=在匹配行前插入, append=追加到文件末尾'
          },
          pattern: {
            type: 'string',
            description: '用于匹配的正则表达式模式（sed 格式）。对于 append 操作此参数可选。'
          },
          replacement: {
            type: 'string',
            description:
              '替换内容或要插入的文本。replace 操作时为替换文本，insert 操作时为要插入的行，append 操作时为要追加的内容。'
          },
          global: {
            type: 'boolean',
            description:
              '是否全局替换（replace 操作）。true=替换所有匹配，false=只替换每行第一个匹配。默认 false。'
          },
          line_number: {
            type: 'integer',
            description: '指定操作的行号（可选）。如果指定，则只对该行执行操作，忽略 pattern。'
          }
        },
        required: ['file_path', 'operation']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const { file_path, operation, pattern, replacement, global = false, line_number } = params

    // 参数验证
    if (!file_path || typeof file_path !== 'string') {
      return {
        success: false,
        error: 'file_path 参数必须是有效的字符串'
      }
    }

    if (!operation || typeof operation !== 'string') {
      return {
        success: false,
        error: 'operation 参数必须是有效的操作类型'
      }
    }

    const validOperations = ['replace', 'delete', 'insert_after', 'insert_before', 'append']
    if (!validOperations.includes(operation)) {
      return {
        success: false,
        error: `operation 必须是以下之一: ${validOperations.join(', ')}`
      }
    }

    // append 操作不需要 pattern
    if (operation !== 'append' && !pattern && !line_number) {
      return {
        success: false,
        error: '必须提供 pattern 或 line_number 参数'
      }
    }

    if (
      ['replace', 'insert_after', 'insert_before', 'append'].includes(operation) &&
      replacement === undefined
    ) {
      return {
        success: false,
        error: `${operation} 操作需要提供 replacement 参数`
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
      // 检查文件是否存在
      const checkResult = await ssh.execCommand(`test -f "${file_path}" && echo "exists"`)
      if (checkResult.stdout.trim() !== 'exists') {
        return {
          success: false,
          error: `文件不存在: ${file_path}。如需创建新文件，请使用 create_file 工具。`
        }
      }

      // 构建 sed 命令
      let sedCommand: string

      // 转义特殊字符的辅助函数
      const escapeForSed = (str: string): string => {
        return str.replace(/\//g, '\\/').replace(/&/g, '\\&')
      }

      if (line_number !== undefined) {
        // 按行号操作
        switch (operation) {
          case 'replace':
            sedCommand = `sed -i.bak '${line_number}c\\${escapeForSed(replacement)}' "${file_path}"`
            break
          case 'delete':
            sedCommand = `sed -i.bak '${line_number}d' "${file_path}"`
            break
          case 'insert_after':
            sedCommand = `sed -i.bak '${line_number}a\\${escapeForSed(replacement)}' "${file_path}"`
            break
          case 'insert_before':
            sedCommand = `sed -i.bak '${line_number}i\\${escapeForSed(replacement)}' "${file_path}"`
            break
          default:
            return { success: false, error: `不支持的操作类型: ${operation}` }
        }
      } else if (operation === 'append') {
        // 追加到文件末尾
        sedCommand = `sed -i.bak '$a\\${escapeForSed(replacement)}' "${file_path}"`
      } else {
        // 按模式操作
        const escapedPattern = escapeForSed(pattern!)
        const globalFlag = global ? 'g' : ''

        switch (operation) {
          case 'replace':
            sedCommand = `sed -i.bak 's/${escapedPattern}/${escapeForSed(replacement)}/${globalFlag}' "${file_path}"`
            break
          case 'delete':
            sedCommand = `sed -i.bak '/${escapedPattern}/d' "${file_path}"`
            break
          case 'insert_after':
            sedCommand = `sed -i.bak '/${escapedPattern}/a\\${escapeForSed(replacement)}' "${file_path}"`
            break
          case 'insert_before':
            sedCommand = `sed -i.bak '/${escapedPattern}/i\\${escapeForSed(replacement)}' "${file_path}"`
            break
          default:
            return { success: false, error: `不支持的操作类型: ${operation}` }
        }
      }

      // 执行 sed 命令
      const result = await ssh.execCommand(sedCommand)

      if (result.code !== 0 && result.stderr) {
        return {
          success: false,
          error: `文件修改失败: ${result.stderr}`
        }
      }

      // 验证备份文件是否创建
      const bakFile = `${file_path}.bak`
      const bakCheckResult = await ssh.execCommand(`test -f "${bakFile}" && echo "exists"`)
      const backupCreated = bakCheckResult.stdout.trim() === 'exists'

      // 获取修改前后的差异
      let diff = ''
      if (backupCreated) {
        const diffResult = await ssh.execCommand(`diff -u "${bakFile}" "${file_path}" || true`)
        diff = diffResult.stdout
      }

      return {
        success: true,
        message: `成功修改文件: ${file_path}`,
        data: {
          file_path,
          operation,
          backup_file: backupCreated ? bakFile : null,
          diff_preview: diff ? diff.split('\n').slice(0, 20).join('\n') : '无差异'
        },
        metadata: {
          operation,
          pattern: pattern || null,
          line_number: line_number || null,
          backup_created: backupCreated
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
