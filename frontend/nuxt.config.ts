function resolveApiBase(): string {
  if (process.env.NUXT_PUBLIC_API_BASE) {
    return process.env.NUXT_PUBLIC_API_BASE
  }
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api`
  }
  return 'http://localhost:3001/api'
}

function resolveWsBase(): string {
  if (process.env.NUXT_PUBLIC_WS_BASE) {
    return process.env.NUXT_PUBLIC_WS_BASE.replace(/\/$/, '')
  }
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/^http/, 'ws').replace(/\/$/, '')
  }
  if (process.env.NUXT_PUBLIC_API_BASE) {
    return process.env.NUXT_PUBLIC_API_BASE.replace(/^http/, 'ws').replace(/\/api$/, '')
  }
  return 'ws://localhost:3001'
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-02',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      apiBase: resolveApiBase(),
      wsBase: resolveWsBase(),
      liffId: process.env.NUXT_PUBLIC_LIFF_ID || '',
    },
  },
  app: {
    head: {
      title: 'Butlerly',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap',
        },
      ],
      meta: [
        { name: 'description', content: 'Butlerly - เลขาส่วนตัว AI บน LINE ส่งงานมาให้ Butlerly ดูแลให้ทั้งหมด' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#7c3aed' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },
})
