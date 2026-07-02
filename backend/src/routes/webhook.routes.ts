import { Router, Request, Response } from 'express'
import { WebhookEvent } from '@line/bot-sdk'
import { lineMiddleware } from '../services/line.service'
import { conversationService } from '../services/conversation.service'

const router = Router()

router.post('/line', lineMiddleware, async (req: Request, res: Response) => {
  const events: WebhookEvent[] = req.body.events ?? []

  try {
    await Promise.all(events.map((event) => conversationService.handleEvent(event)))
    res.status(200).send('OK')
  } catch (error) {
    console.error('Webhook error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
