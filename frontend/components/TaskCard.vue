<script setup lang="ts">
import type { Task, TaskStatus } from '~/types/task'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  updateStatus: [taskId: string, status: TaskStatus]
  updateTask: [taskId: string, payload: { title: string; deadline: string | null }]
}>()

const editing = ref(false)
const saving = ref(false)
const editTitle = ref('')
const editDeadline = ref<string | null>(null)

const statusConfig: Record<TaskStatus, { label: string; dot: string; border: string; bg: string }> = {
  pending: {
    label: 'รอดำเนินการ',
    dot: 'bg-amber-400',
    border: 'border-l-amber-400',
    bg: 'bg-amber-50 text-amber-800',
  },
  in_progress: {
    label: 'กำลังทำ',
    dot: 'bg-sky-400',
    border: 'border-l-sky-400',
    bg: 'bg-sky-50 text-sky-800',
  },
  completed: {
    label: 'เสร็จแล้ว',
    dot: 'bg-emerald-400',
    border: 'border-l-emerald-400',
    bg: 'bg-emerald-50 text-emerald-800',
  },
  cancelled: {
    label: 'ยกเลิก',
    dot: 'bg-gray-300',
    border: 'border-l-gray-300',
    bg: 'bg-gray-100 text-gray-500',
  },
}

const canEdit = computed(
  () => props.task.status === 'pending' || props.task.status === 'in_progress',
)

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleString('th-TH', {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function inputsToDeadline(): string | null {
  return editDeadline.value
}

function startEdit() {
  editTitle.value = props.task.title
  editDeadline.value = props.task.deadline
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  saving.value = false
}

function saveEdit() {
  if (!editTitle.value.trim()) return
  saving.value = true
  emit('updateTask', props.task.id, {
    title: editTitle.value.trim(),
    deadline: inputsToDeadline(),
  })
}

watch(
  () => props.task.updated_at,
  () => {
    editing.value = false
    saving.value = false
  },
)
</script>

<template>
  <article
    class="touch-card transition-all duration-200 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/80 overflow-hidden border-l-4"
    :class="statusConfig[task.status].border"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2 mb-1.5">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full shrink-0" :class="statusConfig[task.status].dot" />
              <span
                class="text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                :class="statusConfig[task.status].bg"
              >
                {{ statusConfig[task.status].label }}
              </span>
            </div>
            <button
              v-if="canEdit && !editing"
              type="button"
              class="shrink-0 p-2 rounded-lg text-violet-600 hover:bg-violet-50"
              aria-label="แก้ไขงาน"
              @click="startEdit"
            >
              <UIcon name="i-heroicons-pencil-square" class="w-5 h-5" />
            </button>
          </div>

          <template v-if="editing">
            <div class="task-edit-form rounded-xl border border-violet-100 bg-violet-50/40 p-3">
              <label class="block text-xs font-semibold text-gray-600 mb-1.5">ชื่องาน</label>
              <input
                v-model="editTitle"
                type="text"
                class="app-input mb-3"
                placeholder="ชื่องาน"
              >

              <label class="block text-xs font-semibold text-gray-600 mb-1.5">วันและเวลาแจ้งเตือน</label>
              <AppDateTimePicker v-model="editDeadline" class="mb-2" />
              <p class="text-[11px] text-gray-500 leading-relaxed">
                บันทึกแล้วจะอัปเดตการแจ้งเตือน LINE ตามเวลาใหม่
              </p>
            </div>

            <div class="flex gap-2 mt-3">
              <button
                type="button"
                class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-md shadow-violet-200/50 disabled:opacity-60 active:scale-[0.98] transition-transform"
                :disabled="saving || !editTitle.trim()"
                @click="saveEdit"
              >
                <span v-if="saving" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                บันทึก
              </button>
              <button
                type="button"
                class="shrink-0 px-5 py-3 rounded-xl bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-transform disabled:opacity-60"
                :disabled="saving"
                @click="cancelEdit"
              >
                ยกเลิก
              </button>
            </div>
          </template>

          <template v-else>
            <h3 class="font-semibold text-gray-900 text-[15px] leading-snug break-words">
              {{ task.title }}
            </h3>
            <p v-if="task.description" class="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
              {{ task.description }}
            </p>
          </template>
        </div>
      </div>

      <div
        v-if="!editing && task.deadline"
        class="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm"
      >
        <UIcon name="i-heroicons-clock" class="w-4 h-4 shrink-0" />
        <span class="font-medium">{{ formatDate(task.deadline) }}</span>
      </div>

      <ul v-if="!editing && task.checklist_items?.length" class="mt-3 space-y-2 rounded-xl bg-gray-50 p-3">
        <li
          v-for="item in task.checklist_items"
          :key="item.id"
          class="flex items-start gap-2.5 text-sm text-gray-600"
        >
          <UIcon
            :name="item.completed ? 'i-heroicons-check-circle-solid' : 'i-heroicons-minus-circle'"
            class="w-4 h-4 mt-0.5 shrink-0"
            :class="item.completed ? 'text-emerald-500' : 'text-gray-300'"
          />
          <span :class="{ 'line-through text-gray-400': item.completed }">{{ item.title }}</span>
        </li>
      </ul>

      <button
        v-if="!editing && task.status !== 'completed' && task.status !== 'cancelled'"
        type="button"
        class="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-semibold shadow-md shadow-violet-200/50 active:scale-[0.98] transition-transform"
        @click="emit('updateStatus', task.id, 'completed')"
      >
        <UIcon name="i-heroicons-check" class="w-5 h-5" />
        ทำเครื่องหมายเสร็จ
      </button>
    </div>
  </article>
</template>
