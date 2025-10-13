"use client"

import { useMemo } from "react"
import type { LeaveRequest } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

export function LeaveHistoryChart({ requests }: { requests: LeaveRequest[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of requests) {
      if (r.status !== "approved") continue
      const d = new Date(r.startDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map.set(key, (map.get(key) || 0) + r.days)
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([month, days]) => ({ month, days }))
  }, [requests])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leave history</CardTitle>
          <CardDescription>Approved days per month</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No approved leave yet.</CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave history</CardTitle>
        <CardDescription>Approved days per month</CardDescription>
      </CardHeader>
      <CardContent style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="days" stroke="var(--color-primary)" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
