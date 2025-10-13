import "dotenv/config"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import { pool } from "../db.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const migrationsDir = path.join(__dirname, "..", "migrations")

async function run() {
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8")
    console.log(`[migrate] running ${f}`)
    await pool.query(sql)
  }
  console.log("[migrate] done")
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
