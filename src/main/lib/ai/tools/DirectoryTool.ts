import { getSSH } from '../../SSHPool'
import { BaseTool, ToolContext, ToolDefinition, ToolResult } from './BaseTool'

/**
 * 目录结构工具
 * 递归查询指定目录下的文件结构树
 */
export class DirectoryTool extends BaseTool {
  getDefinition(): ToolDefinition {
    return {
      name: 'list_directory',
      description:
        '递归列出指定目录下的文件和子目录结构。可以控制递归深度，返回树状结构的目录内容。',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: '要查询的目录路径（例如：/home/user/project）。默认为当前工作目录。'
          },
          max_depth: {
            type: 'integer',
            description: '最大递归深度。1 表示只列出当前目录，2 表示包含子目录一层。默认为 3。'
          },
          show_hidden: {
            type: 'boolean',
            description: '是否显示隐藏文件（以 . 开头的文件）。默认为 false。'
          },
          file_only: {
            type: 'boolean',
            description: '是否只显示文件（不显示目录）。默认为 false。'
          }
        },
        required: []
      }
    }
  }

  async execute(context: ToolContext, params: Record<string, any>): Promise<ToolResult> {
    const { directory = '.', max_depth = 3, show_hidden = false, file_only = false } = params

    const ssh = getSSH(context.sessionId)
    if (!ssh) {
      return {
        success: false,
        error: 'SSH 连接未找到'
      }
    }

    try {
      // 如果使用默认值 '.'，先获取当前工作目录
      // 优先使用 context 中由 Agent 注入的 PTY Shell 真实工作目录
      let targetDirectory = directory
      if (directory === '.') {
        if (context.workingDirectory) {
          targetDirectory = context.workingDirectory
        } else {
          // 回退：通过 execCommand 获取（exec 独立会话，通常为 home 目录）
          const pwdResult = await ssh.execCommand('echo $PWD || pwd')
          if (pwdResult.code === 0 && pwdResult.stdout.trim()) {
            targetDirectory = pwdResult.stdout.trim()
          } else {
            targetDirectory = '~'
          }
        }
      }

      // 构建 tree 命令（如果不存在则使用 find）
      const treeCommand = `which tree > /dev/null 2>&1 && echo "tree" || echo "find"`
      const hasTreeResult = await ssh.execCommand(treeCommand)
      const hasTree = hasTreeResult.stdout.trim() === 'tree'

      let command: string
      if (hasTree) {
        // 使用 tree 命令
        const hiddenFlag = show_hidden ? '-a' : ''
        const fileOnlyFlag = file_only ? '-f' : ''
        command = `tree -L ${max_depth} ${hiddenFlag} ${fileOnlyFlag} "${targetDirectory}"`
      } else {
        // 使用 find 命令作为备选
        const hiddenPattern = show_hidden ? '' : '-name ".*" -prune -o'
        const typeFlag = file_only ? '-type f' : ''
        command = `find "${targetDirectory}" ${hiddenPattern} -maxdepth ${max_depth} ${typeFlag} -print 2>/dev/null | sort`
      }

      const result = await ssh.execCommand(command)

      if (result.code !== 0 && result.stderr) {
        return {
          success: false,
          error: `查询目录失败: ${result.stderr}`
        }
      }

      if (!result.stdout.trim()) {
        return {
          success: true,
          message: '目录为空或无权访问',
          data: {
            structure: '',
            files: []
          }
        }
      }

      // 解析输出
      let files: string[] = []
      if (hasTree) {
        // tree 命令直接返回树状结构
        const lines = result.stdout.split('\n')
        // 提取文件列表（去除树状图字符）
        files = lines
          .filter(
            (line) => line.trim() && !line.includes('directories') && !line.includes('directory')
          )
          .map((line) => line.replace(/[├└│─\s]+/g, '').trim())
          .filter(Boolean)
      } else {
        // find 命令返回路径列表
        files = result.stdout.split('\n').filter((line) => line.trim())
      }

      return {
        success: true,
        message: `成功列出目录结构: ${targetDirectory}`,
        data: {
          directory: targetDirectory,
          structure: result.stdout,
          files,
          total_count: files.length,
          max_depth,
          method: hasTree ? 'tree' : 'find'
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
