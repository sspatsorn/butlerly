import type { ParsedIntent } from '../types'
import { isReminderLikeMessage, parseScheduleFromText } from '../utils/datetime.parser'

function tomorrowAt9am(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}

export function parseRuleBasedIntent(message: string): ParsedIntent | null {
  const text = message.trim()
  const lower = text.toLowerCase()

  if (/^(ช่วยเหลือ|help|\?)$/.test(lower)) {
    return { intent: 'help' }
  }

  if (/วันนี้มีงาน|งานวันนี้/.test(lower) && !/เสร็จ|ยกเลิก/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'today' }
  }

  if (/ดูงานที่ยกเลิก|งานที่ยกเลิก|รายการงานยกเลิก/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'cancelled' }
  }

  if (/ดูงานที่เสร็จ|รายการงานเสร็จ|งานเสร็จแล้วบ้าง|งานที่เสร็จแล้ว/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'completed' }
  }

  if (/งานอะไรบ้าง|งานทั้งหมด|รายการงาน|ดูงาน|มีงานบ้าง|มีงานอะไร/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'pending' }
  }

  // เสร็จแล้ว — ทำเครื่องหมายงาน (ไม่ใช่ดูรายการ)
  if (/^(งานนี้\s*)?(เสร็จแล้ว|ทำเสร็จ)\s*$/i.test(lower) || /^งานนี้เสร็จ/i.test(lower)) {
    const title = text
      .replace(/\s*(งานนี้\s*)?(เสร็จแล้ว|ทำเสร็จ|done)\s*$/i, '')
      .replace(/^งานนี้\s*/i, '')
      .trim()
    return { intent: 'complete_task', taskTitle: title || undefined }
  }

  // เลื่อน deadline
  if (/เลื่อน/.test(lower)) {
    const title = text
      .replace(/^เลื่อน(ไป)?\s*/i, '')
      .replace(/\s*(ไป)?(พรุ่งนี้|วันพรุ่งนี้|วันจันทร์|วันอังคาร|วันพุธ|วันพฤหัส|วันศุกร์|วันเสาร์|วันอาทิตย์).*$/i, '')
      .trim()
    return {
      intent: 'reschedule_task',
      taskTitle: title || undefined,
      newDeadline: tomorrowAt9am(),
    }
  }

  // ตั้งเตือน — วันเวลาเฉพาะ หรือ อีก X นาที/ชั่วโมง
  if (isReminderLikeMessage(text)) {
    const schedule = parseScheduleFromText(text)
    if (schedule) {
      return {
        intent: 'set_reminder',
        taskTitle: schedule.taskTitle || undefined,
        remindAt: schedule.remindAt.toISOString(),
      }
    }
  }

  const reminderMatch = lower.match(/(?:ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*(\d+)\s*นาที/)
  if (reminderMatch) {
    const minutes = parseInt(reminderMatch[1], 10)
    const schedule = parseScheduleFromText(`อีก ${minutes} นาที ${text}`)
    return {
      intent: 'set_reminder',
      taskTitle: schedule?.taskTitle || undefined,
      reminderMinutes: minutes,
      remindAt: schedule?.remindAt.toISOString(),
    }
  }

  return null
}
