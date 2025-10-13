"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { LeaveRequestForm } from "@/components/leave-request-form"
import { LeaveRequestsTable } from "@/components/leave-requests-table"
import { LeaveHistoryChart } from "@/components/leave-history-chart"
import { useCurrentUser, useLeaveRequests, updateLeaveRequest, deleteLeaveRequest } from "@/lib/db"
import { useNotifications, markAllNotificationsRead, markNotificationRead } from "@/lib/db"
import type { LeaveRequest } from "@/lib/types"

export function EmployeeDashboard() {
  const { data: currentUser } = useCurrentUser()
  const { data: requests } = useLeaveRequests()
  const { data: allNotifs } = useNotifications()
  const { toast } = useToast()
  const [editing, setEditing] = useState<LeaveRequest | null>(null)

  const myNotifications = useMemo(
    () =>
      (allNotifs || [])
        .filter((n) => n.userId === currentUser?.id)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [allNotifs, currentUser?.id],
  )
  const unreadCount = useMemo(() => myNotifications.filter((n) => !n.read).length, [myNotifications])

  const myRequests = useMemo(
    () =>
      (requests || []).filter((r) => r.userId === currentUser?.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [requests, currentUser?.id],
  )

  const approvedDays = useMemo(
    () => myRequests.filter((r) => r.status === "approved").reduce((acc, r) => acc + r.days, 0),
    [myRequests],
  )

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Leave balance</CardTitle>
            <CardDescription>Remaining days</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{currentUser?.leaveBalance ?? 0} days</p>
            {currentUser && currentUser.leaveBalance <= 3 && (
              <p className="text-sm text-destructive mt-2">Low balance. Consider planning accordingly.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Approved leave</CardTitle>
            <CardDescription>All time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{approvedDays} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status overview</CardTitle>
            <CardDescription>Latest requests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Pending: {myRequests.filter((r) => r.status === "pending").length || 0} • Approved:{" "}
              {myRequests.filter((r) => r.status === "approved").length || 0} • Rejected:{" "}
              {myRequests.filter((r) => r.status === "rejected").length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Approvals and rejections</CardDescription>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                if (!currentUser) return
                markAllNotificationsRead(currentUser.id)
              }}
            >
              Mark all read ({unreadCount})
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {myNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="grid gap-2">
              {myNotifications.slice(0, 6).map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                  aria-live="polite"
                >
                  <div>
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                  {!n.read ? (
                    <Button size="sm" variant="outline" onClick={() => markNotificationRead(n.id)}>
                      Mark read
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Read</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LeaveRequestForm />

      <Card>
        <CardHeader>
          <CardTitle>My leave requests</CardTitle>
          <CardDescription>View, edit or cancel pending requests</CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveRequestsTable
            requests={myRequests}
            showUser={false}
            onEdit={(req) => setEditing(req)}
            onDelete={(req) => {
              if (req.status !== "pending") return
              deleteLeaveRequest(req.id)
              toast({ title: "Request canceled" })
            }}
            onApproveReject={undefined}
          />
        </CardContent>
      </Card>

      <LeaveHistoryChart requests={myRequests} />

      {editing && (
        <EditSheet
          request={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            updateLeaveRequest(updated.id, updated)
            setEditing(null)
            toast({ title: "Request updated" })
          }}
        />
      )}
    </div>
  )
}

function EditSheet({
  request,
  onClose,
  onSave,
}: {
  request: LeaveRequest
  onClose: () => void
  onSave: (r: LeaveRequest) => void
}) {
  const [form, setForm] = useState<LeaveRequest>({ ...request })
  const disabled = request.status !== "pending"

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-lg bg-card text-card-foreground border p-4 grid gap-4">
        <header className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit request</h3>
          <Button variant="ghost" onClick={onClose} aria-label="Close">
            Close
          </Button>
        </header>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="grid gap-2">
            <label className="text-sm" htmlFor="type">
              Leave type
            </label>
            <select
              id="type"
              className="h-10 px-3 rounded-md border bg-background"
              value={form.type}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LeaveRequest["type"] }))}
            >
              <option value="Paid">Paid</option>
              <option value="Sick">Sick</option>
              <option value="Casual">Casual</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm" htmlFor="reason">
              Reason
            </label>
            <input
              id="reason"
              className="h-10 px-3 rounded-md border bg-background"
              value={form.reason}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm" htmlFor="start">
              Start date
            </label>
            <input
              id="start"
              type="date"
              className="h-10 px-3 rounded-md border bg-background"
              value={form.startDate.slice(0, 10)}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, startDate: new Date(e.target.value).toISOString() }))}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm" htmlFor="end">
              End date
            </label>
            <input
              id="end"
              type="date"
              className="h-10 px-3 rounded-md border bg-background"
              value={form.endDate.slice(0, 10)}
              disabled={disabled}
              onChange={(e) => setForm((f) => ({ ...f, endDate: new Date(e.target.value).toISOString() }))}
            />
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ ...form, updatedAt: new Date().toISOString() })} disabled={disabled}>
            Save changes
          </Button>
        </footer>
      </div>
    </div>
  )
}
