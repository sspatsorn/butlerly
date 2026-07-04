import { taskRepository } from '../repositories/task.repository'
import { checklistRepository } from '../repositories/checklist.repository'
import { reminderRepository } from '../repositories/reminder.repository'
import { reminderService } from './reminder.service'
import { BOT_NAME, getDashboardUrl } from '../config/bot-persona'
import { formatThaiDateTime, parseScheduleFromText, parseSnoozeFromText, parseTaskDetailsFromMessage, isReminderLikeMessage } from '../utils/datetime.parser'
import type { ChecklistItem, Task, TaskWithChecklist } from '../types'

const STATUS_LABELS: Record<Task['status'], string> = {
  pending: '⏳ รอดำเนินการ',
  in_progress: '🔵 กำลังทำ',
  completed: '✅ เสร็จแล้ว',
  cancelled: '❌ ยกเลิก',
}

const RECENT_STATUS_LIMIT = 5

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
    const taskWithChecklist = { ...task, checklist_items: checklistItems }

    if (params.deadline) {
      await this.syncReminderForDeadline(task.id, params.userId, params.deadline, taskWithChecklist)
    }

    return taskWithChecklist
  }

  formatReminderMessage(
    task: Pick<Task, 'title' | 'description'> & { checklist_items?: ChecklistItem[] },
    remindAt: Date | string,
  ): string {
    const lines = [`⏰ ${BOT_NAME} เตือน: ${task.title}`]
    lines.push(`📅 ${formatThaiDateTime(new Date(remindAt))}`)

    const desc = task.description?.trim()
    if (desc && desc !== task.title.trim()) {
      lines.push(`📝 ${desc}`)
    }

    const items = task.checklist_items ?? []
    if (items.length > 0) {
      lines.push('📋')
      items.forEach((item, i) => {
        lines.push(`${i + 1}. ${item.title}`)
      })
    }

    return lines.join('\n')
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

  formatPendingList(tasks: TaskWithChecklist[], lineUserId: string): string {
    if (tasks.length === 0) {
      return `📭 ไม่มีงานค้างอยู่ค่ะ\n\n🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`
    }

    const lines = [`📋 งานค้าง (${tasks.length} รายการ):`, '']
    tasks.forEach((task, i) => {
      lines.push(this.formatTaskLine(i + 1, task))
    })
    lines.push('', `🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`)
    return lines.join('\n')
  }

  formatStatusList(
    tasks: TaskWithChecklist[],
    lineUserId: string,
    status: 'completed' | 'cancelled',
  ): string {
    const heading = status === 'completed' ? '✅ งานที่เสร็จแล้ว' : '❌ งานที่ยกเลิก'
    const emptyLabel = status === 'completed' ? 'งานที่เสร็จแล้ว' : 'งานที่ยกเลิก'

    if (tasks.length === 0) {
      return `📭 ไม่มี${emptyLabel}ค่ะ\n\nพิมพ์ "งานอะไรบ้าง" เพื่อดูงานค้าง`
    }

    const lines = [`${heading} (${tasks.length} รายการล่าสุด):`, '']
    tasks.forEach((task, i) => {
      lines.push(this.formatTaskLine(i + 1, task))
    })
    lines.push('', `💡 พิมพ์ "งานอะไรบ้าง" เพื่อดูงานค้าง`)
    lines.push('', `🔗 ดูแดชบอร์ด:\n${getDashboardUrl(lineUserId)}`)
    return lines.join('\n')
  }

  /** @deprecated ใช้ formatPendingList / formatStatusList แทน */
  formatAllTasksList(tasks: TaskWithChecklist[], lineUserId: string): string {
    const pending = tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    return this.formatPendingList(pending, lineUserId)
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

    if (new Date(newDeadline).getTime() > Date.now()) {
      const full = await taskRepository.findByIdWithChecklist(task.id, userId)
      await this.syncReminderForDeadline(task.id, userId, newDeadline, full ?? task)
      return `📅 เลื่อน "${task.title}" ไป ${formatThaiDateTime(new Date(newDeadline))}\n🔔 ตั้งแจ้งเตือนตามเวลาใหม่แล้ว`
    }

    await reminderRepository.cancelPendingForTask(task.id)
    return `📅 เลื่อน "${task.title}" ไป ${formatThaiDateTime(new Date(newDeadline))}`
  }

  private async syncReminderForDeadline(
    taskId: string,
    userId: string,
    deadline: string,
    taskHint?: Pick<Task, 'title' | 'description'> & { checklist_items?: ChecklistItem[] },
  ): Promise<void> {
    if (new Date(deadline).getTime() <= Date.now()) {
      await reminderRepository.cancelPendingForTask(taskId)
      return
    }

    const task = taskHint ?? (await taskRepository.findByIdWithChecklist(taskId, userId))
    if (!task) return

    const message = this.formatReminderMessage(task, deadline)
    await reminderRepository.syncPendingForTask(taskId, userId, deadline, message)
    reminderService.scheduleNearCheck(deadline)
  }

  async setReminder(
    userId: string,
    taskTitle: string | undefined,
    options: {
      minutes?: number
      remindAt?: string
      sourceMessage?: string
      description?: string
      checklist?: string[]
    },
  ): Promise<string> {
    const { minutes, remindAt: remindAtIso, sourceMessage, description, checklist } = options

    let remindAt: Date
    if (remindAtIso) {
      remindAt = new Date(remindAtIso)
    } else if (minutes !== undefined) {
      remindAt = new Date(Date.now() + minutes * 60 * 1000)
    } else {
      remindAt = new Date(Date.now() + 30 * 60 * 1000)
    }

    if (remindAt.getTime() <= Date.now()) {
      return '❌ เวลาแจ้งเตือนต้องอยู่ในอนาคตค่ะ ลองระบุวันและเวลาใหม่อีกครั้งนะคะ'
    }

    let title = taskTitle?.trim() ?? ''
    title = title.replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*นาที\s*/i, '').trim()

    const isSnooze = minutes !== undefined || (sourceMessage ? !!parseSnoozeFromText(sourceMessage) : false)

    if (!title && sourceMessage) {
      const schedule = parseScheduleFromText(sourceMessage)
      if (schedule?.taskTitle) {
        title = schedule.taskTitle
      } else if (!isSnooze && !isReminderLikeMessage(sourceMessage)) {
        title = sourceMessage.trim().slice(0, 100)
      }
    }

    let task = title
      ? await taskRepository.findTaskSmart(userId, title)
      : await taskRepository.findLatestPending(userId)

    const parsedDetails = sourceMessage
      ? parseTaskDetailsFromMessage(sourceMessage, title)
      : {}

    let isNewTask = false
    if (!task && title) {
      const created = await this.createTask({
        userId,
        title: title.slice(0, 100),
        description: description ?? parsedDetails.description,
        checklist: checklist ?? parsedDetails.checklist,
        deadline: remindAt.toISOString(),
        sourceMessage,
      })
      task = created
      isNewTask = true
    }

    if (!task) {
      return isSnooze
        ? '📭 ไม่มีงานค้างให้เตือนซ้ำค่ะ ลองพิมพ์ "งานอะไรบ้าง" เพื่อดูรายการ'
        : '📭 ไม่มีงานให้ตั้งเตือน ลองส่งข้อความงานมาก่อนนะคะ'
    }

    const formatted = formatThaiDateTime(remindAt)

    if (isNewTask) {
      return `🔔 ตั้งเตือน "${task.title}"\n📅 ${formatted}`
    }

    const full = await taskRepository.findByIdWithChecklist(task.id, userId)
    const taskForMessage = full ?? { ...task, checklist_items: [] }
    const message = this.formatReminderMessage(taskForMessage, remindAt)

    await reminderRepository.create({
      taskId: task.id,
      userId,
      remindAt: remindAt.toISOString(),
      message,
    })
    reminderService.scheduleNearCheck(remindAt.toISOString())

    await taskRepository.updateDeadline(task.id, userId, remindAt.toISOString())

    const snoozeNote = isSnooze ? '\n💡 เตือนซ้ำงานล่าสุด' : ''
    return `🔔 ตั้งเตือน "${task.title}"\n📅 ${formatted}${snoozeNote}`
  }

  async updateTaskDetails(
    userId: string,
    taskId: string,
    updates: { title?: string; deadline?: string | null },
  ): Promise<string> {
    const existing = await taskRepository.findById(taskId, userId)
    if (!existing) {
      return '❌ ไม่พบงานนี้ค่ะ'
    }

    if (updates.title !== undefined && !updates.title.trim()) {
      return '❌ กรุณาระบุชื่องานค่ะ'
    }

    const payload: { title?: string; deadline?: string | null } = {}
    if (updates.title !== undefined) payload.title = updates.title.trim()
    if (updates.deadline !== undefined) payload.deadline = updates.deadline

    const task = await taskRepository.update(taskId, userId, payload)
    const title = task.title

    if (updates.deadline !== undefined) {
      if (task.deadline && new Date(task.deadline).getTime() > Date.now()) {
        const full = await taskRepository.findByIdWithChecklist(taskId, userId)
        await this.syncReminderForDeadline(taskId, userId, task.deadline, full ?? task)
      } else {
        await reminderRepository.cancelPendingForTask(taskId)
      }
    } else if (updates.title !== undefined && task.deadline) {
      const full = await taskRepository.findByIdWithChecklist(taskId, userId)
      await this.syncReminderForDeadline(taskId, userId, task.deadline, full ?? task)
    }

    const lines = [`✅ บันทึกการแก้ไข "${title}" แล้วค่ะ`]
    if (task.deadline) {
      lines.push(`📅 ${formatThaiDateTime(new Date(task.deadline))}`)
      lines.push('🔔 อัปเดตการแจ้งเตือนตามเวลาใหม่แล้ว')
    }
    return lines.join('\n')
  }
}

export const taskService = new TaskService()
export { RECENT_STATUS_LIMIT }
