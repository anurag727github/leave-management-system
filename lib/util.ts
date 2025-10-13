export function uid(prefix = ""): string {
  return `${prefix}${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function countDaysInclusive(start: Date, end: Date): number {
  const s = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
  const e = new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()))
  const diff = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1
  return isNaN(diff) ? 0 : Math.max(diff, 0)
}
