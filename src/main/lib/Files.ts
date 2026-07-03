import { FileInfo } from '@shared/models'
import { execFile } from 'child_process'
import { app, dialog, shell, type OpenDialogOptions } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { resolveTildePath } from './PathUtils'
import { getSSH } from './SSHPool'
import { getConfig } from './ConfigManager'

// 标记是否已打开过系统文件选择对话框（用于仅首次使用 home 目录）
let hasOpenedFileDialog = false

export const getDirectoryFiles = async (sessionId: string, p: string): Promise<FileInfo[]> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }

  let actualPath = p
  if (p && p.includes('~')) {
    actualPath = await resolveTildePath(ssh, p)
  } else if (p === '' || !p) {
    try {
      const pwdResult = await ssh.execCommand('pwd')
      if (pwdResult.stdout && !pwdResult.stderr) {
        actualPath = pwdResult.stdout.trim()
      } else {
        throw new Error('Failed to get current directory')
      }
    } catch {
      actualPath = '/tmp'
    }
  }

  const result = await ssh.execCommand(`LC_ALL=C ls -la "${actualPath}"`)
  if (result.stderr) {
    throw new Error(result.stderr)
  }
  return parseFileList(result.stdout, actualPath)
}

const parseFileList = (output: string, basePath?: string): FileInfo[] => {
  const lines = output.split('\n').filter((line) => line.trim())
  const files: FileInfo[] = []

  // 权限字段正则：匹配 ls -la 输出的权限列
  // 标准格式：[-dlcbps][-rwxsStT]{9}
  // 末尾可选后缀：
  //   . — SELinux 安全上下文 (CentOS/RHEL)
  //   + — POSIX ACL
  //   @ — macOS 扩展属性
  const permRegex = /^[-dlcbps][-rwxsStT]{9}[.+@]?$/

  // LC_ALL=C 保证输出永远是标准 9 字段格式：
  //   [0]权限 [1]链接数 [2]所有者 [3]组 [4]大小 [5]月 [6]日 [7]时间/年份 [8+]文件名
  // 若未设置 LC_ALL=C（或 C locale 不可用），则以下 locale 的字段数会变化：
  //   - 中文 zh_CN: "7月 1日" 占 2 字段，"1月26日" 占 1 字段
  //   - 日文 ja_JP: " 1月 26日" 占 2 字段
  //   - 其他非英语 locale: 各不相同的日期分隔方式

  for (const line of lines.slice(1)) {
    const parts: string[] = line.trim().split(/\s+/)

    if (parts.length < 9) continue
    if (!permRegex.test(parts[0])) continue

    const permissions: string = parts[0]
    const size: number = parseInt(parts[4], 10) || 0
    // 文件名从第 8 个字段开始（索引 8），以支持含空格的文件名/符号链接目标
    const name: string = parts.slice(8).join(' ')

    if (!name || name === '.' || name === '..') continue

    const fullPath: string = basePath ? `${basePath}/${name}` : name
    files.push({
      name,
      type: permissions.startsWith('d') ? 'directory' : 'file',
      size,
      permissions,
      modified: new Date(),
      path: fullPath
    })
  }

  return files
}

