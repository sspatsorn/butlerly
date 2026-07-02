<script setup lang="ts">
const route = useRoute()
const {
  loading,
  error,
  success,
  lineUserId,
  lineDisplayName,
  isLiffReady,
  initLiff,
  resolveLineUserId,
  checkStatus,
  register,
} = useRegistration()

const form = reactive({
  fullName: '',
  phone: '',
})

const alreadyRegistered = ref(false)
const registeredInfo = ref<{ fullName: string; phone: string; lineUserId: string } | null>(null)

onMounted(async () => {
  await initLiff()
  resolveLineUserId(route.query.lineUserId ?? undefined)

  if (lineDisplayName.value && !form.fullName) {
    form.fullName = lineDisplayName.value
  }

  if (lineUserId.value) {
    const status = await checkStatus(lineUserId.value)
    if (status?.registered && status.user) {
      alreadyRegistered.value = true
      registeredInfo.value = status.user
    }
  }
})

async function handleSubmit() {
  if (!lineUserId.value) {
    error.value = 'ไม่พบ LINE User ID กรุณาเปิดหน้านี้จาก LINE'
    return
  }

  await register({
    lineUserId: lineUserId.value,
    fullName: form.fullName,
    phone: form.phone,
  })
}
</script>

<template>
  <div class="min-h-dvh max-w-lg mx-auto px-4 pb-8 safe-bottom">
    <AppHeader title="สมัครสมาชิก" subtitle="Butlerly เลขาส่วนตัว AI" show-back />

    <!-- Already registered -->
    <div v-if="alreadyRegistered && registeredInfo" class="mt-4 p-6 rounded-3xl bg-white border border-violet-100 shadow-lg shadow-violet-100/50 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center text-3xl">
        ✅
      </div>
      <h2 class="font-bold text-gray-900 text-lg">สมัครสมาชิกแล้วค่ะ</h2>
      <div class="mt-5 space-y-3 text-left">
        <div class="flex justify-between items-center py-3 border-b border-gray-50">
          <span class="text-sm text-gray-500">ชื่อ</span>
          <span class="text-sm font-semibold text-gray-900">{{ registeredInfo.fullName }}</span>
        </div>
        <div class="flex justify-between items-center py-3">
          <span class="text-sm text-gray-500">เบอร์โทร</span>
          <span class="text-sm font-semibold text-gray-900">{{ registeredInfo.phone }}</span>
        </div>
      </div>
      <NuxtLink to="/" class="block mt-6">
        <UButton color="primary" block size="lg" class="rounded-xl">ไปหน้า Dashboard</UButton>
      </NuxtLink>
    </div>

    <!-- Success -->
    <div v-else-if="success" class="mt-4 p-6 rounded-3xl bg-white border border-violet-100 shadow-lg text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-3xl">
        🎉
      </div>
      <h2 class="font-bold text-gray-900 text-lg">สมัครสำเร็จ!</h2>
      <p class="text-gray-500 text-sm mt-2">กลับไปที่ LINE แล้วเริ่มส่งงานได้เลยค่ะ</p>
      <NuxtLink to="/" class="block mt-6">
        <UButton color="primary" block size="lg" class="rounded-xl">ไปหน้า Dashboard</UButton>
      </NuxtLink>
    </div>

    <!-- Form -->
    <form
      v-else
      class="mt-4 p-5 rounded-3xl bg-white border border-gray-100 shadow-lg shadow-gray-100/80 space-y-5"
      @submit.prevent="handleSubmit"
    >
      <div>
        <label class="block text-sm font-semibold text-gray-800 mb-2">LINE User ID</label>
        <UInput
          v-model="lineUserId"
          placeholder="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          size="lg"
          :readonly="isLiffReady"
          :class="{ 'bg-violet-50/50': isLiffReady }"
        />
        <p v-if="isLiffReady" class="text-xs text-violet-600 mt-1.5 flex items-center gap-1">
          <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
          ดึงจาก LINE อัตโนมัติแล้ว
        </p>
        <p v-else-if="lineUserId" class="text-xs text-violet-600 mt-1.5 flex items-center gap-1">
          <UIcon name="i-heroicons-check-badge" class="w-4 h-4" />
          ดึงจากลิงก์หรือเครื่องนี้แล้ว
        </p>
        <p v-else class="text-xs text-gray-400 mt-1.5">
          เปิดลิงก์จาก Bot (มี ?lineUserId=...) หรือตั้งค่า LIFF เพื่อดึง ID อัตโนมัติ
        </p>
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-800 mb-2">ชื่อ-นามสกุล</label>
        <UInput v-model="form.fullName" placeholder="เช่น สมชาย ใจดี" size="lg" required />
      </div>

      <div>
        <label class="block text-sm font-semibold text-gray-800 mb-2">เบอร์โทรศัพท์</label>
        <UInput v-model="form.phone" placeholder="0812345678" type="tel" size="lg" inputmode="tel" required />
      </div>

      <UAlert v-if="error" color="error" :title="error" class="rounded-xl" />

      <UButton
        type="submit"
        block
        size="xl"
        :loading="loading"
        class="rounded-xl btn-primary-gradient"
      >
        สมัครสมาชิก
      </UButton>
    </form>

    <!-- Alternative -->
    <div class="mt-5 p-4 rounded-2xl bg-white/70 border border-violet-100">
      <h3 class="font-semibold text-gray-800 text-sm mb-3">หรือสมัครผ่าน LINE</h3>
      <ol class="space-y-2">
        <li v-for="(step, i) in ['เพิ่ม Butlerly เป็นเพื่อน', 'พิมพ์ สมัคร', 'กรอกชื่อและเบอร์โทร']" :key="i" class="flex items-center gap-3 text-sm text-gray-600">
          <span class="w-6 h-6 rounded-full bg-violet-100 text-violet-600 text-xs font-bold flex items-center justify-center shrink-0">
            {{ i + 1 }}
          </span>
          {{ step }}
        </li>
      </ol>
    </div>
  </div>
</template>
