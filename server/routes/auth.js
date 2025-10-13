import { Router } from "express"
import bcrypt from "bcryptjs"
import { query } from "../db.js"
import { setAuthCookie, clearAuthCookie, signAuthToken } from "../middleware/auth.js"

const router = Router()

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" })
  const existing = await query("SELECT id FROM users WHERE email = ?", [email])
  if (existing.length) return res.status(409).json({ error: "Email already registered" })
  const hash = await bcrypt.hash(password, 10)
  await query("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)", [
    name,
    email,
    hash,
    "employee",
  ])
  res.status(201).json({ ok: true })
})

router.post("/login", async (req, res) => {
  const { email, password } = req.body
  const users = await query("SELECT id, name, email, password_hash, role FROM users WHERE email = ?", [email])
  if (!users.length) return res.status(401).json({ error: "Invalid credentials" })
  const user = users[0]
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: "Invalid credentials" })
  const token = signAuthToken({ id: user.id, email: user.email, role: user.role, name: user.name })
  setAuthCookie(res, token)
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role })
})

router.post("/logout", async (_req, res) => {
  clearAuthCookie(res)
  res.json({ ok: true })
})

router.get("/me", async (req, res) => {
  // Optional: lightweight identity check based on cookie, without full middleware
  // If you want strict, use authRequired in route declaration
  try {
    const token = req.cookies?.token
    if (!token) return res.status(200).json({ user: null })
    const base64 = token.split(".")[1]
    const payload = JSON.parse(Buffer.from(base64, "base64").toString("utf8"))
    res.json({ user: { id: payload.id, email: payload.email, role: payload.role, name: payload.name } })
  } catch {
    res.json({ user: null })
  }
})

export default router
