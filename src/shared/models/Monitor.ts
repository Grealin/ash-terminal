// 系统监控信息
export interface SystemMonitorInfo {
  // 系统当前时间
  currentTime: string
  // 系统已运行时间
  uptime: string
  // CPU占用百分比（1 - 空闲CPU百分比）
  cpuUsage: number
  // 物理内存总量（KB）
  totalMemory: number
  // 空闲内存（KB）
  freeMemory: number
  // 已使用内存（KB）
  usedMemory: number
}

// 进程信息
export interface ProcessInfo {
  // 进程ID
  pid: number
  // 用户
  user: string
  // CPU占用百分比
  cpuPercent: number
  // 内存占用百分比
  memPercent: number
  // 命令/进程名
  command: string
}

// 进程状态信息
export interface ProcessStats {
  // 总进程数
  total: number
  // 正在运行的进程数
  running: number
  // 停止的进程数
  stopped: number
  // 僵尸进程数
  zombie: number
}

// 系统监控完整信息
export interface SystemMonitorData {
  systemInfo: SystemMonitorInfo
  processStats: ProcessStats
  topProcesses: ProcessInfo[]
}
