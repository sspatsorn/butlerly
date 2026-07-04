import cron from 'node-cron'
import { reminderRepository } from '../repositories/reminder.repository'
import { lineService } from './line.service'

/** ส่งได้ถ้าเลยเวลาไม่เกิน 3 นาที (กัน Render sleep แล้วยิงเตือนค้างทีเดียว) */
const GRACE_AFTER_MS = 3 * 60 * 1000
/** ตั้ง timer เพิ่มเมื่อเตือนภายใน 15 นาที (กันพลาดช่วงที่ cron 10 วินาที) */
const NEAR_TERM_MS = 15 * 60 * 1000

export class ReminderService {
  private nearTermTimer: ReturnType<typeof setTimeout> | null = null

  start(): void {
    void this.processPendingReminders()

    cron.schedule('*/10 * * * * *', async () => {
      await this.processPendingReminders()
    })
    console.log('⏰ Reminder scheduler started (every 10 seconds, 3-min grace window)')
  }

  /** เรียกหลังตั้ง/เลื่อนเตือนใกล้ๆ — ยิงตรงเวลาแม้ cron พลาดรอบ */
  scheduleNearCheck(remindAtIso: string): void {
    const delay = new Date(remindAtIso).getTime() - Date.now()
    if (delay <= 0 || delay > NEAR_TERM_MS) return

    if (this.nearTermTimer) clearTimeout(this.nearTermTimer)
    this.nearTermTimer = setTimeout(() => {
      this.nearTermTimer = null
      void this.processPendingReminders()
    }, delay + 1000)
  }

  async processPendingReminders(): Promise<void> {
    try {
      const now = Date.now()
      const nowIso = new Date(now).toISOString()
      const windowStartIso = new Date(now - GRACE_AFTER_MS).toISOString()

      const expired = await reminderRepository.expireStale(windowStartIso)
      if (expired > 0) {
        console.log(`⏰ Skipped ${expired} stale reminder(s) (server was asleep or overdue)`)
      }

      const pending = await reminderRepository.findDue({
        from: windowStartIso,
        to: nowIso,
      })

      for (const reminder of pending) {
        const lineUserId = reminder.users?.line_user_id
        const taskTitle = reminder.tasks?.title ?? 'งาน'
        const message = reminder.message ?? `⏰ Butlerly เตือน: ${taskTitle}`

        if (lineUserId) {
          await lineService.push(lineUserId, message)
        }
        await reminderRepository.markSent(reminder.id)
      }
    } catch (error) {
      console.error('Reminder processing error:', error)
    }
  }
}

export const reminderService = new ReminderService()
