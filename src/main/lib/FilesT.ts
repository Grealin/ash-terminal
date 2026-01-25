import { FileInfo } from '@shared/models'
import { execFile } from 'child_process'
import { app, dialog, shell, type OpenDialogOptions } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { resolveTildePath } from './PathUtilsT'
import { getSSH } from './SSHPoolT'

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

  const result = await ssh.execCommand(`ls -la "${actualPath}"`)
  if (result.stderr) {
    throw new Error(result.stderr)
  }
  return parseFileList(result.stdout, actualPath)
}

const parseFileList = (output: string, basePath?: string): FileInfo[] => {
  const lines = output.split('\n').filter((line) => line.trim())
  const files: FileInfo[] = []
  for (const line of lines.slice(1)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length >= 9) {
      const permissions = parts[0]
      const size = parseInt(parts[4]) || 0
      const name = parts.slice(8).join(' ')
      if (name !== '.' && name !== '..') {
        const fullPath = basePath ? `${basePath}/${name}` : name
        files.push({
          name,
          type: permissions.startsWith('d') ? 'directory' : 'file',
          size,
          permissions,
          modified: new Date(),
          path: fullPath
        })
      }
    }
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
