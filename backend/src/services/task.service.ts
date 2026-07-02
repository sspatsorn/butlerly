import { taskRepository } from '../repositories/task.repository'
import { checklistRepository } from '../repositories/checklist.repository'
import { reminderRepository } from '../repositories/reminder.repository'
import { BOT_NAME, getDashboardUrl } from '../config/bot-persona'
import type { Task, TaskWithChecklist } from '../types'

const STATUS_LABELS: Record<Task['status'], string> = {
  pending: '⏳ รอดำเนินการ',
  in_progress: '🔵 กำลังทำ',
  completed: '✅ เสร็จแล้ว',
  cancelled: '❌ ยกเลิก',
}

export class TaskService {
  async createTask(params: {
    userId: string
    title: string
    description?: string
    deadline?: string
    sourceMessage?: string
    checklist?: string[]
  }): Promise<TaskWithChecklist> {
    const task = await taskRepository.create({
      userId: params.userId,
      title: params.title,
      description: params.description,
      deadline: params.deadline,
      sourceMessage: params.sourceMessage,
    })

    const checklistItems = await checklistRepository.createMany(task.id, params.checklist ?? [])
    return { ...task, checklist_items: checklistItems }
  }

  formatTaskCreated(task: TaskWithChecklist): string {
    const lines = [`✅ สร้างงาน: ${task.title}`]

    if (task.description) lines.push(`📝 ${task.description}`)
    if (task.deadline) {
      const d = new Date(task.deadline)
      lines.push(`⏰ Deadline: ${d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`)
    }
    if (task.checklist_items.length > 0) {
      lines.push('📋 Checklist:')
      task.checklist_items.forEach((item, i) => {
        lines.push(`  ${i + 1}. ${item.title}`)
      })
    }

    return lines.join('\n')
  }

  formatTaskList(tasks: TaskWithChecklist[], lineUserId?: string): string {
    if (tasks.length === 0) {
      const lines = ['📭 ไม่มีงานค้างอยู่ค่ะ']
      if (lineUserId) lines.push('', `🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`)
      return lines.join('\n')
    }

    const lines = [`📋 งานวันนี้ (${tasks.length} รายการ):`, '']
    tasks.forEach((task, i) => {
      lines.push(this.formatTaskLine(i + 1, task))
    })

    if (lineUserId) {
      lines.push('', `🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`)
    }

    return lines.join('\n')
  }

  formatAllTasksList(tasks: TaskWithChecklist[], lineUserId: string): string {
    if (tasks.length === 0) {
      return `📭 ยังไม่มีงานในระบบค่ะ\n\n🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`
    }

    const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    const completed = tasks.filter((t) => t.status === 'completed')
    const cancelled = tasks.filter((t) => t.status === 'cancelled')

    const lines = [`📋 รายการงานทั้งหมด (${tasks.length} รายการ)`, '']

    if (pending.length > 0) {
      lines.push(`⏳ ยังไม่เสร็จ (${pending.length})`)
      pending.forEach((task, i) => lines.push(this.formatTaskLine(i + 1, task)))
      lines.push('')
    }

    if (completed.length > 0) {
      lines.push(`✅ เสร็จแล้ว (${completed.length})`)
      completed.forEach((task, i) => lines.push(this.formatTaskLine(i + 1, task)))
      lines.push('')
    }

    if (cancelled.length > 0) {
      lines.push(`❌ ยกเลิก (${cancelled.length})`)
      cancelled.forEach((task, i) => lines.push(this.formatTaskLine(i + 1, task)))
      lines.push('')
    }

    lines.push(`🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`)

    return lines.join('\n').trimEnd()
  }

  private formatTaskLine(index: number, task: TaskWithChecklist): string {
    const label = STATUS_LABELS[task.status]
    let line = `${index}. [${label}] ${task.title}`
    if (task.deadline) {
      const d = new Date(task.deadline)
      line += ` (${d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })})`
    }
    return line
  }

  async completeTask(userId: string, taskTitle?: string): Promise<string> {
    const task = await taskRepository.findTaskSmart(userId, taskTitle)
    if (!task) {
      return taskTitle
        ? `❌ ไม่พบงาน "${taskTitle}"\nลองพิมพ์ "วันนี้มีงานอะไร" เพื่อดูรายการงาน`
        : '📭 ไม่มีงานค้างให้ทำเครื่องหมายเสร็จค่ะ'
    }

    await taskRepository.updateStatus(task.id, userId, 'completed')
    return `✅ ทำเครื่องหมาย "${task.title}" เสร็จแล้วค่ะ`
  }

  async rescheduleTask(userId: string, taskTitle: string | undefined, newDeadline: string): Promise<string> {
    const task = await taskRepository.findTaskSmart(userId, taskTitle)
    if (!task) {
      return taskTitle
        ? `❌ ไม่พบงาน "${taskTitle}"`
        : '📭 ไม่มีงานค้างให้เลื่อนค่ะ'
    }

    await taskRepository.updateDeadline(task.id, userId, newDeadline)
    const d = new Date(newDeadline)
    return `📅 เลื่อน "${task.title}" ไป ${d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}`
  }

  async setReminder(
    userId: string,
    taskTitle: string | undefined,
    minutes: number,
    sourceMessage?: string,
  ): Promise<string> {
    let title = taskTitle?.trim() ?? ''
    title = title.replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*นาที\s*/i, '').trim()

    if (!title && sourceMessage) {
      title = sourceMessage
        .replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*นาที\s*/i, '')
        .trim()
    }

    let task = await taskRepository.findTaskSmart(userId, title || undefined)

    if (!task && title) {
      const created = await this.createTask({
        userId,
        title: title.slice(0, 100),
        sourceMessage,
      })
      task = created
    }

    if (!task) {
      return '📭 ไม่มีงานให้ตั้งเตือน ลองส่งข้อความงานมาก่อนนะคะ'
    }

    const remindAt = new Date(Date.now() + minutes * 60 * 1000).toISOString()
    await reminderRepository.create({
      taskId: task.id,
      userId,
      remindAt,
      message: `⏰ ${BOT_NAME} เตือน: ${task.title}`,
    })

    return `🔔 ตั้งเตือน "${task.title}" อีก ${minutes} นาที`
  }
}

export const taskService = new TaskService()
