import { env } from '../config/env'
import { BOT_INTRO } from '../config/bot-persona'
import { userRepository } from '../repositories/user.repository'
import { lineService } from './line.service'
import type { User } from '../types'

const REGISTER_KEYWORDS = ['สมัคร', 'ลงทะเบียน', 'register']
const CANCEL_KEYWORDS = ['ยกเลิก', 'cancel']

export class RegistrationService {
  getRegisterUrl(lineUserId?: string): string {
    const base = `${env.FRONTEND_URL}/register`
    return lineUserId ? `${base}?lineUserId=${encodeURIComponent(lineUserId)}` : base
  }

  isRegisterCommand(text: string): boolean {
    const normalized = text.trim().toLowerCase()
    return REGISTER_KEYWORDS.some((kw) => normalized === kw.toLowerCase())
  }

  isCancelCommand(text: string): boolean {
    const normalized = text.trim().toLowerCase()
    return CANCEL_KEYWORDS.some((kw) => normalized === kw.toLowerCase())
  }

  async handleFollow(lineUserId: string, replyToken: string): Promise<void> {
    const message = `${BOT_INTRO}

📝 กรุณาสมัครสมาชิกก่อนใช้งาน โดยพิมพ์ "สมัคร" นะคะ

หรือกรอกผ่านหน้าสมัคร: ${this.getRegisterUrl(lineUserId)}`

    await lineService.reply(replyToken, message)
  }

  async handleRegisterCommand(lineUserId: string): Promise<string> {
    const user = await userRepository.findByLineUserId(lineUserId)

    if (user?.is_registered) {
      return `✅ คุณสมัครสมาชิกแล้วค่ะ\n\nชื่อ: ${user.full_name}\nเบอร์: ${user.phone}`
    }

    await userRepository.startRegistration(lineUserId)

    return `📝 เริ่มสมัครสมาชิกนะคะ\n\nกรุณาพิมพ์ชื่อ-นามสกุลของคุณ\n\nหรือกรอกผ่านหน้าสมัคร: ${this.getRegisterUrl(lineUserId)}\n\n(พิมพ์ "ยกเลิก" เพื่อยกเลิก)`
  }

  async handleRegistrationInput(lineUserId: string, text: string, user: User): Promise<string | null> {
    if (!user.registration_step) return null

    if (this.isCancelCommand(text)) {
      await userRepository.updateRegistrationStep(lineUserId, null)
      return '❌ ยกเลิกการสมัครแล้วค่ะ พิมพ์ "สมัคร" เมื่อต้องการสมัครใหม่'
    }

    if (user.registration_step === 'awaiting_name') {
      const name = text.trim()
      if (name.length < 2) {
        return '⚠️ กรุณาพิมพ์ชื่อ-นามสกุลให้ถูกต้อง (อย่างน้อย 2 ตัวอักษร)'
      }

      await userRepository.updateRegistrationStep(lineUserId, 'awaiting_phone', { full_name: name })
      return `✅ บันทึกชื่อ: ${name}\n\n📱 กรุณาพิมพ์เบอร์โทรศัพท์ของคุณ\n(เช่น 0812345678)`
    }

    if (user.registration_step === 'awaiting_phone') {
      const phone = this.normalizePhone(text)
      if (!this.isValidPhone(phone)) {
        return '⚠️ เบอร์โทรไม่ถูกต้อง กรุณาพิมพ์เบอร์ 10 หลัก เช่น 0812345678'
      }

      const completed = await userRepository.completeRegistration({
        lineUserId,
        fullName: user.full_name!,
        phone,
      })

      return this.formatSuccessMessage(completed)
    }

    return null
  }

  async registerFromWeb(lineUserId: string, fullName: string, phone: string): Promise<User> {
    const normalizedPhone = this.normalizePhone(phone)
    if (!this.isValidPhone(normalizedPhone)) {
      throw new Error('INVALID_PHONE')
    }
    if (fullName.trim().length < 2) {
      throw new Error('INVALID_NAME')
    }

    return userRepository.completeRegistration({
      lineUserId,
      fullName: fullName.trim(),
      phone: normalizedPhone,
    })
  }

  formatSuccessMessage(user: User): string {
    return `🎉 สมัครสมาชิกสำเร็จค่ะ!

👤 ชื่อ: ${user.full_name}
📱 เบอร์: ${user.phone}


พร้อมใช้งานแล้วค่ะ! ส่งข้อความงานมาได้เลย หรือพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งนะคะ`
  }

  getNotRegisteredMessage(lineUserId: string): string {
    return `⚠️ กรุณาสมัครสมาชิกก่อนใช้งานนะคะ

พิมพ์ "สมัคร" เพื่อเริ่มสมัคร
หรือกรอกผ่านหน้าสมัคร: ${this.getRegisterUrl(lineUserId)}`
  }

  private normalizePhone(input: string): string {
    return input.trim().replace(/[\s-]/g, '')
  }

  private isValidPhone(phone: string): boolean {
    return /^0\d{9}$/.test(phone)
  }
}

export const registrationService = new RegistrationService()
