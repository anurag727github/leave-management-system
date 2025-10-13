import jwt from "jsonwebtoken"
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me"
const COOKIE_NAME = "token"

export function signAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
}

export function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: "Unauthorized" })
  try {
    const user = jwt.verify(token, JWT_SECRET)
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: "Unauthorized" })
  }
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Forbidden" })
  next()
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    path: "/",
  })
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" })
}
