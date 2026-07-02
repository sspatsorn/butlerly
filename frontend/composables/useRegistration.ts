export interface RegisterForm {
  fullName: string
  phone: string
  lineUserId: string
}

export interface RegisterStatus {
  registered: boolean
  user: {
    fullName: string
    phone: string
    lineUserId: string
  } | null
}

const LINE_USER_ID_KEY = 'lineUserId'

export function useRegistration() {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase
  const liffId = config.public.liffId

  const loading = ref(false)
  const error = ref<string | null>(null)
  const success = ref(false)
  const lineUserId = ref('')
  const lineDisplayName = ref('')
  const isLiffReady = ref(false)

  function persistLineUserId(userId: string) {
    if (!import.meta.client || !userId) return
    localStorage.setItem(LINE_USER_ID_KEY, userId)
  }

  function resolveLineUserId(queryUserId?: string | string[]) {
    if (lineUserId.value) return

    const fromQuery = Array.isArray(queryUserId) ? queryUserId[0] : queryUserId
    if (fromQuery) {
      lineUserId.value = fromQuery
      persistLineUserId(fromQuery)
      return
    }

    if (!import.meta.client) return

    const saved = localStorage.getItem(LINE_USER_ID_KEY)
    if (saved) {
      lineUserId.value = saved
    }
  }

  async function initLiff() {
    if (!liffId || !import.meta.client) return

    try {
      const liff = await import('@line/liff')
      await liff.default.init({ liffId })

      if (!liff.default.isLoggedIn()) {
        liff.default.login()
        return
      }

      const profile = await liff.default.getProfile()
      lineUserId.value = profile.userId
      lineDisplayName.value = profile.displayName
      isLiffReady.value = true
      persistLineUserId(profile.userId)
    } catch (e) {
      console.error('LIFF init failed:', e)
    }
  }

  async function checkStatus(userId: string): Promise<RegisterStatus | null> {
    try {
      return await $fetch<RegisterStatus>(`${apiBase}/register/status?lineUserId=${encodeURIComponent(userId)}`)
    } catch {
      return null
    }
  }

  async function register(form: RegisterForm) {
    loading.value = true
    error.value = null
    success.value = false

    try {
      await $fetch(`${apiBase}/register`, {
        method: 'POST',
        body: form,
      })
      persistLineUserId(form.lineUserId)
      success.value = true
    } catch (e: unknown) {
      const err = e as { data?: { error?: string } }
      error.value = err.data?.error ?? 'ไม่สามารถสมัครได้ กรุณาลองใหม่'
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    success,
    lineUserId,
    lineDisplayName,
    isLiffReady,
    initLiff,
    resolveLineUserId,
    persistLineUserId,
    checkStatus,
    register,
  }
}
