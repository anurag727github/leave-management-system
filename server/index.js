import "dotenv/config"
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { ensureAdminSeed } from "./seed.js"
import authRouter from "./routes/auth.js"
import usersRouter from "./routes/users.js"
import leavesRouter from "./routes/leaves.js"

const app = express()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 3000
const CORS_ORIGIN = process.env.CORS_ORIGIN || `http://localhost:${PORT}`

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

// APIs
app.use("/api/auth", authRouter)
app.use("/api/users", usersRouter)
app.use("/api/leaves", leavesRouter)

// Serve static frontend
app.use(express.static(path.join(__dirname, "..", "public")))
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"))
})

app.listen(PORT, async () => {
  await ensureAdminSeed()
  console.log(`[server] listening on http://localhost:${PORT}`)
})
