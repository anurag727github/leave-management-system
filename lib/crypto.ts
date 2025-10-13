function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

export async function hashPassword(password: string, saltHex?: string): Promise<{ hashHex: string; saltHex: string }> {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const pwBytes = enc.encode(password)
  const combined = new Uint8Array(salt.length + pwBytes.length)
  combined.set(salt)
  combined.set(pwBytes, salt.length)
  const digest = await crypto.subtle.digest("SHA-256", combined)
  const hashHex = toHex(new Uint8Array(digest))
  return { hashHex, saltHex: toHex(salt) }
}

export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return out === 0
}
