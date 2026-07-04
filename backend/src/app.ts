import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import webhookRoutes from './routes/webhook.routes'
import apiRoutes from './routes/api.routes'
import { reminderService } from './services/reminder.service'
import { keepAliveService, createHttpServer } from './services/keepalive.service'

export function createApp() {
  const app = express()

  app.use(cors({ origin: env.FRONTEND_URL }))

  // LINE webhook must receive raw body for signature validation
  app.use('/webhook', webhookRoutes)

  app.use(express.json())
  app.use('/api', apiRoutes)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'linetask-backend' })
  })

  return app
}

export function startServer() {
  const app = createApp()
  const port = env.PORT
  const host = env.HOST
  const server = createHttpServer(app)

  keepAliveService.attach(server)

  server.listen(port, host, () => {
    const publicUrl = process.env.RENDER_EXTERNAL_URL ?? `http://${env.PUBLIC_HOST}:${port}`
    console.log(`🚀 Server running on ${publicUrl}`)
    if (env.PUBLIC_HOST !== 'localhost' && !process.env.RENDER_EXTERNAL_URL) {
      console.log(`   (bound to ${host}:${port})`)
    }
    reminderService.start()
  })
}
