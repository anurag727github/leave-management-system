"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useCurrentUser, logout, ensureSeeded } from "@/lib/db"
import { EmployeeDashboard } from "@/components/employee/employee-dashboard"
import { AdminDashboard } from "@/components/admin/admin-dashboard"
import { LoginForm } from "@/components/auth/login-form"

export default function Page() {
  const { data: currentUser, mutate } = useCurrentUser()
  const { toast } = useToast()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureSeeded().finally(() => setReady(true))
  }, [])

  const isAdmin = useMemo(() => currentUser?.role === "admin", [currentUser])

  if (!ready) {
    return (
      <main className="min-h-dvh flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Please wait…</CardDescription>
          </CardHeader>
          <CardContent>Preparing your app.</CardContent>
        </Card>
      </main>
    )
  }

  if (!currentUser) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-4">
        <LoginForm />
      </main>
    )
  }

  return (
    <main className="min-h-dvh p-4 md:p-8">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-balance">Employee Leave Management</h1>
          <p className="text-sm text-muted-foreground">Welcome, {currentUser.username}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-md bg-secondary text-secondary-foreground">
            Role: {currentUser.role}
          </span>
          <Button
            variant="outline"
            onClick={() => {
              logout()
              mutate(null, { revalidate: false })
              toast({ title: "Signed out" })
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto">{isAdmin ? <AdminDashboard /> : <EmployeeDashboard />}</section>
    </main>
  )
}
