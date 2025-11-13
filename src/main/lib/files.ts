import { FileInfo } from '@shared/models'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { resolveTildePath } from './pathUtils'
import { getSSH } from './sshPool'

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
    const lines = output.split('\n').filter(line => line.trim())
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

    await new Promise<void>((resolve, reject) => {
        sftp.fastGet(remotePath, targetPath, (err: any) => {
            if (err) return reject(err)
            resolve()
        })
    })

    return targetPath
}

export const deleteRemoteFile = async (sessionId: string, remotePath: string): Promise<void> => {
    const ssh = getSSH(sessionId)
    if (!ssh) {
        throw new Error('SSH connection not found')
    }
    const sftp = await ssh.getSftp()
    await new Promise<void>((resolve, reject) => {
        sftp.unlink(remotePath, (err: any) => {
            if (err) return reject(err)
            resolve()
        })
    })
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

    await new Promise<void>((resolve, reject) => {
        sftp.fastPut(localPath, remoteTargetPath, (err: any) => {
            if (err) return reject(err)
            resolve()
        })
    })

    return remoteTargetPath
}
