import type { ParsedIntent } from '../types'

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

  if (/วันนี้มีงาน|งานวันนี้|มีงานอะไร/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'today' }
  }

  if (/งานอะไรบ้าง|งานทั้งหมด|รายการงาน|ดูงาน|มีงานบ้าง/.test(lower)) {
    return { intent: 'list_tasks', listScope: 'all' }
  }

  // เสร็จแล้ว — ต้องเช็คก่อน create_task fallback
  if (/เสร็จแล้ว|ทำเสร็จ|\bdone\b/i.test(lower)) {
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

  // ตั้งเตือน
  const reminderMatch = lower.match(/(?:ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*(\d+)\s*นาที/)
  if (reminderMatch) {
    const title = text
      .replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*นาที\s*/i, '')
      .trim()
    return {
      intent: 'set_reminder',
      taskTitle: title || undefined,
      reminderMinutes: parseInt(reminderMatch[1], 10),
    }
  }

  return null
}
