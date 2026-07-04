import { BOT_NAME } from '../config/bot-persona'
import { WebhookEvent } from '@line/bot-sdk'
import { userRepository } from '../repositories/user.repository'
import { taskRepository } from '../repositories/task.repository'
import { geminiService } from './gemini.service'
import { lineService } from './line.service'
import { taskService, RECENT_STATUS_LIMIT } from './task.service'
import { registrationService } from './registration.service'
import { cancelService } from './cancel.service'
import type { ParsedIntent } from '../types'
import { parseRescheduleFromText } from '../utils/datetime.parser'

const HELP_MESSAGE = `💁‍♀️ ${BOT_NAME} - เลขาส่วนตัวของคุณ

ส่งหรือ Forward ข้อความงานมาได้เลย ดิฉันจัดการให้ทั้งหมดค่ะ

📌 คำสั่งที่ใช้ได้:
• ส่งข้อความงาน → สร้าง Task อัตโนมัติ
• "วันนี้มีงานอะไร" → ดูงานวันนี้
• "งานอะไรบ้าง" → ดูงานค้าง (ยังไม่เสร็จ)
• "ดูงานที่เสร็จ" → งานเสร็จ 5 รายการล่าสุด
• "ดูงานที่ยกเลิก" → งานยกเลิก 5 รายการล่าสุด
• "งานนี้เสร็จแล้ว" → ทำเครื่องหมายเสร็จ
• "เลื่อนไปพรุ่งนี้" → เลื่อน Deadline
• "เตือนอีก 30 นาที" → ตั้งเตือน
• "แจ้งเตือนทำงานเวลา 21:00 วันนี้" → ตั้งเตือนตามวันเวลา
• ส่งหลายบรรทัด (ชื่องาน + รายละเอียด) → รายละเอียดจะตามไปในแจ้งเตือน
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
        const scope = intent.listScope ?? 'pending'

        if (scope === 'today') {
          const tasks = await taskRepository.listToday(userId)
          return taskService.formatTaskList(tasks, lineUserId)
        }
        if (scope === 'cancelled') {
          const tasks = await taskRepository.listByStatus(userId, 'cancelled', RECENT_STATUS_LIMIT)
          return taskService.formatStatusList(tasks, lineUserId, 'cancelled')
        }
        if (scope === 'completed') {
          const tasks = await taskRepository.listByStatus(userId, 'completed', RECENT_STATUS_LIMIT)
          return taskService.formatStatusList(tasks, lineUserId, 'completed')
        }
        const tasks = await taskRepository.listPending(userId)
        return taskService.formatPendingList(tasks, lineUserId)
      }

      case 'complete_task':
        return taskService.completeTask(userId, intent.taskTitle)

      case 'reschedule_task': {
        let newDeadline = intent.newDeadline
        let taskTitle = intent.taskTitle

        if (!newDeadline) {
          const parsed = parseRescheduleFromText(originalMessage)
          if (parsed) {
            newDeadline = parsed.newDeadline
            if (!taskTitle?.trim()) taskTitle = parsed.taskTitle
          }
        }

        if (!newDeadline) {
          return '❌ ไม่เข้าใจวันเวลาที่จะเลื่อนค่ะ ลองพิมพ์ เช่น "เลื่อนงาน...เป็น 18:00 วันนี้"'
        }

        return taskService.rescheduleTask(userId, taskTitle, newDeadline)
      }

      case 'set_reminder':
        return taskService.setReminder(userId, intent.taskTitle, {
          minutes: intent.reminderMinutes,
          remindAt: intent.remindAt,
          sourceMessage: originalMessage,
          description: intent.description,
          checklist: intent.checklist,
        })

      case 'help':
        return HELP_MESSAGE

      default:
        return intent.responseMessage ?? 'ขออภัยค่ะ ดิฉันไม่เข้าใจข้อความ ลองพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้นะคะ'
    }
  }
}

export const conversationService = new ConversationService()
