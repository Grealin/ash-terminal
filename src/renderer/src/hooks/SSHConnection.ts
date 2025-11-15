import { sshConnectionStatusAtom } from '@/services'
import { useAtom } from 'jotai'
import { useCallback } from 'react'

export const useSSHConnection = () => {
  const [connectionStatus, setConnectionStatus] = useAtom(sshConnectionStatusAtom)

  const setConnecting = useCallback(() => {
    setConnectionStatus('connecting')
  }, [setConnectionStatus])

  const setConnected = useCallback(() => {
    setConnectionStatus('connected')
  }, [setConnectionStatus])

  const setDisconnected = useCallback(() => {
    setConnectionStatus('disconnected')
  }, [setConnectionStatus])

  const isConnected = connectionStatus === 'connected'
  const isConnecting = connectionStatus === 'connecting'
  const isDisconnected = connectionStatus === 'disconnected'

  return {
    connectionStatus,
    setConnecting,
    setConnected,
    setDisconnected,
    isConnected,
    isConnecting,
    isDisconnected
  }
}
