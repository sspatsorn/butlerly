export type RegistrationStep = 'awaiting_name' | 'awaiting_phone'
export type SessionStep = 'awaiting_cancel_selection'

export interface CancelSessionData {
  taskIds: string[]
}

export interface User {
  id: string
  line_user_id: string
  display_name: string | null
  full_name: string | null
  phone: string | null
  is_registered: boolean
  registration_step: RegistrationStep | null
  session_step: SessionStep | null
  session_data: CancelSessionData | null
  created_at: string
  updated_at: string
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
}

export interface ChecklistItem {
  id: string
  task_id: string
  title: string
  completed: boolean
  sort_order: number
  created_at: string
}

export interface Reminder {
  id: string
  task_id: string
  user_id: string
  remind_at: string
  sent: boolean
  message: string | null
  created_at: string
}

export type IntentType =
  | 'create_task'
  | 'list_tasks'
  | 'complete_task'
  | 'reschedule_task'
  | 'set_reminder'
  | 'help'
  | 'unknown'

export interface ParsedIntent {
  intent: IntentType
  listScope?: 'today' | 'all'
  taskTitle?: string
  taskId?: string
  deadline?: string
  reminderMinutes?: number
  newDeadline?: string
  checklist?: string[]
  description?: string
  responseMessage?: string
}

export interface TaskWithChecklist extends Task {
  checklist_items: ChecklistItem[]
}
