"use client"

import type { LeaveRequest, User, AppNotification } from "./types"
import { hashPassword, timingSafeEqual } from "./crypto"
import { uid, countDaysInclusive } from "./util"
import { useLocalStorageSWR } from "./swr-local"

const USERS_KEY = "elm_users"
const CURRENT_USER_KEY = "elm_current_user"
const REQUESTS_KEY = "elm_leave_requests"
const NOTIFICATIONS_KEY = "elm_notifications"

// SWR hooks
export function useUsers() {
  return useLocalStorageSWR<User[]>(USERS_KEY)
}
export function useCurrentUser() {
  return useLocalStorageSWR<User | null>(CURRENT_USER_KEY)
}
export function useLeaveRequests() {
  return useLocalStorageSWR<LeaveRequest[]>(REQUESTS_KEY)
}
export function useNotifications() {
  return useLocalStorageSWR<AppNotification[]>(NOTIFICATIONS_KEY)
}

// helpers
function readUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as User[]
  } catch {
    return []
  }
}
function writeUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}
function readRequests(): LeaveRequest[] {
  try {
    return JSON.parse(localStorage.getItem(REQUESTS_KEY) || "[]") as LeaveRequest[]
  } catch {
    return []
  }
}
function writeRequests(reqs: LeaveRequest[]) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(reqs))
}
function readCurrentUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || "null") as User | null
  } catch {
    return null
  }
}
function readNotifications(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY) || "[]") as AppNotification[]
  } catch {
    return []
  }
}
function writeNotifications(notifs: AppNotification[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifs))
}

export function setCurrentUser(user: User | null) {
  if (user) localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
  else localStorage.removeItem(CURRENT_USER_KEY)
}
export function logout() {
  setCurrentUser(null)
}

export async function ensureSeeded() {
  const users = readUsers()
  if (users.length > 0) return
  const adminPw = await hashPassword("admin123")
  const empPw = await hashPassword("password123")
  const now = new Date().toISOString()
  const seeded: User[] = [
    {
      id: uid("u_"),
      username: "admin",
      passwordHash: adminPw.hashHex,
      salt: adminPw.saltHex,
      role: "admin",
      leaveBalance: 0,
      createdAt: now,
    },
    {
      id: uid("u_"),
      username: "employee",
      passwordHash: empPw.hashHex,
      salt: empPw.saltHex,
      role: "employee",
      leaveBalance: 20, // default balance
      createdAt: now,
    },
  ]
  writeUsers(seeded)
  writeRequests([])
  writeNotifications([])
}

export async function verifyLogin(username: string, password: string): Promise<User | null> {
  const users = readUsers()
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase())
  if (!user) return null
  const { hashHex } = await hashPassword(password, user.salt)
  if (!timingSafeEqual(hashHex, user.passwordHash)) return null
  // do not expose password fields when storing current user in client state
  const { passwordHash, salt, ...sanitized } = user
  return sanitized as User
}

// Leave requests
export function addLeaveRequest(input: {
  userId: string
  type: LeaveRequest["type"]
  startDate: string
  endDate: string
  reason: string
}) {
  const all = readRequests()
  const days = countDaysInclusive(new Date(input.startDate), new Date(input.endDate))
  const now = new Date().toISOString()
  const req: LeaveRequest = {
    id: uid("r_"),
    userId: input.userId,
    type: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    days,
    reason: input.reason,
    status: "pending",
    createdAt: now,
  }
  all.push(req)
  writeRequests(all)
}

export function updateLeaveRequest(id: string, patch: Partial<LeaveRequest>) {
  const all = readRequests()
  const idx = all.findIndex((r) => r.id === id)
  if (idx === -1) return
  const updated = { ...all[idx], ...patch }
  // Recompute days if dates changed
  if (patch.startDate || patch.endDate) {
    updated.days = countDaysInclusive(new Date(updated.startDate), new Date(updated.endDate))
  }
  all[idx] = updated
  writeRequests(all)
}

export function deleteLeaveRequest(id: string) {
  const all = readRequests().filter((r) => r.id !== id)
  writeRequests(all)
}

export function approveRejectRequest(id: string, status: "approved" | "rejected"): boolean {
  const reqs = readRequests()
  const users = readUsers()
  const idx = reqs.findIndex((r) => r.id === id)
  if (idx === -1) return false
  const r = reqs[idx]
  if (r.status !== "pending") return false

  if (status === "approved") {
    const uidx = users.findIndex((u) => u.id === r.userId)
    if (uidx === -1) return false
    const u = users[uidx]
    if (u.leaveBalance < r.days) {
      return false
    }
    users[uidx] = { ...u, leaveBalance: u.leaveBalance - r.days }
    writeUsers(users)
    const current = readCurrentUser()
    if (current && current.id === u.id) {
      setCurrentUser({ ...current, leaveBalance: users[uidx].leaveBalance })
    }
  }

  reqs[idx] = { ...r, status, updatedAt: new Date().toISOString() }
  writeRequests(reqs)

  const start = r.startDate.slice(0, 10)
  const end = r.endDate.slice(0, 10)
  const message = `Your ${r.type} leave (${start} to ${end}) was ${status}.`
  pushNotificationForUser(r.userId, status === "approved" ? "leave-approved" : "leave-rejected", message)

  return true
}

export function pushNotificationForUser(userId: string, kind: AppNotification["kind"], message: string) {
  const all = readNotifications()
  const notif: AppNotification = {
    id: uid("n_"),
    userId,
    kind,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
  all.push(notif)
  writeNotifications(all)
}

export function markNotificationRead(id: string) {
  const all = readNotifications()
  const idx = all.findIndex((n) => n.id === id)
  if (idx !== -1) {
    all[idx] = { ...all[idx], read: true }
    writeNotifications(all)
  }
}

export function markAllNotificationsRead(userId: string) {
  const all = readNotifications().map((n) => (n.userId === userId ? { ...n, read: true } : n))
  writeNotifications(all)
}
