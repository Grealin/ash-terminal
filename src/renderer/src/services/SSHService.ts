import { FileInfo, SSHConfig } from '@shared/models';

export class SSHService {
  static async getSessions(): Promise<SSHConfig[]> {
    return window.ssh.getSessions()
  }

  static async saveSession(session: SSHConfig): Promise<void> {
    return window.ssh.saveSession(session)
  }

  static async deleteSession(sessionId: string): Promise<void> {
    return window.ssh.deleteSession(sessionId)
  }

  static async connectSSH(config: SSHConfig): Promise<{ success: boolean; error?: string }> {
    return window.ssh.connectSSH(config)
  }

  static async disconnectSSH(sessionId: string): Promise<void> {
    return window.ssh.disconnectSSH(sessionId)
  }

  static async executeCommand(
    sessionId: string,
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    return window.ssh.executeSSHCommand(sessionId, command)
  }

  static async getDirectoryFiles(sessionId: string, path: string): Promise<FileInfo[]> {
    return window.ssh.getDirectoryFiles(sessionId, path)
  }

  // 文件操作
  static async downloadFile(sessionId: string, remotePath: string): Promise<string> {
    return window.ssh.downloadFile(sessionId, remotePath)
  }

  static async deleteRemoteFile(sessionId: string, remotePath: string): Promise<void> {
    return window.ssh.deleteRemoteFile(sessionId, remotePath)
  }

  static async uploadFile(
    sessionId: string,
    localPath: string,
    remoteDir: string
  ): Promise<string> {
    return window.ssh.uploadFile(sessionId, localPath, remoteDir)
  }

  static async downloadFileToEditCache(sessionId: string, remotePath: string): Promise<string> {
    return window.ssh.downloadFileToEditCache(sessionId, remotePath)
  }

  static async backupRemoteFile(sessionId: string, remotePath: string): Promise<void> {
    return window.ssh.backupRemoteFile(sessionId, remotePath)
  }

  // 交互式Shell方法
  static async createInteractiveShell(sessionId: string): Promise<void> {
    return window.ssh.createInteractiveShell(sessionId)
  }

  static async writeToShell(sessionId: string, data: string): Promise<void> {
    return window.ssh.writeToShell(sessionId, data)
  }

  static async resizeShell(sessionId: string, cols: number, rows: number): Promise<void> {
    return window.ssh.resizeShell(sessionId, cols, rows)
  }

  static onShellData(sessionId: string, callback: (data: string) => void): () => void {
    return window.ssh.onShellData(sessionId, callback)
  }

  static onShellClose(sessionId: string, callback: () => void): () => void {
    return window.ssh.onShellClose(sessionId, callback)
  }

  static onShellError(sessionId: string, callback: (error: string) => void): () => void {
    return window.ssh.onShellError(sessionId, callback)
  }
}
