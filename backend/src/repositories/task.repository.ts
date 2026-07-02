import { supabase } from '../utils/supabase'
import type { Task, TaskWithChecklist } from '../types'

export interface CreateTaskInput {
  userId: string
  title: string
  description?: string
  deadline?: string
  sourceMessage?: string
}

export class TaskRepository {
  async create(input: CreateTaskInput): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: input.userId,
        title: input.title,
        description: input.description ?? null,
        deadline: input.deadline ?? null,
        source_message: input.sourceMessage ?? null,
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async findById(id: string, userId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data
  }

  async findByTitleFuzzy(userId: string, title: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .ilike('title', `%${title}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async findLatestPending(userId: string): Promise<Task | null> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    return data
  }

  async listPending(userId: string): Promise<Task[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (error) throw error
    return data ?? []
  }

  async findTaskSmart(userId: string, search?: string): Promise<Task | null> {
    const query = search?.trim() ?? ''

    if (!query || /^งานนี้$/i.test(query)) {
      return this.findLatestPending(userId)
    }

    const direct = await this.findByTitleFuzzy(userId, query)
    if (direct) return direct

    const pending = await this.listPending(userId)
    const cleaned = query.replace(/งานนี้/g, '').trim()

    for (const task of pending) {
      if (query.includes(task.title) || task.title.includes(query)) return task
      if (cleaned && (cleaned.includes(task.title) || task.title.includes(cleaned))) return task
    }

    return null
  }

  async listToday(userId: string): Promise<TaskWithChecklist[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { data, error } = await supabase
      .from('tasks')
      .select('*, checklist_items(*)')
      .eq('user_id', userId)
      .neq('status', 'completed')
      .or(`deadline.gte.${today.toISOString()},deadline.is.null`)
      .order('deadline', { ascending: true, nullsFirst: false })

    if (error) throw error
    return (data ?? []) as TaskWithChecklist[]
  }

  async listAll(userId: string, status?: string): Promise<TaskWithChecklist[]> {
    let query = supabase
      .from('tasks')
      .select('*, checklist_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as TaskWithChecklist[]
  }

  async updateStatus(id: string, userId: string, status: Task['status']): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async updateDeadline(id: string, userId: string, deadline: string): Promise<Task> {
    const { data, error } = await supabase
      .from('tasks')
      .update({ deadline })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export const taskRepository = new TaskRepository()
