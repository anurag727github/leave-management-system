import bcrypt from "bcryptjs"
import { query } from "./db.js"

export async function ensureAdminSeed() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@lms.local"
  const adminName = process.env.ADMIN_NAME || "Administrator"
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123"
  const users = await query("SELECT id FROM users WHERE email=?", [adminEmail])
  if (users.length) return
  const hash = await bcrypt.hash(adminPassword, 10)
  await query(
    `INSERT INTO users (name, email, password_hash, role, casual_balance, sick_balance, personal_balance)
     VALUES (?, ?, ?, 'admin', 9999, 9999, 9999)`,
    [adminName, adminEmail, hash],
  )
  console.log(`[seed] admin created: ${adminEmail} / ${adminPassword}`)
}
