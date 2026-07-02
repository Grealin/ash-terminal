import { getSSH } from '../../SSHPool'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'
import { escapeSedPattern, escapeSedReplacement, checkBinaryFile } from './toolHelpers'

/**
 * 文件修改工具
 * 使用 sed 命令修改已存在的文件，支持正则表达式和备份
 */
export class FileModifyTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'modify_file',
      description:
        '修改远程服务器上已存在的文件。支持正则表达式匹配替换、删除行、插入行、块替换和追加操作。自动创建 .bak 备份文件。适用于配置文件修改、文本替换等操作。',
      parameters: {
        type: 'object',
        properties: {
          file_path: {
            type: 'string',
            description: '要修改的文件的完整路径（例如：/etc/nginx/nginx.conf）。文件必须已存在。'
          },
          operation: {
            type: 'string',
            enum: ['replace', 'delete', 'insert_after', 'insert_before', 'append', 'replace_block'],
            description:
              '操作类型：replace=替换匹配行, delete=删除匹配行, insert_after=在匹配行后插入, insert_before=在匹配行前插入, append=追加到文件末尾, replace_block=替换匹配到的整个代码块（多行）'
          },
          pattern: {
            type: 'string',
            description:
              '用于匹配的正则表达式模式（sed 格式）。对于 append 操作此参数可选。对于 replace_block，此参数为起始匹配模式。'
          },
          end_pattern: {
            type: 'string',
            description:
              'replace_block 操作的结束匹配模式。如果未指定，则使用 pattern 的值。仅用于 replace_block 操作。'
          },
          replacement: {
            type: 'string',
            description:
              '替换内容或要插入的文本。replace 操作时为替换文本，insert 操作时为要插入的行，append 操作时为要追加的内容，replace_block 操作时为多行替换文本。'
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
    const {
      file_path,
      operation,
      pattern,
      end_pattern,
      replacement,
      global = false,
      line_number
    } = params

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

    const validOperations = [
      'replace',
      'delete',
      'insert_after',
      'insert_before',
      'append',
      'replace_block'
    ]
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

    // replace_block 需要 pattern
    if (operation === 'replace_block' && !pattern) {
      return {
        success: false,
        error: 'replace_block 操作需要提供 pattern 参数'
      }
    }

    if (
      ['replace', 'insert_after', 'insert_before', 'append', 'replace_block'].includes(operation) &&
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

      // 二进制文件检测：对二进制文件拒绝 sed 操作
      const binaryCheck = await checkBinaryFile(ssh, file_path)
      if (binaryCheck.isBinary) {
        return {
          success: false,
          error: `目标文件可能是二进制文件 (${binaryCheck.mimeType || '未知类型'})，sed 操作可能损坏文件。请使用其他方式修改。`,
          metadata: {
            mimeType: binaryCheck.mimeType
          }
        }
      }

      // 构建 sed 命令
      let sedCommand: string

      if (line_number !== undefined) {
        // 按行号操作
        switch (operation) {
          case 'replace':
            sedCommand = `sed -i.bak '${line_number}c\\${escapeSedReplacement(replacement)}' "${file_path}"`
            break
          case 'delete':
            sedCommand = `sed -i.bak '${line_number}d' "${file_path}"`
            break
          case 'insert_after':
            sedCommand = `sed -i.bak '${line_number}a\\${escapeSedReplacement(replacement)}' "${file_path}"`
            break
          case 'insert_before':
            sedCommand = `sed -i.bak '${line_number}i\\${escapeSedReplacement(replacement)}' "${file_path}"`
            break
          default:
            return { success: false, error: `不支持的按行操作类型: ${operation}` }
        }
      } else if (operation === 'replace_block') {
        // 块级替换：将匹配 start_pattern 到 end_pattern 的行替换为多行内容
        const blockEnd = end_pattern || pattern!
        const escapedStart = escapeSedPattern(pattern!)
        const escapedEnd = escapeSedPattern(blockEnd)

        // 将多行 replacement 构建为 sed c\ 命令的续行格式
        const lines = replacement.split('\n')
        const sedScript = [
          `/${escapedStart}/,/${escapedEnd}/c\\`,
          ...lines.map((l: string) => escapeSedReplacement(l) + '\\'),
          '' // 终止 c\ 命令的空行
        ].join('\n')

        // 通过 base64 写入临时 sed 脚本，执行后清理
        const scriptBase64 = Buffer.from(sedScript).toString('base64')
        const scriptPath = `/tmp/sed_blk_${Date.now()}.sed`
        sedCommand =
          `echo "${scriptBase64}" | base64 -d > "${scriptPath}" && ` +
          `sed -i.bak -f "${scriptPath}" "${file_path}" && ` +
          `rm -f "${scriptPath}" && echo "DONE"`
      } else if (operation === 'append') {
        // 追加到文件末尾
        sedCommand = `sed -i.bak '$a\\${escapeSedReplacement(replacement)}' "${file_path}"`
      } else {
        // 按模式操作（address 模式或 s/// 模式）
        const escapedPattern = escapeSedPattern(pattern!)
        const globalFlag = global ? 'g' : ''

        switch (operation) {
          case 'replace':
            sedCommand = `sed -i.bak 's/${escapedPattern}/${escapeSedReplacement(replacement)}/${globalFlag}' "${file_path}"`
            break
          case 'delete':
            sedCommand = `sed -i.bak '/${escapedPattern}/d' "${file_path}"`
            break
          case 'insert_after':
            sedCommand = `sed -i.bak '/${escapedPattern}/a\\${escapeSedReplacement(replacement)}' "${file_path}"`
            break
          case 'insert_before':
            sedCommand = `sed -i.bak '/${escapedPattern}/i\\${escapeSedReplacement(replacement)}' "${file_path}"`
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

      // 对 replace_block 检查 DONE 标记
      if (operation === 'replace_block') {
        if (!result.stdout.includes('DONE')) {
          return {
            success: false,
            error: `块替换执行异常: ${result.stderr || result.stdout}`
          }
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
