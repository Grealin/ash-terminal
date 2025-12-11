import { SSHService } from '@/services'
import {
  batchCommandCurrentIndexAtom,
  batchCommandIntervalAtom,
  BatchCommandStatus,
  batchCommandStatusAtom,
  batchCommandTextAtom,
  currentSessionIdAtom
} from '@/store'
import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef } from 'react'

export const useBatchCommand = (): {
  commandText: string
  setCommandText: (text: string) => void
  interval: number
  setInterval: (interval: number) => void
  status: BatchCommandStatus
  currentIndex: number
  totalCommands: number
  start: () => void
  pause: () => void
  clear: () => void
  canStart: boolean
  canPause: boolean
  canClear: boolean
} => {
  const [commandText, setCommandText] = useAtom(batchCommandTextAtom)
  const [interval, setInterval] = useAtom(batchCommandIntervalAtom)
  const [status, setStatus] = useAtom(batchCommandStatusAtom)
  const [currentIndex, setCurrentIndex] = useAtom(batchCommandCurrentIndexAtom)
  const currentSessionId = useAtomValue(currentSessionIdAtom)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusRef = useRef<BatchCommandStatus>('idle')

  // 同步状态到ref，避免闭包问题
  useEffect(() => {
    statusRef.current = status
  }, [status])

  // 解析命令列表（按行分割，过滤空行）
  const getCommands = useCallback(() => {
    return commandText
      .split('\n')
      .map((cmd) => cmd.trim())
      .filter((cmd) => cmd.length > 0)
  }, [commandText])

  // 执行单条命令
  const executeCommand = useCallback(
    async (command: string) => {
      if (!currentSessionId) {
        console.error('No active session')
        return
      }

      try {
        // 使用writeToShell发送命令到终端
        await SSHService.writeToShell(currentSessionId, command + '\n')
      } catch (error) {
        console.error('Failed to execute command:', error)
      }
    },
    [currentSessionId]
  )

  // 执行批量命令的主逻辑
  const executeBatchCommands = useCallback(
    async (startIndex: number = 0) => {
      const commands = getCommands()

      if (commands.length === 0) {
        setStatus('idle')
        setCurrentIndex(0)
        return
      }

      if (startIndex >= commands.length) {
        // 所有命令执行完毕
        setStatus('idle')
        setCurrentIndex(0)
        return
      }

      // 执行当前命令
      await executeCommand(commands[startIndex])
      setCurrentIndex(startIndex + 1)

      // 如果还有下一条命令，设置定时器
      if (startIndex + 1 < commands.length) {
        timeoutRef.current = setTimeout(() => {
          // 检查状态是否仍为running
          if (statusRef.current === 'running') {
            executeBatchCommands(startIndex + 1)
          }
        }, interval * 1000)
      } else {
        // 执行完所有命令
        setStatus('idle')
        setCurrentIndex(0)
      }
    },
    [getCommands, executeCommand, interval, setStatus, setCurrentIndex]
  )

  // 开始执行
  const start = useCallback(() => {
    if (!currentSessionId) {
      console.error('No active SSH session')
      return
    }

    if (status === 'idle') {
      setStatus('running')
      setCurrentIndex(0)
      executeBatchCommands(0)
    } else if (status === 'paused') {
      // 从当前位置继续
      setStatus('running')
      executeBatchCommands(currentIndex)
    }
  }, [currentSessionId, status, currentIndex, setStatus, setCurrentIndex, executeBatchCommands])

  // 暂停执行
  const pause = useCallback(() => {
    if (status === 'running') {
      setStatus('paused')
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [status, setStatus])

  // 停止并清除
  const clear = useCallback(() => {
    setStatus('idle')
    setCurrentIndex(0)
    setCommandText('')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [setStatus, setCurrentIndex, setCommandText])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    commandText,
    setCommandText,
    interval,
    setInterval,
    status,
    currentIndex,
    totalCommands: getCommands().length,
    start,
    pause,
    clear,
    canStart: currentSessionId !== null && getCommands().length > 0,
    canPause: status === 'running',
    canClear: commandText.length > 0 || status !== 'idle'
  }
}
