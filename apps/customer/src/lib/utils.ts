import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Dashboard state utilities
export type DashboardState = 
  | "loading" 
  | "no-week" 
  | "cooking-day" 
  | "shopping-day" 
  | "list-review" 
  | "list-finalized"

export function getDayOfWeek(): number {
  const today = new Date()
  return today.getDay() // 0 = Sunday, 1 = Monday, etc
}

export function getTodayLabel(): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[getDayOfWeek()]
}

export function formatDayLabel(date: Date): string {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
  return days[date.getDay()]
}

export function getCurrentWeek(): { week: number; year: number } {
  const today = new Date()
  const utcDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const day = utcDate.getUTCDay() || 7

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return { week, year: utcDate.getUTCFullYear() }
}

export function getGreeting(userName: string | null = "Sam"): string {
  const name = userName || "Stranger"
  const firstName = name.split(" ")[0]
  return `Hey, ${firstName} 👋`
}

export function dateToIsoWeek(date: Date): { week: number; year: number } {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { week, year: utcDate.getUTCFullYear() }
}

export function getWeekAtOffset(offsetWeeks: number): { week: number; year: number } {
  const today = new Date()
  const future = new Date(today)
  future.setDate(today.getDate() + offsetWeeks * 7)
  return dateToIsoWeek(future)
}

export function getWeekMondayDate(week: number, year: number): Date {
  const jan4 = new Date(year, 0, 4)
  const dow = jan4.getDay() === 0 ? 7 : jan4.getDay()
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - dow + 1 + (week - 1) * 7)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getWeekLabel(week: number, year: number): string {
  const monday = getWeekMondayDate(week, year)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function getRelativeWeekLabel(week: number, year: number): string {
  const current = getCurrentWeek()
  if (week === current.week && year === current.year) return "This week"
  const next = getWeekAtOffset(1)
  if (week === next.week && year === next.year) return "Next week"
  const prev = getWeekAtOffset(-1)
  if (week === prev.week && year === prev.year) return "Last week"
  return getWeekLabel(week, year)
}
