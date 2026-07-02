const BANGKOK_TZ = 'Asia/Bangkok'

export interface ParsedSchedule {
  remindAt: Date
  taskTitle: string
}

function bangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BANGKOK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0'
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    weekday: get('weekday'),
  }
}

function toBangkokIso(year: number, month: number, day: number, hour: number, minute: number): Date {
  // Build Bangkok local time, return as UTC Date
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+07:00`
  return new Date(iso)
}

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
}

const THAI_WEEKDAY: Record<string, number> = {
  อาทิตย์: 0,
  จันทร์: 1,
  อังคาร: 2,
  พุธ: 3,
  พฤหัส: 4,
  ศุกร์: 5,
  เสาร์: 6,
}

function addDays(year: number, month: number, day: number, days: number) {
  const d = toBangkokIso(year, month, day, 12, 0)
  d.setUTCDate(d.getUTCDate() + days)
  const p = bangkokParts(d)
  return { year: p.year, month: p.month, day: p.day }
}

function nextWeekday(year: number, month: number, day: number, target: number) {
  const base = toBangkokIso(year, month, day, 12, 0)
  const current = bangkokParts(base).weekday.toLowerCase().slice(0, 3)
  const currentDay = WEEKDAY_MAP[current] ?? 0
  let diff = target - currentDay
  if (diff <= 0) diff += 7
  return addDays(year, month, day, diff)
}

function parseHourMinute(text: string): { hour: number; minute: number } | null {
  const lower = text.toLowerCase()

  const hm = lower.match(/(?:ตอน|เวลา)?\s*(\d{1,2})[:\.](\d{2})\s*(?:น\.?)?/)
  if (hm) {
    return { hour: parseInt(hm[1], 10), minute: parseInt(hm[2], 10) }
  }

  const hOnly = lower.match(/(?:ตอน|เวลา)?\s*(\d{1,2})\s*น\.?(?:\s|$)/)
  if (hOnly) {
    return { hour: parseInt(hOnly[1], 10), minute: 0 }
  }

  const thaiHour = lower.match(/(\d{1,2})\s*โมง(?:เช้า)?/)
  if (thaiHour) {
    let h = parseInt(thaiHour[1], 10)
    if (h >= 1 && h <= 6 && !/เช้า/.test(lower)) h += 12
    return { hour: h, minute: 0 }
  }

  const thum = lower.match(/(\d{1,2})\s*ทุ่ม/)
  if (thum) {
    return { hour: parseInt(thum[1], 10) + 18, minute: 0 }
  }

  const thaiThum: Record<string, number> = {
    หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5,
    หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9, สิบ: 10,
    เอ็ด: 1, ยี่: 2,
  }
  const thumWord = lower.match(/(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ยี่|เอ็ด)\s*ทุ่ม/)
  if (thumWord) {
    const n = thaiThum[thumWord[1]] ?? 0
    if (n > 0) return { hour: n + 18, minute: 0 }
  }

  if (/สามทุ่ม/.test(lower)) return { hour: 21, minute: 0 }
  if (/สองทุ่ม/.test(lower)) return { hour: 20, minute: 0 }
  if (/หนึ่งทุ่ม|เอ็ดทุ่ม/.test(lower)) return { hour: 19, minute: 0 }

  if (/เที่ยงคืน/.test(lower)) return { hour: 0, minute: 0 }
  if (/เที่ยงวัน|เที่ยง/.test(lower)) return { hour: 12, minute: 0 }

  return null
}

function parseRelativeMinutes(text: string): number | null {
  const m = text.match(/(?:อีก|ใน)\s*(\d+)\s*นาที/)
  return m ? parseInt(m[1], 10) : null
}

function parseRelativeHours(text: string): number | null {
  const m = text.match(/(?:อีก|ใน)\s*(\d+)\s*(?:ชม\.?|ชั่วโมง)/)
  return m ? parseInt(m[1], 10) : null
}

function resolveDate(text: string, now = bangkokParts()) {
  const lower = text.toLowerCase()

  if (/มะรืน/.test(lower)) {
    return addDays(now.year, now.month, now.day, 2)
  }
  if (/พรุ่งนี้|วันพรุ่งนี้/.test(lower)) {
    return addDays(now.year, now.month, now.day, 1)
  }
  if (/วันนี้/.test(lower)) {
    return { year: now.year, month: now.month, day: now.day }
  }

  for (const [name, dow] of Object.entries(THAI_WEEKDAY)) {
    if (new RegExp(`วัน${name}`).test(lower)) {
      return nextWeekday(now.year, now.month, now.day, dow)
    }
  }

  const dm = lower.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (dm) {
    const day = parseInt(dm[1], 10)
    const month = parseInt(dm[2], 10)
    let year = dm[3] ? parseInt(dm[3], 10) : now.year
    if (year < 100) year += 2000
    return { year, month, day }
  }

  return { year: now.year, month: now.month, day: now.day }
}

function cleanTaskTitle(text: string): string {
  let title = text.trim()

  title = title
    .replace(/^สร้าง\s*/i, '')
    .replace(/แจ้งเตือน/gi, '')
    .replace(/ตั้งเตือน/gi, '')
    .replace(/^(ช่วย)?เตือน(?:ให้)?(?:ฉัน|ผม)?(?:อีก)?/i, '')
    .replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*นาที\s*/i, '')
    .replace(/^(ช่วย)?เตือน(?:ฉัน|ผม)?(?:อีก)?\s*\d+\s*(?:ชม\.?|ชั่วโมง)\s*/i, '')
    .replace(/ให้ฉัน|ให้ผม/gi, '')
    .replace(/วันนี้|พรุ่งนี้|วันพรุ่งนี้|มะรืน/gi, '')
    .replace(/วัน(?:อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัส(?:บดี)?|ศุกร์|เสาร์)/gi, '')
    .replace(/ตอน|เวลา/gi, '')
    .replace(/\d{1,2}[:\.]\d{2}\s*น\.?/gi, '')
    .replace(/\d{1,2}\s*น\.?(?:\s|$)/gi, '')
    .replace(/\d{1,2}\s*โมง(?:เช้า)?/gi, '')
    .replace(/\d{1,2}\s*ทุ่ม/gi, '')
    .replace(/เที่ยงคืน|เที่ยงวัน|เที่ยง/gi, '')
    .replace(/(?:อีก|ใน)\s*\d+\s*(?:นาที|ชม\.?|ชั่วโมง)/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (/^\d+\s*(?:นาที|ชม\.?|ชั่วโมง)$/.test(title)) return ''

  return title || ''
}

export function formatThaiDateTime(date: Date): string {
  return date.toLocaleString('th-TH', {
    timeZone: BANGKOK_TZ,
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function isReminderLikeMessage(text: string): boolean {
  const lower = text.toLowerCase()
  return /แจ้งเตือน|สร้างแจ้งเตือน|ตั้งเตือน|ช่วยเตือน|^เตือน/.test(lower)
    || /(?:อีก|ใน)\s*\d+\s*(?:นาที|ชม\.?|ชั่วโมง)/.test(lower)
    || /\d{1,2}[:\.]\d{2}\s*น\.?/.test(lower)
    || /\d{1,2}\s*ทุ่ม/.test(lower)
    || /[หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าสิบยี่เอ็ด]+\s*ทุ่ม/.test(lower)
}

export function parseScheduleFromText(text: string, reference = new Date()): ParsedSchedule | null {
  const now = bangkokParts(reference)
  const lower = text.toLowerCase()

  const relativeMinutes = parseRelativeMinutes(text)
  if (relativeMinutes !== null) {
    const remindAt = new Date(reference.getTime() + relativeMinutes * 60 * 1000)
    const taskTitle = cleanTaskTitle(text)
    return { remindAt, taskTitle }
  }

  const relativeHours = parseRelativeHours(text)
  if (relativeHours !== null) {
    const remindAt = new Date(reference.getTime() + relativeHours * 60 * 60 * 1000)
    return { remindAt, taskTitle: cleanTaskTitle(text) }
  }

  const time = parseHourMinute(text)
  if (!time) return null

  const date = resolveDate(text, now)
  let remindAt = toBangkokIso(date.year, date.month, date.day, time.hour, time.minute)

  // ถ้าไม่ระบุวันและเวลาผ่านไปแล้ว → เลื่อนเป็นพรุ่งนี้
  if (!/วันนี้|พรุ่งนี้|มะรืน|วัน(?:อาทิตย์|จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์)|\d{1,2}[\/\-]\d{1,2}/.test(lower)) {
    if (remindAt.getTime() <= reference.getTime()) {
      const tomorrow = addDays(date.year, date.month, date.day, 1)
      remindAt = toBangkokIso(tomorrow.year, tomorrow.month, tomorrow.day, time.hour, time.minute)
    }
  }

  if (remindAt.getTime() <= reference.getTime()) {
    return null
  }

  return { remindAt, taskTitle: cleanTaskTitle(text) }
}
