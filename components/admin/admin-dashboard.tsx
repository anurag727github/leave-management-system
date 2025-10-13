"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { LeaveRequestsTable } from "@/components/leave-requests-table"
import { useLeaveRequests, useUsers, approveRejectRequest } from "@/lib/db"
import type { LeaveRequest } from "@/lib/types"

type Filters = {
  query: string
  status: "all" | "pending" | "approved" | "rejected" | "canceled"
  type: "all" | "Paid" | "Sick" | "Casual"
  userId: "all" | string
  start?: string
  end?: string
}

export function AdminDashboard() {
  const { data: requests } = useLeaveRequests()
  const { data: users } = useUsers()
  const { toast } = useToast()

  const [filters, setFilters] = useState<Filters>({
    query: "",
    status: "all",
    type: "all",
    userId: "all",
    start: undefined,
    end: undefined,
  })

  const filtered = useMemo(() => {
    const start = filters.start ? new Date(filters.start) : null
    const end = filters.end ? new Date(filters.end) : null
    return (requests || [])
      .filter((r) => {
        if (filters.status !== "all" && r.status !== filters.status) return false
        if (filters.type !== "all" && r.type !== filters.type) return false
        if (filters.userId !== "all" && r.userId !== filters.userId) return false
        if (start && new Date(r.startDate) < start) return false
        if (end && new Date(r.endDate) > end) return false
        if (filters.query) {
          const q = filters.query.toLowerCase()
          const user = users?.find((u) => u.id === r.userId)
          const hay = [user?.username, r.reason, r.type, r.status].join(" ").toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }, [requests, users, filters])

  const onApproveReject = (req: LeaveRequest, status: "approved" | "rejected") => {
    const ok = approveRejectRequest(req.id, status)
    if (!ok) {
      toast({
        title: "Insufficient balance",
        description: "Employee does not have enough leave balance.",
        variant: "destructive",
      })
      return
    }
    toast({ title: `Request ${status}` })
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage leave requests</CardTitle>
          <CardDescription>Search and filter, then approve or reject</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-5 gap-3">
            <Input
              placeholder="Search by employee, reason, status…"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
            />
            <select
              className="h-10 px-3 rounded-md border bg-background"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border bg-background"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as Filters["type"] }))}
            >
              <option value="all">All types</option>
              <option value="Paid">Paid</option>
              <option value="Sick">Sick</option>
              <option value="Casual">Casual</option>
            </select>
            <select
              className="h-10 px-3 rounded-md border bg-background"
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value as Filters["userId"] }))}
            >
              <option value="all">All employees</option>
              {(users || [])
                .filter((u) => u.role === "employee")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="h-10 px-3 rounded-md border bg-background"
                value={filters.start || ""}
                onChange={(e) => setFilters((f) => ({ ...f, start: e.target.value || undefined }))}
              />
              <input
                type="date"
                className="h-10 px-3 rounded-md border bg-background"
                value={filters.end || ""}
                onChange={(e) => setFilters((f) => ({ ...f, end: e.target.value || undefined }))}
              />
            </div>
          </div>

          <LeaveRequestsTable
            requests={filtered}
            showUser
            onEdit={undefined}
            onDelete={undefined}
            onApproveReject={onApproveReject}
          />
        </CardContent>
      </Card>
    </div>
  )
}
