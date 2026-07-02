import cron from 'node-cron'
import { reminderRepository } from '../repositories/reminder.repository'
import { lineService } from './line.service'

export class ReminderService {
  start(): void {
    cron.schedule('*/10 * * * * *', async () => {
      await this.processPendingReminders()
    })
    console.log('⏰ Reminder scheduler started (every 10 seconds)')
  }

  private async processPendingReminders(): Promise<void> {
    try {
      const pending = await reminderRepository.findPending()

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
