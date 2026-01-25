import { getSSH } from '../../SSHPool'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 文件搜索工具
 * 在指定目录下搜索包含特定关键字的文件
 */
export class FileSearchTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'search_files',
      description:
        '在指定目录下搜索包含特定关键字的文件。使用 grep 递归搜索文件内容，返回匹配的文件路径和行号。',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: '要搜索的目录路径（例如：/home/user/project）。默认为当前工作目录。'
          },
          keyword: {
            type: 'string',
            description: '要搜索的关键字或正则表达式模式'
          },
          file_pattern: {
            type: 'string',
            description: '文件名匹配模式（例如：*.txt, *.js）。可选，默认搜索所有文件。'
          },
          case_sensitive: {
            type: 'boolean',
            description: '是否区分大小写。默认为 false（不区分大小写）。'
          },
          max_results: {
            type: 'integer',
            description: '最大返回结果数量。默认为 100。'
          }
        },
        required: ['keyword']
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const {
      directory = '.',
      keyword,
      file_pattern = '*',
      case_sensitive = false,
      max_results = 100
    } = params

    if (!keyword || typeof keyword !== 'string') {
      return {
        success: false,
        error: 'keyword 参数必须是有效的字符串'
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
      // 如果使用默认值 '.'，先获取当前工作目录
      // 因为 execCommand 每次都是新会话，默认在 home 目录
      let targetDirectory = directory
      if (directory === '.') {
        // 通过环境变量 PWD 或 pwd 命令获取当前目录
        const pwdResult = await ssh.execCommand('echo $PWD || pwd')
        if (pwdResult.code === 0 && pwdResult.stdout.trim()) {
          targetDirectory = pwdResult.stdout.trim()
        } else {
          // 如果获取失败，使用 home 目录
          targetDirectory = '~'
        }
      }

      // 构建 grep 命令
      const caseSensitiveFlag = case_sensitive ? '' : '-i'
      const grepCommand = `grep -rn ${caseSensitiveFlag} --include="${file_pattern}" "${keyword}" "${targetDirectory}" 2>/dev/null | head -n ${max_results}`

      const result = await ssh.execCommand(grepCommand)

      // grep 返回码 1 表示未找到匹配，这不是错误
      if (result.code !== 0 && result.code !== 1) {
        return {
          success: false,
          error: `搜索失败: ${result.stderr || '未知错误'}`
        }
      }

      if (!result.stdout.trim()) {
        return {
          success: true,
          message: '未找到匹配的文件',
          data: {
            matches: [],
            total: 0
          }
        }
      }

      // 解析 grep 输出
      const lines = result.stdout.trim().split('\n')
      const matches = lines
        .map((line) => {
          const match = line.match(/^([^:]+):(\d+):(.+)$/)
          if (match) {
            return {
              file: match[1],
              line_number: parseInt(match[2]),
              content: match[3].trim()
            }
          }
          return null
        })
        .filter(Boolean)

      return {
        success: true,
        message: `找到 ${matches.length} 个匹配项`,
        data: {
          matches,
          total: matches.length,
          truncated: matches.length >= max_results
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
