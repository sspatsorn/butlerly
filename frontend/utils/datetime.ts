export const BANGKOK_TZ = 'Asia/Bangkok'
export const BUDDHA_YEAR_OFFSET = 543

export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + BUDDHA_YEAR_OFFSET
}

export function formatThaiBuddhistDateTime(date: Date): string {
  return date.toLocaleString('th-TH', {
    timeZone: BANGKOK_TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function dateToBangkokIso(date: Date | null): string | null {
  if (!date) return null
  const datePart = date.toLocaleDateString('en-CA', { timeZone: BANGKOK_TZ })
  const timePart = date.toLocaleTimeString('en-GB', {
    timeZone: BANGKOK_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${datePart}T${timePart}:00+07:00`
}

export function isoToDate(iso: string | null): Date | null {
  if (!iso) return null
  return new Date(iso)
}
