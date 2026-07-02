export interface ChecklistItem {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  deadline: string | null
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  source_message: string | null
  created_at: string
  updated_at: string
  checklist_items: ChecklistItem[]
}

export type TaskStatus = Task['status']
