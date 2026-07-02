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
}

export const reminderRepository = new ReminderRepository()
