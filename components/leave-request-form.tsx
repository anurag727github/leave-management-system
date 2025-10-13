"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { addLeaveRequest, useCurrentUser } from "@/lib/db"
import { countDaysInclusive } from "@/lib/util"

export function LeaveRequestForm() {
  const { data: user } = useCurrentUser()
  const { toast } = useToast()

  const [type, setType] = useState<"Paid" | "Sick" | "Casual">("Paid")
  const [reason, setReason] = useState("")
  const [start, setStart] = useState<string>("")
  const [end, setEnd] = useState<string>("")

  const days = useMemo(() => {
    if (!start || !end) return 0
    return countDaysInclusive(new Date(start), new Date(end))
  }, [start, end])

  const exceedsBalance = user ? days > user.leaveBalance : false

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request leave</CardTitle>
        <CardDescription>Create a new leave request</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid md:grid-cols-5 gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!user) return
            if (!start || !end) {
              toast({ title: "Please select dates", variant: "destructive" })
              return
            }
            if (days <= 0) {
              toast({ title: "Invalid date range", variant: "destructive" })
              return
            }
            if (exceedsBalance) {
              toast({
                title: "Insufficient balance",
                description: "Your requested days exceed your available balance.",
                variant: "destructive",
              })
              return
            }
            addLeaveRequest({
              userId: user.id,
              type,
              startDate: new Date(start).toISOString(),
              endDate: new Date(end).toISOString(),
              reason: reason.trim(),
            })
            setReason("")
            setStart("")
            setEnd("")
            setType("Paid")
            toast({ title: "Leave request submitted", description: "Status: pending" })
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="type">Leave type</Label>
            <select
              id="type"
              className="h-10 px-3 rounded-md border bg-background"
              value={type}
              onChange={(e) => setType(e.target.value as any)}
            >
              <option value="Paid">Paid</option>
              <option value="Sick">Sick</option>
              <option value="Casual">Casual</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional reason"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="start">Start date</Label>
            <Input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end">End date</Label>
            <Input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="grid items-end">
            <Button type="submit" disabled={!user || days <= 0 || exceedsBalance}>
              Submit {days > 0 ? `(${days} day${days > 1 ? "s" : ""})` : ""}
            </Button>
            {exceedsBalance && <p className="text-sm text-destructive mt-2">Requested days exceed balance.</p>}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
