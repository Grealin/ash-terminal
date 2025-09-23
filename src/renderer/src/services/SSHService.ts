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

  static async executeCommand(sessionId: string, command: string): Promise<{ stdout: string; stderr: string }> {
    return window.ssh.executeSSHCommand(sessionId, command)
  }

  static async getDirectoryFiles(sessionId: string, path: string): Promise<FileInfo[]> {
    return window.ssh.getDirectoryFiles(sessionId, path)
  }
}