export type Role = "employee" | "admin"

export type User = {
  id: string
  username: string
  passwordHash: string
  salt: string
  role: Role
  leaveBalance: number
  createdAt: string
}

export type LeaveRequest = {
  id: string
  userId: string
  type: "Paid" | "Sick" | "Casual"
  startDate: string // ISO
  endDate: string // ISO
  days: number
  reason: string
  status: "pending" | "approved" | "rejected" | "canceled"
  createdAt: string
  updatedAt?: string
}

export type AppNotification = {
  id: string
  userId: string
  kind: "leave-approved" | "leave-rejected"
  message: string
  createdAt: string
  read: boolean
}
