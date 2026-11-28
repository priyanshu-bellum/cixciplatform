import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

type SocketMessage =
  | { type: 'notification'; payload: Record<string, unknown> }
  | { type: 'import_alert'; payload: Record<string, unknown> }
  | { type: 'unread_count'; count: number }

const WS_RECONNECT_DELAYS = [1000, 2000, 5000, 10000, 30000]

export function useNotificationSocket() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const wsRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const connect = useCallback(() => {
    if (!user) return

    const accessToken = localStorage.getItem('access_token')
    if (!accessToken) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = '8000'
    const url = `${protocol}//${host}:${port}/ws/notifications/?token=${accessToken}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const msg: SocketMessage = JSON.parse(event.data)
          switch (msg.type) {
            case 'unread_count':
              queryClient.setQueryData(['notifications-unread-count'], { unread_count: msg.count })
              break
            case 'notification':
              queryClient.invalidateQueries({ queryKey: ['notifications-recent'] })
              queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
              break
            case 'import_alert':
              queryClient.invalidateQueries({ queryKey: ['import-alerts'] })
              queryClient.invalidateQueries({ queryKey: ['import-alerts-count'] })
              break
          }
        } catch { /* ignored on purpose */ }
      }

      ws.onclose = (e) => {
        wsRef.current = null
        if (e.code === 4001) return
        const delay = WS_RECONNECT_DELAYS[Math.min(retryRef.current, WS_RECONNECT_DELAYS.length - 1)]
        retryRef.current++
        timerRef.current = setTimeout(connect, delay)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch { /* ignored on purpose */ }
  }, [user, queryClient])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(timerRef.current)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connect])

  const sendMessage = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data))
    }
  }, [])

  return { sendMessage }
}
