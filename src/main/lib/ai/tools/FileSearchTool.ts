import { getSSH } from '@/lib/SSHPool'
import { ToolDefinition, ToolExecutionContext, ToolExecutionResult } from '@shared/models'
import { BaseTool } from './BaseTool'

/**
 * 文件搜索工具
 * 在指定目录下搜索包含关键字的文件
 */
export class FileSearchTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'file_search',
      description: 'Search for files containing specific keywords in a directory',
      parameters: [
        {
          name: 'path',
          type: 'string',
          description: 'The directory path to search in',
          required: true
        },
        {
          name: 'keyword',
          type: 'string',
          description: 'The keyword to search for',
          required: true
        },
        {
          name: 'filePattern',
          type: 'string',
          description: 'File name pattern to filter (e.g., "*.js", "*.py")',
          required: false,
          default: '*'
        },
        {
          name: 'caseSensitive',
          type: 'boolean',
          description: 'Whether the search is case sensitive',
          required: false,
          default: false
        }
      ],
      requiresApproval: false,
      category: 'search'
    }
  }

  async execute(
    context: ToolExecutionContext,
    params: Record<string, any>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()

    try {
      this.validateParams(params, this.getDefinition())

      const { path, keyword, filePattern = '*', caseSensitive = false } = params
      const ssh = getSSH(context.sessionId)

      if (!ssh) {
        return this.formatError('SSH connection not found', Date.now() - startTime)
      }

      // 构建 grep 命令
      const grepFlags = caseSensitive ? '-rn' : '-rin'
      const command = `find "${path}" -type f -name "${filePattern}" -exec grep ${grepFlags} "${keyword}" {} + 2>/dev/null || echo "No matches found"`

      const result = await ssh.execCommand(command)

      // grep 返回 1 表示没有匹配，这不是错误
      if (result.code !== 0 && result.code !== 1) {
        return this.formatError(result.stderr || 'Search failed', Date.now() - startTime)
      }

      const matches = result.stdout
        .split('\n')
        .filter((line) => line.trim() !== '' && line !== 'No matches found')

      return this.formatSuccess(
        {
          path,
          keyword,
          filePattern,
          matchCount: matches.length,
          matches: matches.slice(0, 100) // 限制返回前 100 个匹配
        },
        Date.now() - startTime
      )
    } catch (error: any) {
      return this.formatError(error.message, Date.now() - startTime)
    }
  }
}
