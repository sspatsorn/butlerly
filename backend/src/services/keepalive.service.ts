import { createServer, type Server } from 'http'
import type { Express } from 'express'
import cron from 'node-cron'
import { WebSocketServer, WebSocket } from 'ws'
import { env } from '../config/env'

const PING_INTERVAL_MS = 12 * 60 * 1000 // 12 นาที (Render sleep ~15 นาที)

export class KeepAliveService {
  private wss: WebSocketServer | null = null
  private readonly clients = new Set<WebSocket>()
  private frontendPingTimer: ReturnType<typeof setInterval> | null = null

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws/keepalive' })

    this.wss.on('connection', (ws, req) => {
      const origin = req.headers.origin
      if (origin && origin !== env.FRONTEND_URL && !origin.startsWith('http://localhost')) {
        ws.close(1008, 'Origin not allowed')
        return
      }

      this.clients.add(ws)
      ws.send(JSON.stringify({ type: 'connected', at: new Date().toISOString() }))

      ws.on('message', (raw) => {
        const text = raw.toString()
        if (text === 'ping') {
          ws.send('pong')
        }
      })

      ws.on('close', () => this.clients.delete(ws))
      ws.on('error', () => this.clients.delete(ws))
    })

    setInterval(() => {
      for (const ws of this.clients) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping()
        }
      }
    }, 30_000)

    this.startFrontendPing()
    console.log('🔌 WebSocket keep-alive: /ws/keepalive')
  }

  private startFrontendPing(): void {
    const ping = async () => {
      try {
        const res = await fetch(env.FRONTEND_URL, {
          method: 'GET',
          headers: { 'User-Agent': 'Butlerly-KeepAlive/1.0' },
        })
        console.log(`💓 Ping frontend: ${res.status}`)
      } catch (error) {
        console.warn('💓 Ping frontend failed:', error instanceof Error ? error.message : error)
      }
    }

    void ping()
    cron.schedule('*/12 * * * *', () => void ping())
    this.frontendPingTimer = setInterval(() => void ping(), PING_INTERVAL_MS)
  }

  stop(): void {
    if (this.frontendPingTimer) clearInterval(this.frontendPingTimer)
    for (const ws of this.clients) ws.close()
    this.clients.clear()
    this.wss?.close()
  }
}

export const keepAliveService = new KeepAliveService()

export function createHttpServer(app: Express): Server {
  return createServer(app)
}