export const downloadFile = async (sessionId: string, remotePath: string): Promise<string> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  const sftp = await ssh.getSftp()
  const downloadsDir = app.getPath('downloads')
  const fileName = path.basename(remotePath)
  let targetPath = path.join(downloadsDir, fileName)

  if (fs.existsSync(targetPath)) {
    const ext = path.extname(fileName)
    const nameOnly = path.basename(fileName, ext)
    let i = 1
    while (fs.existsSync(targetPath)) {
      const nextName = ext ? `${nameOnly} (${i})${ext}` : `${nameOnly} (${i})`
      targetPath = path.join(downloadsDir, nextName)
      i += 1
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      sftp.fastGet(remotePath, targetPath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
    return targetPath
  } finally {
    sftp.end()
  }
}

export const deleteRemoteFile = async (sessionId: string, remotePath: string): Promise<void> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  const sftp = await ssh.getSftp()
  try {
    await new Promise<void>((resolve, reject) => {
      sftp.unlink(remotePath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
  } finally {
    sftp.end()
  }
}

export const uploadFile = async (
  sessionId: string,
  localPath: string,
  remoteDir: string
): Promise<string> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }

  const sftp = await ssh.getSftp()

  let actualRemoteDir = remoteDir
  if (remoteDir && remoteDir.includes('~')) {
    actualRemoteDir = await resolveTildePath(ssh, remoteDir)
  } else if (!remoteDir || remoteDir === '') {
    try {
      const pwdResult = await ssh.execCommand('pwd')
      if (pwdResult.stdout && !pwdResult.stderr) {
        actualRemoteDir = pwdResult.stdout.trim()
      } else {
        throw new Error('Failed to get current directory')
      }
    } catch {
      actualRemoteDir = '/tmp'
    }
  }

  const fileName = path.basename(localPath)
  const normalizedDir = actualRemoteDir.replace(/\/+$/, '')
  const remoteTargetPath = `${normalizedDir}/${fileName}`

  try {
    await new Promise<void>((resolve, reject) => {
      sftp.fastPut(localPath, remoteTargetPath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
    return remoteTargetPath
  } finally {
    sftp.end()
  }
}

export const getEditCacheDir = (): string => {
  const dir = path.join(app.getPath('userData'), 'EditCache')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

export const downloadFileToEditCache = async (
  sessionId: string,
  remotePath: string
): Promise<string> => {
  const ssh = getSSH(sessionId)
  if (!ssh) {
    throw new Error('SSH connection not found')
  }
  const sftp = await ssh.getSftp()
  const cacheDir = getEditCacheDir()
  const fileName = path.basename(remotePath)
  let targetPath = path.join(cacheDir, fileName)

  if (fs.existsSync(targetPath)) {
    const ext = path.extname(fileName)
    const nameOnly = path.basename(fileName, ext)
    let i = 1
    while (fs.existsSync(targetPath)) {
      const nextName = ext ? `${nameOnly} (${i})${ext}` : `${nameOnly} (${i})`
      targetPath = path.join(cacheDir, nextName)
      i += 1
    }
  }

  try {
    await new Promise<void>((resolve, reject) => {
      sftp.fastGet(remotePath, targetPath, (err: any) => {
        if (err) return reject(err)
        resolve()
      })
    })
    return targetPath
  } finally {
    sftp.end()
  }
}

export const deleteEditCacheFile = async (localPath: string): Promise<void> => {
  const cacheDir = getEditCacheDir()
  const normalized = path.normalize(localPath)
  const safeBase = path.normalize(cacheDir) + path.sep
  if (!normalized.startsWith(safeBase)) {
    throw new Error('Refuse to delete file outside EditCache')
  }
  if (fs.existsSync(normalized)) {
    const stat = fs.statSync(normalized)
    if (stat.isFile()) {
      fs.unlinkSync(normalized)
    } else if (stat.isDirectory()) {
      // 额外保护：仅在需要时允许删除空目录或本模块生成的子目录
      fs.rmSync(normalized, { recursive: true, force: true })
    }
  }
}

export const openWithChooser = async (localPath: string): Promise<void> => {
  // Windows：调用系统“打开方式”对话框；其它平台回退为默认程序打开
  if (process.platform === 'win32') {
    await new Promise<void>((resolve, reject) => {
      execFile('rundll32.exe', ['shell32.dll,OpenAs_RunDLL', localPath], (error) => {
        if (error) return reject(error)
        resolve()
      })
    })
    return
  }
  await shell.openPath(localPath)
}

export const backupRemoteFile = async (sessionId: string, remotePath: string): Promise<void> => {
  const config = getConfig()
  if (!config.file.backupOnManualEdit) return

  const ssh = getSSH(sessionId)
  if (!ssh) throw new Error('SSH connection not found')
  const target = `${remotePath}.old`
  const cmd = `mv "${remotePath}" "${target}"`
  const result = await ssh.execCommand(cmd)
  if (result.stderr) {
    throw new Error(result.stderr)
  }
}

export const openFileDialog = async (): Promise<string[]> => {
  const options: OpenDialogOptions = {
    title: '选择上传文件',
    properties: ['openFile', 'multiSelections']
  }

  if (!hasOpenedFileDialog) {
    options.defaultPath = app.getPath('home')
  }

  const result = await dialog.showOpenDialog(options)
  hasOpenedFileDialog = true
  if (result.canceled) return []
  return result.filePaths
}
