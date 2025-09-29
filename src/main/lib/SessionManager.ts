import { SSH2Wrapper } from '@/lib/SSH2Wrapper'
import { FileInfo, SSHConfig } from '@shared/models'
import { config } from 'dotenv'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

// 加载环境变量
const loadEnvConfig = (): void => {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  const envPath = path.join(process.cwd(), '.env')

  // 优先检查 .env.local 是否存在
  if (fs.existsSync(envLocalPath)) {
    config({ path: envLocalPath })
  } else if (fs.existsSync(envPath)) {
    config({ path: envPath })
  }
}

// 执行环境变量加载
loadEnvConfig()

// 动态导入 electron-store
let Store: any = null
let sessionStore: any = null

// SSH连接池
const sshConnections: Map<string, SSH2Wrapper> = new Map()

// 解析路径中的 ~ 符号
const resolveTildePath = async (ssh: SSH2Wrapper, path: string): Promise<string> => {
  if (!path.includes('~')) {
    return path
  }

  try {
    // 使用 echo ~ 获取家目录路径
    const homeResult = await ssh.execCommand('echo ~')
    if (homeResult.stdout && !homeResult.stderr) {
      const homePath = homeResult.stdout.trim()
      // 将路径中的 ~ 替换为实际的家目录路径
      return path.replace(/^~/, homePath)
    } else {
      throw new Error('Failed to get home directory using echo ~')
    }
  } catch (error) {
    // 如果获取家目录失败，尝试备用方案
    try {
      const homeResult = await ssh.execCommand('echo $HOME')
      if (homeResult.stdout && !homeResult.stderr) {
        const homePath = homeResult.stdout.trim()
        return path.replace(/^~/, homePath)
      } else {
        throw new Error('Failed to get home directory using $HOME')
      }
    } catch (fallbackError) {
      // 最后的备用方案：使用用户名构建路径
      try {
        const whoamiResult = await ssh.execCommand('whoami')
        if (whoamiResult.stdout && !whoamiResult.stderr) {
          const username = whoamiResult.stdout.trim()
          return path.replace(/^~/, `/home/${username}`)
        } else {
          throw new Error('Failed to get username')
        }
      } catch (usernameError) {
        throw new Error(`Unable to resolve path with ~: ${usernameError}`)
      }
    }
  }
}

// 初始化会话存储
export const initSessionStore = async (): Promise<void> => {
  if (!sessionStore) {
    if (!Store) {
      const { default: ElectronStore } = await import('electron-store')
      Store = ElectronStore
    }

    // 获取加密密钥
    const encryptionKey = process.env.SECRET_KEY
    if (!encryptionKey) {
      throw new Error('SECRET_KEY not found in environment variables')
    }

    sessionStore = new Store({
      name: 'sessions',
      cwd: app.getPath('userData'),
      encryptionKey: encryptionKey, // 启用加密
      defaults: {
        sessions: []
      }
    })
  }
}

// 获取所有会话
export const getSessions = (): SSHConfig[] => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  return sessionStore.get('sessions', [])
}

// 保存会话
export const saveSession = (session: SSHConfig): void => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  const sessions = getSessions()
  const existingIndex = sessions.findIndex(s => s.id === session.id)

  if (existingIndex >= 0) {
    sessions[existingIndex] = session
  } else {
    sessions.push(session)
  }

  sessionStore.set('sessions', sessions)
}

// 删除会话
export const deleteSession = (sessionId: string): void => {
  if (!sessionStore) {
    throw new Error('Session store not initialized')
  }
  const sessions = getSessions().filter(s => s.id !== sessionId)
  sessionStore.set('sessions', sessions)

  // 关闭SSH连接如果存在
  const ssh = sshConnections.get(sessionId)
  if (ssh) {
    ssh.dispose()
    sshConnections.delete(sessionId)
  }
}

// 创建SSH连接
export const connectSSH = async (config: SSHConfig): Promise<{ success: boolean; error?: string }> => {
  try {
    const ssh = new SSH2Wrapper()

    await ssh.connect(config)

    sshConnections.set(config.id, ssh)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown connection error'
    }
  }
}

// 断开SSH连接
export const disconnectSSH = (sessionId: string): void => {
  const ssh = sshConnections.get(sessionId)
  if (ssh) {
    ssh.dispose()
    sshConnections.delete(sessionId)
  }
}

// 执行SSH命令
export const executeSSHCommand = async (sessionId: string, command: string): Promise<{ stdout: string; stderr: string }> => {
  const ssh = sshConnections.get(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }

  // 对于包含路径的命令，尝试解析其中的 ~ 符号
  let resolvedCommand = command
  if (command.includes('~')) {
    try {
      // 获取家目录路径
      const homeResult = await ssh.execCommand('echo ~')
      if (homeResult.stdout && !homeResult.stderr) {
        const homePath = homeResult.stdout.trim()
        // 替换命令中的 ~ 为实际家目录路径
        resolvedCommand = command.replace(/~/g, homePath)
      }
    } catch (error) {
      // 如果解析失败，使用原始命令
      console.warn('Failed to resolve ~ in command, using original command:', error)
    }
  }

  return await ssh.execCommand(resolvedCommand)
}

// 获取目录文件列表
export const getDirectoryFiles = async (sessionId: string, path: string): Promise<FileInfo[]> => {
  const ssh = sshConnections.get(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }

  // 处理路径中的 ~ 符号
  let actualPath = path

  if (path.includes('~')) {
    // 使用辅助函数解析 ~ 符号
    actualPath = await resolveTildePath(ssh, path)
  } else if (path === '' || !path) {
    // 如果路径为空，获取当前工作目录
    try {
      const pwdResult = await ssh.execCommand('pwd')
      if (pwdResult.stdout && !pwdResult.stderr) {
        actualPath = pwdResult.stdout.trim()
      } else {
        throw new Error('Failed to get current directory')
      }
    } catch (error) {
      // 使用默认路径作为备用
      actualPath = '/tmp'
    }
  }

  const result = await ssh.execCommand(`ls -la "${actualPath}"`)
  if (result.stderr) {
    throw new Error(result.stderr)
  }

  return parseFileList(result.stdout, actualPath)
}

// 解析ls -la输出
const parseFileList = (output: string, basePath?: string): FileInfo[] => {
  const lines = output.split('\n').filter(line => line.trim())
  const files: FileInfo[] = []

  for (const line of lines.slice(1)) { // 跳过第一行总计信息
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 9) {
      const permissions = parts[0]
      const size = parseInt(parts[4]) || 0
      const name = parts.slice(8).join(' ')

      if (name !== '.' && name !== '..') {
        // 构建完整路径
        const fullPath = basePath ? `${basePath}/${name}` : name

        files.push({
          name,
          type: permissions.startsWith('d') ? 'directory' : 'file',
          size,
          permissions,
          modified: new Date(), // 这里可以解析日期
          path: fullPath
        })
      }
    }
  }

  return files
}