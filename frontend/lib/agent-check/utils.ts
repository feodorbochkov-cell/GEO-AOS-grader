export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

export function normalizeUrl(input: string): { url: string; domain: string } {
  const withScheme = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`
  const parsed = new URL(withScheme)
  let domain = parsed.hostname.replace(/^www\./, "")
  // Extract base domain (everything after the first subdomain if there are multiple parts)
  const parts = domain.split(".")
  if (parts.length > 2) {
    domain = parts.slice(-2).join(".")
  }
  return { url: `${parsed.protocol}//${parsed.host}`, domain }
}

const rateLimitMap = new Map<string, number[]>()

export function checkRateLimit(ip: string, maxPerHour = 10): boolean {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= maxPerHour) return false
  rateLimitMap.set(ip, [...timestamps, now])
  return true
}
