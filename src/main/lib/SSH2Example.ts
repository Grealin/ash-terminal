import { SSH2Wrapper } from '@/lib/SSH2Wrapper'
import { SSHConfig } from '@shared/models'

/**
 * SSH2Wrapper 使用示例和测试
 * 这个文件展示了如何使用重构后的SSH功能
 */

// 示例配置
const exampleConfig: SSHConfig = {
    id: 'example-session',
    name: 'Example Server',
    host: 'example.com',
    port: 22,
    username: 'user',
    password: 'password' // 或者使用 privateKey
}

/**
 * 测试SSH连接和命令执行
 */
export async function testSSHConnection(): Promise<void> {
    const ssh = new SSH2Wrapper()

    try {
        console.log('连接到SSH服务器...')
        await ssh.connect(exampleConfig)
        console.log('连接成功！')

        // 执行基本命令
        const whoami = await ssh.execCommand('whoami')
        console.log('当前用户:', whoami.stdout.trim())

        // 获取当前目录
        const pwd = await ssh.execCommand('pwd')
        console.log('当前目录:', pwd.stdout.trim())

        // 列出文件
        const ls = await ssh.execCommand('ls -la')
        console.log('文件列表:')
        console.log(ls.stdout)

    } catch (error) {
        console.error('SSH操作失败:', error)
    } finally {
        // 清理连接
        ssh.dispose()
        console.log('连接已关闭')
    }
}

/**
 * 重构总结:
 * 
 * 1. ✅ 创建了SSH2Wrapper类，封装ssh2模块的底层API
 * 2. ✅ 保持了与原NodeSSH相同的接口
 * 3. ✅ 更新了SessionManager.ts使用新的包装器
 * 4. ✅ 添加了更好的错误处理和超时机制
 * 5. ✅ 移除了对node-ssh的依赖
 * 
 * 优势:
 * - 更好的控制底层SSH连接
 * - 减少了依赖项
 * - 提供了与ssh2模块的直接接口
 * - 保持了现有API的兼容性
 */