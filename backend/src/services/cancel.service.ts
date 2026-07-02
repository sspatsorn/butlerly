import { taskRepository } from '../repositories/task.repository'
import { userRepository } from '../repositories/user.repository'
import type { CancelSessionData, User } from '../types'

const CANCEL_COMMANDS = ['ยกเลิก', 'cancel']

export class CancelService {
  isCancelCommand(text: string): boolean {
    const normalized = text.trim().toLowerCase()
    return CANCEL_COMMANDS.some((kw) => normalized === kw.toLowerCase())
  }

  async startCancelFlow(userId: string, lineUserId: string): Promise<string> {
    const tasks = await taskRepository.listPending(userId)

    if (tasks.length === 0) {
      await userRepository.clearSession(lineUserId)
      return '📭 ไม่มีงานที่สามารถยกเลิกได้ค่ะ'
    }

    const taskIds = tasks.map((t) => t.id)
    await userRepository.setSession(lineUserId, 'awaiting_cancel_selection', { taskIds })

    const lines = ['🗑️ ต้องการยกเลิกงานไหนคะ? พิมพ์หมายเลขงาน:', '']
    tasks.forEach((task, i) => {
      let line = `${i + 1}. ${task.title}`
      if (task.deadline) {
        const d = new Date(task.deadline)
        line += ` (${d.toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'short', timeStyle: 'short' })})`
      }
      lines.push(line)
    })
    lines.push('', 'พิมพ์หมายเลข หรือ "ยกเลิก" เพื่อออกจากโหมดนี้ค่ะ')

    return lines.join('\n')
  }

  async handleSessionInput(lineUserId: string, text: string, user: User): Promise<string | null> {
    if (user.session_step !== 'awaiting_cancel_selection') return null

    if (this.isCancelCommand(text)) {
      await userRepository.clearSession(lineUserId)
      return '❌ ยกเลิกโหมดเลือกงานแล้วค่ะ'
    }

    const selection = parseInt(text.trim(), 10)
    const sessionData = user.session_data as CancelSessionData | null
    const taskIds = sessionData?.taskIds ?? []

    if (!Number.isInteger(selection) || selection < 1 || selection > taskIds.length) {
      return `⚠️ กรุณาพิมพ์หมายเลข 1-${taskIds.length} ค่ะ`
    }

    const taskId = taskIds[selection - 1]
    const task = await taskRepository.findById(taskId, user.id)

    if (!task || task.status === 'completed' || task.status === 'cancelled') {
      await userRepository.clearSession(lineUserId)
      return '❌ งานนี้ไม่สามารถยกเลิกได้แล้วค่ะ ลองพิมพ์ "ยกเลิก" ใหม่อีกครั้ง'
    }

    await taskRepository.updateStatus(taskId, user.id, 'cancelled')
    await userRepository.clearSession(lineUserId)

    return `🗑️ ยกเลิกงาน "${task.title}" เรียบร้อยแล้วค่ะ`
  }
}

export const cancelService = new CancelService()
