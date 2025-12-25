import { ProcessInfo, ProcessStats, SystemMonitorData, SystemMonitorInfo } from '@shared/models'
import { getSSH } from './SSHPool'

/**
 * 解析top命令输出，提取系统监控信息
 */
function parseTopOutput(output: string): SystemMonitorData {
  const lines = output.split('\n')

  // 初始化返回数据
  const systemInfo: SystemMonitorInfo = {
    currentTime: '',
    uptime: '',
    cpuUsage: 0,
    totalMemory: 0,
    freeMemory: 0,
    usedMemory: 0
  }

  const processStats: ProcessStats = {
    total: 0,
    running: 0,
    stopped: 0,
    zombie: 0
  }

  const topProcesses: ProcessInfo[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // 解析第一行：top - 当前时间, 系统运行时间
    // 示例: top - 14:30:25 up 10 days, 3:25, 2 users, load average: 0.00, 0.01, 0.05
    if (line.startsWith('top -')) {
      const timeMatch = line.match(/top - (\d{2}:\d{2}:\d{2})/)
      if (timeMatch) {
        systemInfo.currentTime = timeMatch[1]
      }

      const uptimeMatch = line.match(/up\s+(.+?),\s+\d+\s+user/)
      if (uptimeMatch) {
        systemInfo.uptime = uptimeMatch[1].trim()
      }
    }

    // 解析任务/进程状态行
    // 示例: Tasks: 123 total, 1 running, 122 sleeping, 0 stopped, 0 zombie
    if (line.includes('Tasks:') || line.includes('进程:')) {
      const totalMatch = line.match(/(\d+)\s+total/)
      const runningMatch = line.match(/(\d+)\s+running/)
      const stoppedMatch = line.match(/(\d+)\s+stopped/)
      const zombieMatch = line.match(/(\d+)\s+zombie/)

      if (totalMatch) processStats.total = parseInt(totalMatch[1])
      if (runningMatch) processStats.running = parseInt(runningMatch[1])
      if (stoppedMatch) processStats.stopped = parseInt(stoppedMatch[1])
      if (zombieMatch) processStats.zombie = parseInt(zombieMatch[1])
    }

    // 解析CPU信息行
    // 示例: %Cpu(s): 0.3 us, 0.2 sy, 0.0 ni, 99.5 id, 0.0 wa, 0.0 hi, 0.0 si, 0.0 st
    if (line.includes('%Cpu') || line.includes('CPU')) {
      const idleMatch = line.match(/([\d.]+)\s+id/)
      if (idleMatch) {
        const idlePercent = parseFloat(idleMatch[1])
        systemInfo.cpuUsage = parseFloat((100 - idlePercent).toFixed(1))
      }
    }

    // 解析内存信息行
    // 示例: MiB Mem : 7822.3 total, 1234.5 free, 2345.6 used, 4242.2 buff/cache
    // 或: KiB Mem : 8009012 total, 1264532 free, 2401276 used, 4343204 buff/cache
    // 注意：要排除 Swap 行，它的格式是 "KiB Swap: ... avail Mem"
    if (
      (line.includes('KiB Mem') || line.includes('MiB Mem') || line.includes('GiB Mem')) &&
      !line.includes('Swap')
    ) {
      // 尝试匹配不同格式
      const memMatch = line.match(/([\d.]+)\s+total.*?([\d.]+)\s+free.*?([\d.]+)\s+used/)
      if (memMatch) {
        const total = parseFloat(memMatch[1])
        const free = parseFloat(memMatch[2])
        const used = parseFloat(memMatch[3])

        // 根据单位转换为KB
        if (line.includes('GiB') || line.includes('Gi')) {
          systemInfo.totalMemory = Math.round(total * 1024 * 1024)
          systemInfo.freeMemory = Math.round(free * 1024 * 1024)
          systemInfo.usedMemory = Math.round(used * 1024 * 1024)
        } else if (line.includes('MiB') || line.includes('Mi')) {
          systemInfo.totalMemory = Math.round(total * 1024)
          systemInfo.freeMemory = Math.round(free * 1024)
          systemInfo.usedMemory = Math.round(used * 1024)
        } else {
          // 默认KiB
          systemInfo.totalMemory = Math.round(total)
          systemInfo.freeMemory = Math.round(free)
          systemInfo.usedMemory = Math.round(used)
        }
      }
    }

    // 解析进程列表（从PID行开始）
    // 示例表头: PID USER PR NI VIRT RES SHR S %CPU %MEM TIME+ COMMAND
    if (line.includes('PID') && line.includes('USER') && line.includes('COMMAND')) {
      // 找到表头后，解析接下来的进程行
      for (let j = i + 1; j < lines.length && topProcesses.length < 5; j++) {
        const procLine = lines[j].trim()
        if (!procLine) continue

        // 使用正则表达式解析进程行
        // 处理可能的空格分隔
        const parts = procLine.split(/\s+/)
        if (parts.length >= 12) {
          const pid = parseInt(parts[0])
          const user = parts[1]
          const cpuPercent = parseFloat(parts[8])
          const memPercent = parseFloat(parts[9])
          const command = parts.slice(11).join(' ')

          if (!isNaN(pid) && !isNaN(cpuPercent)) {
            topProcesses.push({
              pid,
              user,
              cpuPercent,
              memPercent,
              command
            })
          }
        }
      }
      break
    }
  }

  return {
    systemInfo,
    processStats,
    topProcesses
  }
}

/**
 * 获取系统监控数据
 */
export async function getSystemMonitorData(sessionId: string): Promise<SystemMonitorData> {
  const connection = getSSH(sessionId)
  if (!connection) {
    throw new Error('SSH connection not found')
  }

  try {
    // 使用batch模式执行top命令，只获取一次快照，并显示前5个进程
    // -b: batch mode
    // -n 1: 只迭代一次
    // -o %CPU: 按CPU使用率排序
    const command = 'top -b -n 1 -o %CPU | head -n 20'

    const result = await connection.execCommand(command)

    if (result.stderr && !result.stdout) {
      throw new Error(`Failed to get system monitor data: ${result.stderr}`)
    }

    const monitorData = parseTopOutput(result.stdout)
    return monitorData
  } catch (error) {
    throw new Error(`Failed to execute top command: ${error}`)
  }
}
