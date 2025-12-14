import { SSHConfig } from '@shared/models'
import { EventEmitter } from 'events'
import * as fs from 'fs'
import { Channel, Client, ConnectConfig } from 'ssh2'

/**
 * SSH2 连接包装器，提供与 NodeSSH 类似的 API
 */
export class SSH2Wrapper extends EventEmitter {
  private client: Client
  private connected: boolean = false
  private shell: Channel | null = null

  constructor() {
    super()
    this.client = new Client()
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
          // 指定支持的算法，提高兼容性
          kex: [
            'diffie-hellman-group-exchange-sha256',
            'diffie-hellman-group14-sha256',
            'diffie-hellman-group-exchange-sha1',
            'diffie-hellman-group14-sha1',
            'diffie-hellman-group1-sha1'
          ]
        }
      }

      // 处理认证方式
      if (config.password) {
        connectConfig.password = config.password
      }

      if (config.privateKey) {
        try {
          // 如果是文件路径，读取文件内容
          if (fs.existsSync(config.privateKey)) {
            connectConfig.privateKey = fs.readFileSync(config.privateKey)
          } else {
            // 直接使用私钥内容
            connectConfig.privateKey = config.privateKey
          }

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
   * 关闭连接
   */
  dispose(): void {
    if (this.client) {
      this.connected = false
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

    return new Promise((resolve, reject) => {
      this.client.shell(
        {
          term: 'xterm-256color',
          cols: 80,
          rows: 24,
          width: 640,
          height: 480
        },
        (err, stream) => {
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
            this.emit('close')
          })

          stream.on('error', (error: Error) => {
            this.emit('error', error)
          })

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
   * 关闭Shell
   */
  closeShell(): void {
    if (this.shell) {
      this.shell.end()
      this.shell = null
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
