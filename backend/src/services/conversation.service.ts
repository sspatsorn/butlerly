import { BOT_NAME } from '../config/bot-persona'
import { WebhookEvent } from '@line/bot-sdk'
import { userRepository } from '../repositories/user.repository'
import { taskRepository } from '../repositories/task.repository'
import { geminiService } from './gemini.service'
import { lineService } from './line.service'
import { taskService } from './task.service'
import { registrationService } from './registration.service'
import { cancelService } from './cancel.service'
import type { ParsedIntent } from '../types'

const HELP_MESSAGE = `💁‍♀️ ${BOT_NAME} - เลขาส่วนตัวของคุณ

ส่งหรือ Forward ข้อความงานมาได้เลย ดิฉันจัดการให้ทั้งหมดค่ะ

📌 คำสั่งที่ใช้ได้:
• ส่งข้อความงาน → สร้าง Task อัตโนมัติ
• "วันนี้มีงานอะไร" → ดูงานวันนี้
• "งานอะไรบ้าง" → ดูงานทั้งหมด (เสร็จ + ยังไม่เสร็จ)
• "งานนี้เสร็จแล้ว" → ทำเครื่องหมายเสร็จ
• "เลื่อนไปพรุ่งนี้" → เลื่อน Deadline
• "เตือนอีก 30 นาที" → ตั้งเตือน
• "ยกเลิก" → ยกเลิกงาน (เลือกจากหมายเลข)
• "สมัคร" → สมัครสมาชิก`

export class ConversationService {
  async handleEvent(event: WebhookEvent): Promise<void> {
    if (event.type === 'follow') {
      const lineUserId = lineService.extractUserId(event)
      if (!lineUserId || !event.replyToken) return
      await registrationService.handleFollow(lineUserId, event.replyToken)
      return
    }

    if (event.type !== 'message') return

    const lineUserId = lineService.extractUserId(event)
    const text = lineService.extractText(event)
    if (!lineUserId || !text || !event.replyToken) return

    const response = await this.handleMessage(lineUserId, text)
    await lineService.reply(event.replyToken, response)
  }

  private async handleMessage(lineUserId: string, text: string): Promise<string> {
    if (registrationService.isRegisterCommand(text)) {
      return registrationService.handleRegisterCommand(lineUserId)
    }

    let user = await userRepository.findByLineUserId(lineUserId)

    if (user?.registration_step) {
      const registrationResponse = await registrationService.handleRegistrationInput(lineUserId, text, user)
      if (registrationResponse) return registrationResponse
    }

    if (!user?.is_registered) {
      return registrationService.getNotRegisteredMessage(lineUserId)
    }

    if (user.session_step === 'awaiting_cancel_selection') {
      const cancelResponse = await cancelService.handleSessionInput(lineUserId, text, user)
      if (cancelResponse) return cancelResponse
    }

    if (cancelService.isCancelCommand(text)) {
      return cancelService.startCancelFlow(user.id, lineUserId)
    }

    const intent = await geminiService.parseIntent(text)
    return this.executeIntent(user.id, lineUserId, text, intent)
  }

  private async executeIntent(
    userId: string,
    lineUserId: string,
    originalMessage: string,
    intent: ParsedIntent,
  ): Promise<string> {
    switch (intent.intent) {
      case 'create_task': {
        const title = intent.taskTitle || originalMessage.slice(0, 100)
        const task = await taskService.createTask({
          userId,
          title,
          description: intent.description,
          deadline: intent.deadline,
          sourceMessage: originalMessage,
          checklist: intent.checklist,
        })
        return taskService.formatTaskCreated(task)
      }

      case 'list_tasks': {
        if (intent.listScope === 'all') {
          const tasks = await taskRepository.listAll(userId)
          return taskService.formatAllTasksList(tasks, lineUserId)
        }
        const tasks = await taskRepository.listToday(userId)
        return taskService.formatTaskList(tasks, lineUserId)
      }

      case 'complete_task':
        return taskService.completeTask(userId, intent.taskTitle)

      case 'reschedule_task': {
        if (!intent.newDeadline) {
          const tomorrow = new Date()
          tomorrow.setDate(tomorrow.getDate() + 1)
          tomorrow.setHours(9, 0, 0, 0)
          intent.newDeadline = tomorrow.toISOString()
        }
        return taskService.rescheduleTask(userId, intent.taskTitle, intent.newDeadline)
      }

      case 'set_reminder': {
        const minutes = intent.reminderMinutes ?? 30
        return taskService.setReminder(userId, intent.taskTitle, minutes, originalMessage)
      }

      case 'help':
        return HELP_MESSAGE

      default:
        return intent.responseMessage ?? 'ขออภัยค่ะ ดิฉันไม่เข้าใจข้อความ ลองพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้นะคะ'
    }
  }
}

export const conversationService = new ConversationService()
