"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import type { LeaveRequest, User } from "@/lib/types"
import { useUsers } from "@/lib/db"

export function LeaveRequestsTable({
  requests,
  showUser,
  onEdit,
  onDelete,
  onApproveReject,
}: {
  requests: LeaveRequest[]
  showUser: boolean
  onEdit?: (req: LeaveRequest) => void
  onDelete?: (req: LeaveRequest) => void
  onApproveReject?: (req: LeaveRequest, status: "approved" | "rejected") => void
}) {
  const { data: users } = useUsers()

  const getUser = (id: string): User | undefined => (users || []).find((u) => u.id === id)

  return (
    <div className="overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-secondary text-secondary-foreground">
          <tr>
            {showUser && <Th>Employee</Th>}
            <Th>Type</Th>
            <Th>Start</Th>
            <Th>End</Th>
            <Th>Days</Th>
            <Th>Reason</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {requests.length === 0 && (
            <tr>
              <td className="p-3 text-muted-foreground text-center" colSpan={showUser ? 8 : 7}>
                No requests found.
              </td>
            </tr>
          )}
          {requests.map((r) => (
            <tr key={r.id} className="border-t">
              {showUser && <Td>{getUser(r.userId)?.username || "—"}</Td>}
              <Td>{r.type}</Td>
              <Td>{r.startDate.slice(0, 10)}</Td>
              <Td>{r.endDate.slice(0, 10)}</Td>
              <Td>{r.days}</Td>
              <Td className="max-w-[20ch] truncate" title={r.reason}>
                {r.reason || "—"}
              </Td>
              <Td>
                <span
                  className="inline-flex items-center rounded-md px-2 py-1 text-xs"
                  style={{
                    background:
                      r.status === "approved"
                        ? "var(--color-accent)"
                        : r.status === "rejected"
                          ? "var(--color-destructive)"
                          : "var(--color-secondary)",
                    color:
                      r.status === "approved"
                        ? "var(--color-accent-foreground)"
                        : r.status === "rejected"
                          ? "var(--color-destructive-foreground)"
                          : "var(--color-secondary-foreground)",
                  }}
                >
                  {r.status}
                </span>
              </Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {onEdit && r.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
                      Edit
                    </Button>
                  )}
                  {onDelete && r.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => onDelete(r)}>
                      Cancel
                    </Button>
                  )}
                  {onApproveReject && r.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => onApproveReject(r, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => onApproveReject(r, "rejected")}>
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-medium px-3 py-2">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>
}
