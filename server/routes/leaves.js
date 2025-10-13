import { Router } from "express"
import { authRequired, adminOnly } from "../middleware/auth.js"
import { query, tx } from "../db.js"

const router = Router()

function calcDays(start, end) {
  const s = new Date(start),
    e = new Date(end)
  const ms = e - s
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
  return days
}

// Create leave request (employee)
router.post("/", authRequired, async (req, res) => {
  const { type, start_date, end_date, reason } = req.body
  if (!type || !start_date || !end_date) return res.status(400).json({ error: "Missing fields" })
  const days = calcDays(start_date, end_date)
  if (days <= 0) return res.status(400).json({ error: "Invalid date range" })

  // Check balance aggressively only when approving, allow submit but warn early:
  const user = (
    await query("SELECT casual_balance, sick_balance, personal_balance FROM users WHERE id=?", [req.user.id])
  )[0]
  const balance = { casual: user.casual_balance, sick: user.sick_balance, personal: user.personal_balance, other: 9999 }
  if (days > (balance[type] ?? 9999)) {
    return res.status(400).json({ error: `Insufficient ${type} balance` })
  }

  const result = await query(
    `INSERT INTO leave_requests (user_id, type, start_date, end_date, days, reason, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [req.user.id, type, start_date, end_date, days, reason ?? null],
  )
  res.status(201).json({ id: result.insertId })
})

// List leave requests
// Employees see their own; admins can filter all
router.get("/", authRequired, async (req, res) => {
  const { status, type, from, to, user_id } = req.query
  const params = []
  let where = "WHERE 1=1"
  if (req.user.role !== "admin") {
    where += " AND lr.user_id = ?"
    params.push(req.user.id)
  } else if (user_id) {
    where += " AND lr.user_id = ?"
    params.push(Number(user_id))
  }
  if (status) {
    where += " AND lr.status = ?"
    params.push(status)
  }
  if (type) {
    where += " AND lr.type = ?"
    params.push(type)
  }
  if (from) {
    where += " AND lr.start_date >= ?"
    params.push(from)
  }
  if (to) {
    where += " AND lr.end_date <= ?"
    params.push(to)
  }

  const rows = await query(
    `SELECT lr.*, u.name as user_name, u.email as user_email
     FROM leave_requests lr
     JOIN users u ON u.id = lr.user_id
     ${where}
     ORDER BY lr.created_at DESC`,
    params,
  )
  res.json(rows)
})

// Cancel own pending request
router.post("/:id/cancel", authRequired, async (req, res) => {
  const id = Number(req.params.id)
  const rows = await query("SELECT * FROM leave_requests WHERE id=? AND user_id=?", [id, req.user.id])
  if (!rows.length) return res.status(404).json({ error: "Not found" })
  const lr = rows[0]
  if (lr.status !== "pending") return res.status(400).json({ error: "Only pending requests can be cancelled" })
  await query('UPDATE leave_requests SET status="cancelled" WHERE id=?', [id])
  res.json({ ok: true })
})

// Approve/Reject (admin)
router.post("/:id/decision", authRequired, adminOnly, async (req, res) => {
  const id = Number(req.params.id)
  const { action } = req.body // 'approve' or 'reject'
  const rows = await query("SELECT * FROM leave_requests WHERE id=?", [id])
  if (!rows.length) return res.status(404).json({ error: "Not found" })
  const lr = rows[0]
  if (lr.status !== "pending") return res.status(400).json({ error: "Already decided" })

  if (action === "approve") {
    // Deduct balance inside transaction and mark approved
    await tx(async (conn) => {
      // current balances
      const [urows] = await conn.query(
        "SELECT id, casual_balance, sick_balance, personal_balance FROM users WHERE id=? FOR UPDATE",
        [lr.user_id],
      )
      const user = urows[0]
      const typeField = `${lr.type}_balance`
      const allowedFields = ["casual_balance", "sick_balance", "personal_balance"]
      if (!allowedFields.includes(typeField) && lr.type !== "other") {
        throw new Error("Invalid leave type")
      }
      if (lr.type !== "other") {
        const newBal = user[typeField] - lr.days
        if (newBal < 0) throw new Error("Insufficient balance at approval")
        await conn.query(`UPDATE users SET ${typeField}=? WHERE id=?`, [newBal, lr.user_id])
      }
      await conn.query('UPDATE leave_requests SET status="approved", reviewed_by=?, reviewed_at=NOW() WHERE id=?', [
        req.user.id,
        id,
      ])
      await conn.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [
        lr.user_id,
        `Your ${lr.type} leave (#${id}) has been approved.`,
      ])
    })
  } else if (action === "reject") {
    await query('UPDATE leave_requests SET status="rejected", reviewed_by=?, reviewed_at=NOW() WHERE id=?', [
      req.user.id,
      id,
    ])
    await query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [
      lr.user_id,
      `Your ${lr.type} leave (#${id}) has been rejected.`,
    ])
  } else {
    return res.status(400).json({ error: "Invalid action" })
  }

  res.json({ ok: true })
})

// Notifications (list + mark read)
router.get("/notifications", authRequired, async (req, res) => {
  const rows = await query("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50", [
    req.user.id,
  ])
  res.json(rows)
})

router.post("/notifications/:id/read", authRequired, async (req, res) => {
  const id = Number(req.params.id)
  await query("UPDATE notifications SET is_read=TRUE WHERE id=? AND user_id=?", [id, req.user.id])
  res.json({ ok: true })
})

export default router
