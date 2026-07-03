import { SSHConfig } from '@shared/models'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import {
  Channel,
  Client,
  ConnectConfig,
  type AlgorithmList,
  type KexAlgorithm,
  type ServerHostKeyAlgorithm
} from 'ssh2'

/**
 * SSH2 连接包装器，提供与 NodeSSH 类似的 API
 */
export class SSH2Wrapper extends EventEmitter {
  private client: Client
  private connected: boolean = false
  private shell: Channel | null = null
  private shellPid: number | null = null

  constructor() {
    super()
    this.client = new Client()
  }

  /**
   * 获取 PTY Shell 进程的 PID
   * 用于通过 /proc/PID/cwd 追踪终端的工作目录
   */
  getShellPid(): number | null {
    return this.shellPid
  }

  /**
   * 连接到SSH服务器
   */
  async connect(config: SSHConfig): Promise<void> {
    // 如果已经连接，先断开
    if (this.connected) {
      this.dispose()
    }

    return new Promise((resolve, reject) => {
      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port,
        username: config.username,
        readyTimeout: 180000, // 3分钟 = 180秒
        keepaliveInterval: 30000,
        keepaliveCountMax: 3, // 允许3次心跳失败
        algorithms: {
          // 使用 append 模式：继承 ssh2 默认的现代算法
          // 同时追加老旧算法作为降级兼容
          // 注意：需 as 断言，因 @types/ssh2 的 Record 类型要求所有键存在，
          // 但 ssh2 运行时仅按实际键处理
          kex: {
            append: [
              'diffie-hellman-group-exchange-sha1',
              'diffie-hellman-group14-sha1',
              'diffie-hellman-group1-sha1'
            ]
          } as AlgorithmList<KexAlgorithm>,
          // 追加 DSA 主机密钥支持，兼容老旧嵌入式系统
          serverHostKey: {
            append: ['ssh-dss']
          } as AlgorithmList<ServerHostKeyAlgorithm>
        }
      }

      // 处理认证方式
      if (config.authMethod === 'password' && config.password) {
        connectConfig.password = config.password
      }

      if (config.authMethod === 'key' && config.privateKey) {
        try {
          let keyContent: string | Buffer
          if (config.privateKeySource === 'path') {
            // 显式文件路径：以 Buffer 读取，与原始行为一致
            keyContent = fs.readFileSync(config.privateKey)
          } else if (config.privateKeySource === 'content') {
            // 显式密钥内容：规范化换行符并清理首尾空白
            keyContent = config.privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
            // 确保 PEM 格式以换行结尾
            if (!keyContent.endsWith('\n')) {
              keyContent += '\n'
            }
          } else {
            // privateKeySource 缺失（旧数据兜底）：保留 fs.existsSync 试探
            if (fs.existsSync(config.privateKey)) {
              keyContent = fs.readFileSync(config.privateKey)
            } else {
              keyContent = config.privateKey.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
              if (!keyContent.endsWith('\n')) {
                keyContent += '\n'
              }
            }
          }

          connectConfig.privateKey = keyContent

          if (config.passphrase) {
            connectConfig.passphrase = config.passphrase
          }
        } catch (error) {
          reject(new Error(`Failed to read private key: ${error}`))
          return
        }
      }

      // 设置连接超时为3分钟
      const connectionTimeout = setTimeout(() => {
        this.connected = false
        this.client.end()
        reject(new Error('Connection timeout after 3 minutes'))
      }, 180000) // 3分钟 = 180,000毫秒

      this.client.on('ready', () => {
        clearTimeout(connectionTimeout)
        this.connected = true
        resolve()
      })

      this.client.on('error', (err) => {
        clearTimeout(connectionTimeout)
        this.connected = false
        reject(err)
      })

      this.client.on('close', () => {
        clearTimeout(connectionTimeout)
        this.connected = false
      })

      this.client.connect(connectConfig)
    })
  }

  /**
   * 执行SSH命令
   */
  async execCommand(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    if (!this.connected) {
      throw new Error('SSH connection not established')
    }

    return new Promise((resolve, reject) => {
      // 设置超时
      const timeout = setTimeout(() => {
        reject(new Error('Command execution timeout'))
      }, 180000) // 3分钟超时

      this.client.exec(command, (err, stream) => {
        if (err) {
          clearTimeout(timeout)
          reject(err)
          return
        }

        let stdout = ''
        let stderr = ''
        const exitCode = 0

        stream
          .on('close', (code: number) => {
            clearTimeout(timeout)
            resolve({ stdout, stderr, code: code ?? exitCode })
          })
          .on('data', (data: Buffer) => {
            stdout += data.toString()
          })
          .stderr.on('data', (data: Buffer) => {
            stderr += data.toString()
          })
          .on('error', (error: Error) => {
            clearTimeout(timeout)
            reject(error)
          })
      })
    })
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * 关闭连接，彻底清理所有监听器
   */
  dispose(): void {
    // 先关闭交互式 Shell channel
    this.closeShell()
    // 移除 SSH2Wrapper 自身的所有 EventEmitter 监听器
    this.removeAllListeners()
    if (this.client) {
      this.connected = false
      // 移除 ssh2 Client 上的所有监听器
      this.client.removeAllListeners()
      this.client.end()
    }
  }

  /**
   * 获取SFTP连接
   */
  async getSftp(): Promise<any> {
    if (!this.connected) {
      throw new Error('SSH connection not established')
    }

    return new Promise((resolve, reject) => {
      this.client.sftp((err, sftp) => {
        if (err) {
          reject(err)
        } else {
          resolve(sftp)
        }
      })
    })
  }

  /**
   * 创建交互式Shell
   */
  async createShell(): Promise<void> {
    if (!this.connected) {
      throw new Error('SSH connection not established')
    }

    // 在创建 PTY shell 之前，记录当前用户的 shell 进程快照
    const beforePids = await this.getShellProcessPids()

    return new Promise((resolve, reject) => {
      this.client.shell(
        {
          term: 'xterm-256color',
          cols: 80,
          rows: 24,
          width: 640,
          height: 480
        },
        async (err, stream) => {
          if (err) {
            reject(err)
            return
          }

          this.shell = stream

          // 转发shell数据
          stream.on('data', (data: Buffer) => {
            this.emit('data', data.toString())
          })

          stream.on('close', () => {
            this.shell = null
            this.shellPid = null
            this.emit('close')
          })

          stream.on('error', (error: Error) => {
            this.emit('error', error)
          })

          try {
            // 通过 execCommand 对比前后进程快照，静默获取 PTY Shell PID
            await this.captureShellPidViaExec(beforePids)
          } catch (e) {
            console.warn('[SSH2Wrapper] 捕获 Shell PID 失败:', e)
          }

          resolve()
        }
      )
    })
  }

  /**
   * 向Shell写入数据
   */
  writeToShell(data: string): boolean {
    if (!this.shell) {
      throw new Error('Shell not created')
    }
    return this.shell.write(data)
  }

  /**
   * 调整终端尺寸
   */
  resizeShell(cols: number, rows: number): void {
    if (this.shell && this.shell.setWindow) {
      this.shell.setWindow(rows, cols, 0, 0)
    }
  }

  /**
   * 获取当前用户的所有 shell 进程 PID 集合
   * 通过 execCommand 在后端静默执行，不在终端显示任何内容
   */
  private async getShellProcessPids(): Promise<Set<number>> {
    try {
      const userResult = await this.execCommand('whoami')
      const user = userResult.stdout.trim()
      if (!user) return new Set()

      // 匹配 bash/sh/zsh/fish，兼容 login shell 的 - 前缀（如 -bash）
      const result = await this.execCommand(
        `ps -u ${user} -o pid,comm --no-headers 2>/dev/null | awk '$2 ~ /^-?(bash|sh|zsh|fish)$/ {print $1}'`
      )
      if (result.code !== 0) return new Set()

      return new Set(result.stdout.trim().split('\n').filter(Boolean).map(Number))
    } catch {
      return new Set()
    }
  }

  /**
   * 通过 execCommand 静默捕获 PTY Shell 进程 PID
   * 对比 shell 创建前后的进程快照，新增的 shell 进程即为 PTY shell。
   * 完全在后端执行，终端用户不可见。
   */
  private async captureShellPidViaExec(beforePids: Set<number>): Promise<void> {
    // 短暂等待确保 PTY shell 进程完全启动
    await new Promise((r) => setTimeout(r, 300))

    // 获取创建后的 shell 进程快照
    const afterPids = await this.getShellProcessPids()

    // 找出新增的 PID
    const newPid = [...afterPids].find((p) => !beforePids.has(p))

    if (newPid) {
      this.shellPid = newPid
    } else if (afterPids.size > 0) {
      // 回退：取最高 PID（最新的进程）
      this.shellPid = Math.max(...afterPids)
    } else {
      console.warn('[SSH2Wrapper] 未能通过进程快照对比找到 Shell PID')
    }
  }

  /**
   * 关闭Shell，清理 stream 监听器
   */
  closeShell(): void {
    if (this.shell) {
      this.shell.removeAllListeners()
      this.shell.end()
      this.shell = null
      this.shellPid = null
    }
  }

  /**
   * 测试连接状态 - 执行简单的echo命令
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.execCommand('echo "connection-test"')
      return result.stdout.trim() === 'connection-test'
    } catch (error) {
      console.warn('SSH连接测试失败:', error)
      return false
    }
  }
}
