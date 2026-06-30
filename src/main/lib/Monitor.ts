import { ProcessInfo, ProcessStats, SystemMonitorData, SystemMonitorInfo } from '@shared/models'
import { getSSH } from './SSHPool'
import { SSH2Wrapper } from './SSH2Wrapper'

/**
 * 目标系统的 top 命令类型
 * - gnu: procps-ng 等标准 Linux 发行版的 top
 * - busybox: BusyBox 嵌入式系统的 top（路由器/OpenWrt 等）
 * - unknown: 无法确定类型
 */
type TopType = 'gnu' | 'busybox' | 'unknown'

/** 缓存各 SSH 会话的 top 类型检测结果 */
const topTypeCache = new Map<string, TopType>()

/**
 * 检测目标系统的 top 命令类型
 * 通过执行 `top --version` 并根据输出判断：
 * - 包含 "BusyBox" → busybox
 * - 包含 "procps"  → gnu
 * - 其他 → unknown
 */
async function detectTopType(connection: SSH2Wrapper): Promise<TopType> {
  try {
    const result = await connection.execCommand('top --version 2>&1')
    const output = (result.stdout + result.stderr).toLowerCase()

    if (output.includes('busybox')) {
      return 'busybox'
    }
    if (output.includes('procps') || output.includes('procps-ng')) {
      return 'gnu'
    }
    return 'unknown'
  } catch {
    // 检测命令本身失败（超时等），标记为 unknown，后续使用最安全策略
    return 'unknown'
  }
}

/**
 * 获取指定会话的 top 类型，结果会被缓存（每个会话仅检测一次）
 */
async function getTopType(sessionId: string, connection: SSH2Wrapper): Promise<TopType> {
  const cached = topTypeCache.get(sessionId)
  if (cached !== undefined) {
    return cached
  }
  const type: TopType = await detectTopType(connection)
  topTypeCache.set(sessionId, type)
  return type
}

/**
 * 将 /proc/uptime 的秒数格式化为人类可读的 uptime 字符串
 * 输入示例: "12345.67 98765.43"
 * 输出示例: "3 hours, 25 min"
 */
function formatUptimeFromSeconds(uptimeRaw: string): string {
  const secondsStr: string = uptimeRaw.split(/\s+/)[0]
  if (!secondsStr) {
    return ''
  }
  const totalSeconds: number = Math.floor(parseFloat(secondsStr))
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    return ''
  }

  const days: number = Math.floor(totalSeconds / 86400)
  const hours: number = Math.floor((totalSeconds % 86400) / 3600)
  const minutes: number = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`)
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`)
  if (minutes > 0) parts.push(`${minutes} min`)
  if (parts.length === 0) parts.push(`${totalSeconds} sec`)

  return parts.join(', ')
}

/**
 * 解析 BusyBox top 命令的 batch 模式输出，提取系统监控信息
 *
 * BusyBox top（v1.37.0）batch 模式输出格式示例：
 *   Mem: 56644K used, 62864K free, 124K shrd, 8028K buff, 22180K cached
 *   CPU:   5% usr  10% sys   0% nic  75% idle   5% io   0% irq   2% sirq
 *   Load average: 0.20 0.18 0.12 1/87 31123
 *     PID  PPID USER     STAT   VSZ %VSZ CPU %CPU COMMAND
 *     1     0 root     S     1708   1%   0  0.0 /sbin/procd
 *
 * 与 GNU top 的关键差异：
 *   1. 无 "top -" 开头的摘要行 → 需要额外获取 currentTime 和 uptime
 *   2. 无 "Tasks:" 行 → processStats 置零
 *   3. 内存格式为 "Mem: XXXK used, YYYK free, ..." 而非 "MiB Mem : ..."
 *   4. CPU 格式为 "CPU: X% usr Y% sys ..." 而非 "%Cpu(s): ..."
 *   5. 进程列表列布局不同：PID PPID USER STAT VSZ %VSZ CPU %CPU COMMAND
 *
 * @param topOutput  BusyBox `top -b -n 1` 的标准输出
 * @param currentTime 从 `date` 命令获取的当前时间 (HH:MM:SS)
 * @param uptimeRaw 从 `/proc/uptime` 读取的原始秒数
 */
