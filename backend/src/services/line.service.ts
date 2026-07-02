import { Client, middleware, WebhookEvent, TextMessage, MessageAPIResponseBase } from '@line/bot-sdk'
import type { RequestHandler } from 'express'
import { env } from '../config/env'

export const lineClient = new Client({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: env.LINE_CHANNEL_SECRET,
})

export const lineMiddleware: RequestHandler = middleware({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: env.LINE_CHANNEL_SECRET,
})

export class LineService {
  async reply(replyToken: string, text: string): Promise<MessageAPIResponseBase> {
    const message: TextMessage = { type: 'text', text }
    return lineClient.replyMessage(replyToken, message)
  }

  async push(lineUserId: string, text: string): Promise<MessageAPIResponseBase> {
    const message: TextMessage = { type: 'text', text }
    return lineClient.pushMessage(lineUserId, message)
  }

  extractText(event: WebhookEvent): string | null {
    if (event.type !== 'message' || event.message.type !== 'text') return null
    return event.message.text
  }

  extractUserId(event: WebhookEvent): string | null {
    if (event.source.type === 'user') return event.source.userId
    return null
  }
}

export const lineService = new LineService()
