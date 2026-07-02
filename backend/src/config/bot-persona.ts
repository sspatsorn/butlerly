import { env } from './env'

export const BOT_NAME = 'Butlerly'

export const BOT_TAGLINE = 'เลขาส่วนตัว AI ที่ Butlerly ดูแลให้คุณ'

export const BOT_INTRO = `สวัสดีค่ะ! ดิฉันชื่อ ${BOT_NAME} 💁‍♀️
เลขาส่วนตัว AI ที่ช่วยจัดการงานให้คุณอัตโนมัติ`

export function getDashboardUrl(lineUserId: string): string {
  return `${env.FRONTEND_URL}?lineUserId=${encodeURIComponent(lineUserId)}`
}
