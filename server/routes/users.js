import { Router } from "express"
import { authRequired } from "../middleware/auth.js"
import { query } from "../db.js"

const router = Router()

router.get("/me", authRequired, async (req, res) => {
  const rows = await query(
    "SELECT id, name, email, role, casual_balance, sick_balance, personal_balance FROM users WHERE id = ?",
    [req.user.id],
  )
  res.json(rows[0] ?? null)
})

export default router
