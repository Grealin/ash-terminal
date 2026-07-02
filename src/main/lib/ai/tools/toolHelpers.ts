import type { SSH2Wrapper } from '../../SSH2Wrapper'

/**
 * 工具辅助函数
 * 提供跨工具共享的通用能力
 */

/**
 * sed 正则模式转义
 * 转义 BRE（基本正则表达式）中的元字符以及 sed 分隔符 "/"
 * 用于 sed 的地址模式和 s/// 的左侧
 */
export function escapeSedPattern(str: string): string {
  return str.replace(/[.*^$[\]\\/]/g, '\\$&')
}

/**
 * sed 替换字符串转义
 * 转义 sed s/// 右侧中具有特殊含义的字符：/ & \
 */
export function escapeSedReplacement(str: string): string {
  return str.replace(/[/&\\]/g, '\\$&')
}

/**
 * 二进制文件检测结果
 */
export interface BinaryCheckResult {
  isBinary: boolean
  mimeType?: string
}

/**
 * 检测远程文件是否为二进制文件
 * 使用 file 命令检测 MIME 类型，若 file 命令不可用则默认返回非二进制
 */
export async function checkBinaryFile(
  ssh: SSH2Wrapper,
  filePath: string
): Promise<BinaryCheckResult> {
  try {
    const result = await ssh.execCommand(
      `file -b --mime-type "${filePath}" 2>/dev/null || echo "UNKNOWN"`
    )
    const mimeType = result.stdout.trim()
    if (mimeType === 'UNKNOWN' || !mimeType) {
      // file 命令不可用，跳过检测（不阻塞正常流程）
      return { isBinary: false }
    }

    // 文本类型的 MIME 前缀和白名单
    const textLikeTypes = [
      'text/',
      'application/json',
      'application/xml',
      'application/javascript',
      'application/x-sh',
      'application/x-shellscript',
      'application/x-python',
      'application/x-yaml',
      'application/x-toml',
      'application/x-httpd-php',
      'application/x-perl',
      'application/x-ruby',
      'application/x-csh',
      'inode/x-empty'
    ]
    const isText = textLikeTypes.some((t) => mimeType.startsWith(t))

    return { isBinary: !isText, mimeType }
  } catch {
    // file 命令执行失败，跳过检测
    return { isBinary: false }
  }
}
