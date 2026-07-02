import { supabase } from '../utils/supabase'
import type { ChecklistItem } from '../types'

export class ChecklistRepository {
  async createMany(taskId: string, items: string[]): Promise<ChecklistItem[]> {
    if (items.length === 0) return []

    const rows = items.map((title, index) => ({
      task_id: taskId,
      title,
      sort_order: index,
    }))

    const { data, error } = await supabase.from('checklist_items').insert(rows).select()
    if (error) throw error
    return data
  }
}

export const checklistRepository = new ChecklistRepository()
