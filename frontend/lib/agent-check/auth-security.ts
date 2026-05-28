import { fetchWithTimeout } from "./utils"
import type { BlockResult, CheckResult } from "./types"

const USER_AGENT = `AgentReadinessBot/1.0 (compatible; ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/agent-report)`
const HEADERS = { "User-Agent": USER_AGENT }

type OAuthResult = CheckResult & { found: boolean; method: "well-known" | "docs" | null }
type ApiKeyResult = CheckResult & { found: boolean }
type CorsResult = CheckResult & { policy: string | null; status?: "no_api_found" }

async function checkOAuth(baseUrl: string): Promise<OAuthResult> {
  for (const path of ["/.well-known/oauth-authorization-server", "/.well-known/openid-configuration"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: HEADERS })
      if (res.ok) {
        await res.json() // validates it's JSON
        return { score: 8, maxScore: 8, found: true, method: "well-known" }
      }
    } catch { /* continue */ }
  }
  for (const path of ["/developers", "/docs", "/api"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: HEADERS })
      if (res.ok) {
        const html = await res.text()
        if (/oauth\s*2\.?0|openid\s+connect/i.test(html)) {
          return { score: 4, maxScore: 8, found: true, method: "docs" }
        }
      }
    } catch { /* continue */ }
  }
  return { score: 0, maxScore: 8, found: false, method: null }
}

async function checkApiKeySupport(baseUrl: string): Promise<ApiKeyResult> {
  const API_KEY_PATTERN = /api\s*key|api\s*token|access\s+token|personal\s+access\s+token|secret\s+key/i

  for (const path of ["/settings/api", "/account/api", "/api-keys"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: HEADERS })
      if (res.ok && API_KEY_PATTERN.test(await res.text())) {
        return { score: 6, maxScore: 6, found: true }
      }
    } catch { /* continue */ }
  }
  for (const path of ["/settings", "/account", "/developers", "/"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: HEADERS })
      if (res.ok && API_KEY_PATTERN.test(await res.text())) {
        return { score: 3, maxScore: 6, found: true }
      }
    } catch { /* continue */ }
  }
  return { score: 0, maxScore: 6, found: false }
}

async function findApiEndpoint(baseUrl: string): Promise<string | undefined> {
  for (const path of ["/api/v1", "/api", "/api/v1/health", "/api/health"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { method: "HEAD", headers: HEADERS })
      if (res.ok || res.status === 401 || res.status === 405) return `${baseUrl}${path}`
    } catch { /* continue */ }
  }
  return undefined
}

async function checkCors(baseUrl: string): Promise<CorsResult> {
  const endpoint = await findApiEndpoint(baseUrl)
  if (!endpoint) return { score: 0, maxScore: 6, policy: null, status: "no_api_found" }

  try {
    const res = await fetchWithTimeout(endpoint, {
      method: "OPTIONS",
      headers: {
        ...HEADERS,
        "Origin": "https://test.example.com",
        "Access-Control-Request-Method": "GET",
      },
    })
    const origin = res.headers.get("access-control-allow-origin")
    if (origin === "*") return { score: 6, maxScore: 6, policy: "*" }
    if (origin) return { score: 3, maxScore: 6, policy: origin }
    return { score: 1, maxScore: 6, policy: null }
  } catch {
    return { score: 1, maxScore: 6, policy: null }
  }
}

export async function checkAuthSecurity(baseUrl: string): Promise<BlockResult> {
  const [oauthRes, apiKeyRes, corsRes] = await Promise.allSettled([
    checkOAuth(baseUrl),
    checkApiKeySupport(baseUrl),
    checkCors(baseUrl),
  ])

  const checks = {
    oauth: oauthRes.status === "fulfilled" ? oauthRes.value : { score: 0, maxScore: 8, found: false, method: null as null },
    apiKeySupport: apiKeyRes.status === "fulfilled" ? apiKeyRes.value : { score: 0, maxScore: 6, found: false },
    corsPolicy: corsRes.status === "fulfilled" ? corsRes.value : { score: 0, maxScore: 6, policy: null },
  }

  const score = checks.oauth.score + checks.apiKeySupport.score + checks.corsPolicy.score
  return { score, maxScore: 20, checks }
}
