import { supabase } from '../utils/supabase'
import type { Reminder } from '../types'

export interface CreateReminderInput {
  taskId: string
  userId: string
  remindAt: string
  message?: string
}

export class ReminderRepository {
  async create(input: CreateReminderInput): Promise<Reminder> {
    // ยกเลิกเตือนเก่าที่ยังไม่ส่งของงานเดียวกัน (กันซ้ำเมื่อ Render ตื่น)
    await supabase
      .from('reminders')
      .update({ sent: true })
      .eq('task_id', input.taskId)
      .eq('sent', false)

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        task_id: input.taskId,
        user_id: input.userId,
        remind_at: input.remindAt,
        message: input.message ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async findDue(withinWindow: { from: string; to: string }): Promise<(Reminder & { tasks: { title: string }; users: { line_user_id: string } })[]> {
    const { data, error } = await supabase
      .from('reminders')
      .select('*, tasks(title), users(line_user_id)')
      .eq('sent', false)
      .gte('remind_at', withinWindow.from)
      .lte('remind_at', withinWindow.to)

    if (error) throw error
    return (data ?? []) as (Reminder & { tasks: { title: string }; users: { line_user_id: string } })[]
  }

  /** ปิดเตือนที่เลยเวลาไปแล้ว — ไม่ส่ง LINE (กัน Render ตื่นแล้วยิงเตือนค้าง) */
  async expireStale(before: string): Promise<number> {
    const { data, error } = await supabase
      .from('reminders')
      .update({ sent: true })
      .eq('sent', false)
      .lt('remind_at', before)
      .select('id')

    if (error) throw error
    return data?.length ?? 0
  }

  async findPending(): Promise<(Reminder & { tasks: { title: string }; users: { line_user_id: string } })[]> {
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('reminders')
      .select('*, tasks(title), users(line_user_id)')
      .eq('sent', false)
      .lte('remind_at', now)

    if (error) throw error
    return (data ?? []) as (Reminder & { tasks: { title: string }; users: { line_user_id: string } })[]
  }

  async markSent(id: string): Promise<void> {
    const { error } = await supabase.from('reminders').update({ sent: true }).eq('id', id)
    if (error) throw error
  }

  async cancelPendingForTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('reminders')
      .update({ sent: true })
      .eq('task_id', taskId)
      .eq('sent', false)

    if (error) throw error
  }

  async syncPendingForTask(
    taskId: string,
    userId: string,
    remindAt: string,
    message: string,
  ): Promise<void> {
    const { data: existing, error: findError } = await supabase
      .from('reminders')
      .select('id')
      .eq('task_id', taskId)
      .eq('sent', false)
      .limit(1)

    if (findError) throw findError

    if (existing?.length) {
      const { error } = await supabase
        .from('reminders')
        .update({ remind_at: remindAt, message })
        .eq('id', existing[0].id)
      if (error) throw error
      return
    }

    if (new Date(remindAt).getTime() > Date.now()) {
      await this.create({ taskId, userId, remindAt, message })
    }
  }
}

export const reminderRepository = new ReminderRepository()
