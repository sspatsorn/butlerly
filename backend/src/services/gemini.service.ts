import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env'
import { BOT_NAME } from '../config/bot-persona'
import { parseRuleBasedIntent } from './intent.parser'
import type { ParsedIntent } from '../types'

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)

const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash']

const SYSTEM_PROMPT = `คุณชื่อ ${BOT_NAME} เป็นเลขาส่วนตัวผู้หญิงที่วิเคราะห์ข้อความภาษาไทยและอังกฤษเพื่อจัดการงาน (Task)
ใช้น้ำเสียงสุภาพแบบผู้หญิง (ค่ะ/คะ) ใน responseMessage

วิเคราะห์ข้อความและตอบเป็น JSON เท่านั้น ไม่มีข้อความอื่น

Intent types:
- create_task: สร้างงานใหม่ (ส่งข้อความงาน, forward งาน)
- list_tasks: ดูรายการงาน (เช่น "วันนี้มีงานอะไร" = งานวันนี้, "งานอะไรบ้าง" = งานทั้งหมดทั้งเสร็จและไม่เสร็จ)
- complete_task: ทำเครื่องหมายงานเสร็จ (เช่น "งานนี้เสร็จแล้ว", "เสร็จแล้ว")
- reschedule_task: เลื่อน deadline (เช่น "เลื่อนไปพรุ่งนี้", "เลื่อนไปวันจันทร์")
- set_reminder: ตั้งเตือน (เช่น "เตือนอีก 30 นาที", "เตือนพรุ่งนี้ 9 โมง")
- help: ขอความช่วยเหลือ
- unknown: ไม่เข้าใจ

JSON format:
{
  "intent": "create_task|list_tasks|complete_task|reschedule_task|set_reminder|help|unknown",
  "taskTitle": "ชื่องาน (ถ้ามี)",
  "description": "รายละเอียดงาน",
  "deadline": "ISO 8601 datetime หรือ null",
  "newDeadline": "ISO 8601 สำหรับ reschedule",
  "reminderMinutes": 30,
  "checklist": ["รายการ 1", "รายการ 2"],
  "responseMessage": "ข้อความตอบกลับสั้นๆ ภาษาไทย"
}

กฎ:
- วันนี้ = ${new Date().toISOString().split('T')[0]}
- เวลาปัจจุบัน = ${new Date().toISOString()}
- timezone: Asia/Bangkok (UTC+7)
- พรุ่งนี้ = วันถัดไป เวลา 09:00
- ถ้าเป็นข้อความงานยาวๆ หรือ forward ให้ intent = create_task
- สร้าง checklist จากรายละเอียดงานถ้ามีหลายขั้นตอน
- แยก deadline จากข้อความถ้ามี เช่น "ส่งรายงานพรุ่งนี้ 17:00"
- "งานนี้เสร็จแล้ว" หรือ "เสร็จแล้ว" อย่างเดียว = complete_task โดยไม่ต้องใส่ชื่องาน
- "เลื่อนไปพรุ่งนี้" อย่างเดียว = reschedule_task งานล่าสุด
- "เตือนอีก 30 นาที" อย่างเดียว = set_reminder งานล่าสุด`

export class GeminiService {
  async parseIntent(message: string): Promise<ParsedIntent> {
    const ruleBased = parseRuleBasedIntent(message)
    if (ruleBased) return ruleBased

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent([
          { text: SYSTEM_PROMPT },
          { text: `ข้อความผู้ใช้: "${message}"` },
        ])

        const text = result.response.text()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) continue

        const parsed = JSON.parse(jsonMatch[0]) as ParsedIntent
        return parsed
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error(`Gemini [${modelName}] error:`, msg.split('\n')[0])

        if (msg.includes('429')) continue
        if (msg.includes('404')) continue
      }
    }

    // Fallback: treat as new task if message is substantial
    if (message.trim().length >= 3) {
      return { intent: 'create_task', taskTitle: message.slice(0, 100), description: message }
    }

    return { intent: 'unknown', responseMessage: 'ขออภัยค่ะ ดิฉันไม่เข้าใจข้อความ ลองพิมพ์ "ช่วยเหลือ" เพื่อดูคำสั่งที่ใช้ได้นะคะ' }
  }
}

export const geminiService = new GeminiService()
