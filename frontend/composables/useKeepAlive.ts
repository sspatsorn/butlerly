function resolveWsBase(): string {
  if (process.env.NUXT_PUBLIC_WS_BASE) {
    return process.env.NUXT_PUBLIC_WS_BASE.replace(/\/$/, '')
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '')
  }
  if (process.env.NUXT_PUBLIC_API_BASE) {
    return process.env.NUXT_PUBLIC_API_BASE.replace(/^http/, 'ws').replace(/\/api$/, '')
  }
  return 'ws://localhost:3001'
}

export function useKeepAlive() {
  const config = useRuntimeConfig()
  const wsBase = config.public.wsBase as string
  const connected = ref(false)

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let selfPingTimer: ReturnType<typeof setInterval> | null = null

  function pingSelf() {
    fetch('/api/keepalive', { cache: 'no-store' }).catch(() => {})
  }

  function connect() {
    if (!import.meta.client) return

    const url = `${wsBase}/ws/keepalive`
    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
      ws?.send('ping')
    }

    ws.onmessage = () => {
      connected.value = true
    }

    ws.onclose = () => {
      connected.value = false
      reconnectTimer = setTimeout(connect, 5000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  function start() {
    if (!import.meta.client) return

    connect()
    pingSelf()

    pingTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send('ping')
      }
    }, 30_000)

    selfPingTimer = setInterval(pingSelf, 12 * 60 * 1000)
  }

  function stop() {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (pingTimer) clearInterval(pingTimer)
    if (selfPingTimer) clearInterval(selfPingTimer)
    ws?.close()
    ws = null
  }

  return { connected, start, stop }
}