function parseBusyBoxTopOutput(
  topOutput: string,
  currentTime: string,
  uptimeRaw: string
): SystemMonitorData {
  const lines: string[] = topOutput.split('\n')

  const systemInfo: SystemMonitorInfo = {
    currentTime,
    uptime: formatUptimeFromSeconds(uptimeRaw),
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

  for (const rawLine of lines) {
    const line: string = rawLine.trim()
    if (!line) continue

    // 解析内存行：Mem: 56644K used, 62864K free, ...
    if (line.startsWith('Mem:')) {
      const usedMatch = line.match(/([\d.]+)K?\s+used/)
      const freeMatch = line.match(/([\d.]+)K?\s+free/)
      if (usedMatch) systemInfo.usedMemory = Math.round(parseFloat(usedMatch[1]))
      if (freeMatch) systemInfo.freeMemory = Math.round(parseFloat(freeMatch[1]))
      systemInfo.totalMemory = systemInfo.usedMemory + systemInfo.freeMemory
    }

    // 解析 CPU 行：CPU:   5% usr  10% sys   0% nic  75% idle ...
    if (line.startsWith('CPU:')) {
      // BusyBox 不同版本的 CPU 百分比格式略有差异（如 "5%" vs "0.0%"）
      const idleMatch = line.match(/([\d.]+)%\s+idle/)
      if (idleMatch) {
        const idlePercent: number = parseFloat(idleMatch[1])
        systemInfo.cpuUsage = parseFloat((100 - idlePercent).toFixed(1))
      }
    }

    // 解析 Load average 行，提取运行/总进程数
    // 格式: Load average: 0.20 0.18 0.12 1/87 31123
    // 其中 "1/87" 表示 1 个运行中进程，87 个总进程
    if (line.startsWith('Load average:')) {
      const procMatch = line.match(/(\d+)\/(\d+)\s+\d+/)
      if (procMatch) {
        processStats.running = parseInt(procMatch[1], 10)
        processStats.total = parseInt(procMatch[2], 10)
      }
    }

    // 解析进程表头行，识别列布局
    if (line.includes('PID') && line.includes('PPID') && line.includes('COMMAND')) {
      // BusyBox top 进程表头: PID PPID USER STAT VSZ %VSZ CPU %CPU COMMAND
      // 找到表头后，解析后续进程行
      for (let j = lines.indexOf(rawLine) + 1; j < lines.length && topProcesses.length < 5; j++) {
        const procLine: string = lines[j].trim()
        if (!procLine) continue

        const parts: string[] = procLine.split(/\s+/)
        // BusyBox 列: PID(0) PPID(1) USER(2) STAT(3) VSZ(4) %VSZ(5) CPU(6) %CPU(7) COMMAND(8+)
        if (parts.length >= 9) {
          const pid: number = parseInt(parts[0], 10)
          const user: string = parts[2]
          const cpuPercent: number = parseFloat(parts[7])
          // %VSZ 是驻留内存百分比（不是精确的 MEM%），在 BusyBox 中用它近似 memPercent
          const memPercent: number = parseFloat(parts[5])
          const command: string = parts.slice(8).join(' ')

          if (!isNaN(pid) && !isNaN(cpuPercent)) {
            topProcesses.push({
              pid,
              user,
              cpuPercent: isNaN(cpuPercent) ? 0 : cpuPercent,
              memPercent: isNaN(memPercent) ? 0 : memPercent,
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
 * 解析GNU top命令输出（procps-ng），提取系统监控信息
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
 * 使用 BusyBox top 获取系统监控数据
 * 组合执行三个命令后解析：
 *   1. `top -b -n 1 | head -n 30` — 获取系统状态和进程列表
 *   2. `date '+%H:%M:%S'` — 获取当前时间
 *   3. `cat /proc/uptime` — 获取系统运行时长（秒）
 */
async function getBusyBoxMonitorData(
  _sessionId: string,
  connection: SSH2Wrapper
): Promise<SystemMonitorData> {
  const command: string =
    'top -b -n 1 | head -n 30; echo "===MON_SPLIT==="; date \'+%H:%M:%S\'; echo "===MON_SPLIT==="; cat /proc/uptime 2>/dev/null || echo "0"'

  const result = await connection.execCommand(command)

  if (result.stderr && !result.stdout) {
    throw new Error(`Failed to get system monitor data: ${result.stderr}`)
  }

  const parts: string[] = result.stdout.split('===MON_SPLIT===')
  const topOutput: string = parts[0] ?? ''
  const currentTime: string = (parts[1] ?? '').trim()
  const uptimeRaw: string = (parts[2] ?? '').trim()

  return parseBusyBoxTopOutput(topOutput, currentTime, uptimeRaw)
}

/**
 * 获取系统监控数据
 *
 * 自动检测目标系统的 top 命令类型：
 * - GNU top（标准 Linux）：使用 `top -b -n 1 -o %CPU | head -n 20`
 * - BusyBox top（嵌入式/OpenWrt）：使用兼容命令组合获取数据
 *
 * 检测结果按 session 缓存，避免每次重复检测。
 */
export async function getSystemMonitorData(sessionId: string): Promise<SystemMonitorData> {
  const connection = getSSH(sessionId)
  if (!connection) {
    throw new Error('SSH connection not found')
  }

  try {
    const ttype: TopType = await getTopType(sessionId, connection)

    // BusyBox 系统：使用兼容命令和专门解析器
    if (ttype === 'busybox') {
      return await getBusyBoxMonitorData(sessionId, connection)
    }

    // GNU top 及 unknown 类型：使用标准命令
    // -b: batch mode
    // -n 1: 只迭代一次
    // -o %CPU: 按CPU使用率排序
    const command: string = 'top -b -n 1 -o %CPU | head -n 20'

    const result = await connection.execCommand(command)

    if (result.stderr && !result.stdout) {
      // 如果检测为 unknown 但执行失败，尝试 BusyBox 回退
      if (ttype === 'unknown') {
        return await getBusyBoxMonitorData(sessionId, connection)
      }
      throw new Error(`Failed to get system monitor data: ${result.stderr}`)
    }

    const monitorData: SystemMonitorData = parseTopOutput(result.stdout)
    return monitorData
  } catch (error) {
    // 如果主策略失败，尝试 BusyBox 回退（仅在未明确检测为 gnu 时）
    if (error instanceof Error && error.message.includes('unrecognized option')) {
      try {
        return await getBusyBoxMonitorData(sessionId, connection)
      } catch {
        throw error // 抛出原始错误
      }
    }
    throw new Error(`Failed to execute top command: ${error}`)
  }
}
