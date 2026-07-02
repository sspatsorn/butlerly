import type { Task, TaskStatus } from '~/types/task'

export function useTasks() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase

  const lineUserId = useState<string>('lineUserId', () => '')
  const tasks = useState<Task[]>('tasks', () => [])
  const loading = useState('tasksLoading', () => false)
  const error = useState<string | null>('tasksError', () => null)

  async function fetchTasks(status?: TaskStatus) {
    if (!lineUserId.value) {
      error.value = 'กรุณาใส่ LINE User ID'
      return
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({ lineUserId: lineUserId.value })
      if (status) params.set('status', status)

      const data = await $fetch<{ tasks: Task[] }>(`${apiBase}/tasks?${params}`)
      tasks.value = data.tasks
    } catch (e) {
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function fetchTodayTasks() {
    if (!lineUserId.value) {
      error.value = 'กรุณาใส่ LINE User ID'
      return
    }

    loading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({ lineUserId: lineUserId.value })
      const data = await $fetch<{ tasks: Task[] }>(`${apiBase}/tasks/today?${params}`)
      tasks.value = data.tasks
    } catch (e) {
      error.value = 'ไม่สามารถโหลดข้อมูลได้'
      console.error(e)
    } finally {
      loading.value = false
    }
  }

  async function updateStatus(taskId: string, status: TaskStatus) {
    await $fetch(`${apiBase}/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: { lineUserId: lineUserId.value, status },
    })
    await fetchTasks()
  }

  return {
    lineUserId,
    tasks,
    loading,
    error,
    fetchTasks,
    fetchTodayTasks,
    updateStatus,
  }
}
