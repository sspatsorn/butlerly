export default defineNuxtPlugin(() => {
  const { start, stop } = useKeepAlive()
  start()

  if (import.meta.client) {
    window.addEventListener('beforeunload', stop)
  }
})
