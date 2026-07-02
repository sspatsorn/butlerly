<script setup lang="ts">
const route = useRoute()
const { lineUserId, tasks, loading, error, fetchTasks, fetchTodayTasks, updateStatus } = useTasks()

const filter = ref<'all' | 'today'>('today')
const showHelp = ref(false)
const showIdInput = ref(false)

const taskStats = computed(() => {
  const pending = tasks.value.filter((t) => t.status === 'pending' || t.status === 'in_progress').length
  const done = tasks.value.filter((t) => t.status === 'completed').length
  return { total: tasks.value.length, pending, done }
})

const hasAutoId = computed(() => !!lineUserId.value)

const registerLink = computed(() => {
  if (!lineUserId.value) return '/register'
  return `/register?lineUserId=${encodeURIComponent(lineUserId.value)}`
})

onMounted(() => {
  const fromQuery = route.query.lineUserId
  if (typeof fromQuery === 'string' && fromQuery) {
    lineUserId.value = fromQuery
    localStorage.setItem('lineUserId', fromQuery)
    filter.value = 'all'
    loadTasks()
    return
  }

  const saved = localStorage.getItem('lineUserId')
  if (saved) {
    lineUserId.value = saved
    loadTasks()
  } else {
    showIdInput.value = true
  }
})

function saveAndLoad() {
  localStorage.setItem('lineUserId', lineUserId.value)
  loadTasks()
  showIdInput.value = false
}

function loadTasks() {
  if (filter.value === 'today') {
    fetchTodayTasks()
  } else {
    fetchTasks()
  }
}

watch(filter, loadTasks)
</script>

<template>
  <div class="min-h-dvh max-w-lg mx-auto px-4 pb-8 safe-bottom">
    <AppHeader subtitle="เลขาส่วนตัว AI ของคุณ">
      <template #action>
        <NuxtLink
          :to="registerLink"
          class="shrink-0 text-xs font-medium px-3 py-2 rounded-full bg-violet-50 text-violet-600 border border-violet-100"
        >
          สมัคร
        </NuxtLink>
      </template>
    </AppHeader>

    <!-- Connected badge (mobile: auto from LINE link) -->
    <div v-if="hasAutoId && !showIdInput" class="mb-4 flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl bg-white/80 border border-emerald-100 shadow-sm">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <span class="text-xs text-gray-600 truncate">เชื่อมต่อ LINE แล้ว</span>
      </div>
      <button
        type="button"
        class="text-xs text-violet-600 font-medium shrink-0"
        @click="showIdInput = true"
      >
        เปลี่ยน
      </button>
    </div>

    <!-- LINE User ID (collapsible on mobile) -->
    <div v-if="showIdInput || !hasAutoId" class="mb-5 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
      <label class="block text-sm font-semibold text-gray-800 mb-2">LINE User ID</label>
      <UInput
        v-model="lineUserId"
        placeholder="Uxxxxxxxx..."
        size="lg"
        class="mb-3"
        @keyup.enter="saveAndLoad"
      />
      <UButton color="primary" block size="lg" :loading="loading" class="rounded-xl" @click="saveAndLoad">
        โหลดงานของฉัน
      </UButton>
      <p class="text-[11px] text-gray-400 mt-2 text-center leading-relaxed">
        เปิดจากลิงก์ใน LINE จะดึง ID อัตโนมัติ
      </p>
    </div>

    <template v-if="hasAutoId">
      <!-- Stats chips -->
      <div v-if="tasks.length > 0" class="flex gap-2 mb-4 overflow-x-auto no-scrollbar pb-1">
        <div class="shrink-0 px-4 py-2 rounded-full bg-white border border-gray-100 shadow-sm text-sm">
          <span class="text-gray-500">ทั้งหมด</span>
          <span class="font-bold text-gray-900 ml-1">{{ taskStats.total }}</span>
        </div>
        <div class="shrink-0 px-4 py-2 rounded-full bg-amber-50 border border-amber-100 text-sm">
          <span class="text-amber-700">ค้าง</span>
          <span class="font-bold text-amber-800 ml-1">{{ taskStats.pending }}</span>
        </div>
        <div class="shrink-0 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-100 text-sm">
          <span class="text-emerald-700">เสร็จ</span>
          <span class="font-bold text-emerald-800 ml-1">{{ taskStats.done }}</span>
        </div>
      </div>

      <!-- Segmented filter -->
      <div class="mb-5 p-1 rounded-2xl bg-white/90 border border-gray-100 shadow-inner flex">
        <button
          type="button"
          class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
          :class="filter === 'today' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md' : 'text-gray-500'"
          @click="filter = 'today'"
        >
          งานวันนี้
        </button>
        <button
          type="button"
          class="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
          :class="filter === 'all' ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md' : 'text-gray-500'"
          @click="filter = 'all'"
        >
          งานทั้งหมด
        </button>
      </div>

      <UAlert v-if="error" color="error" :title="error" class="mb-4 rounded-2xl" />

      <!-- Loading -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-16 gap-3">
        <UIcon name="i-heroicons-arrow-path" class="w-10 h-10 text-violet-400 animate-spin" />
        <p class="text-sm text-gray-500">Butlerly กำลังโหลดงาน...</p>
      </div>

      <!-- Task list -->
      <div v-else-if="tasks.length > 0" class="space-y-3">
        <TaskCard
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          @update-status="updateStatus"
        />
      </div>

      <!-- Empty -->
      <div v-else class="text-center py-14 px-4 rounded-3xl bg-white/60 border border-dashed border-violet-200">
        <div class="text-5xl mb-3">📭</div>
        <p class="text-gray-700 font-medium">ยังไม่มีงานค่ะ</p>
        <p class="text-gray-400 text-sm mt-2 leading-relaxed">
          ส่งข้อความงานไปที่ Butlerly<br>ใน LINE ได้เลย
        </p>
      </div>
    </template>

    <!-- Help accordion -->
    <div class="mt-6 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
      <button
        type="button"
        class="w-full flex items-center justify-between p-4 text-left"
        @click="showHelp = !showHelp"
      >
        <span class="font-semibold text-gray-800 text-sm">💬 คำสั่งใน LINE</span>
        <UIcon
          name="i-heroicons-chevron-down"
          class="w-5 h-5 text-gray-400 transition-transform"
          :class="{ 'rotate-180': showHelp }"
        />
      </button>
      <div v-show="showHelp" class="px-4 pb-4 space-y-2.5 border-t border-gray-50 pt-3">
        <div v-for="(item, i) in [
          { icon: '📝', text: 'สมัคร → สมัครสมาชิก' },
          { icon: '📋', text: 'งานอะไรบ้าง → ดูงานทั้งหมด' },
          { icon: '✅', text: 'งานนี้เสร็จแล้ว' },
          { icon: '🗑️', text: 'ยกเลิก → เลือกงานจากหมายเลข' },
          { icon: '🔔', text: 'เตือนอีก 30 นาที' },
        ]" :key="i" class="flex items-center gap-3 text-sm text-gray-600 py-1">
          <span class="w-8 h-8 flex items-center justify-center rounded-xl bg-violet-50 shrink-0">{{ item.icon }}</span>
          <span>{{ item.text }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
