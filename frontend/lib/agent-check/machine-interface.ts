import { fetchWithTimeout } from "./utils"
import type { BlockResult, CheckResult } from "./types"

const OPENAPI_PATHS = [
  "/openapi.json",
  "/swagger.json",
  "/api-docs",
  "/api/openapi.json",
  "/api/v1/openapi.json",
  "/docs/api.json",
  "/api/swagger.json",
]

const USER_AGENT = `AgentReadinessBot/1.0 (compatible; ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/agent-report)`

type McpResult = CheckResult & { found: boolean; url?: string }
type OpenApiResult = CheckResult & { found: boolean; url?: string }
type CoverageResult = CheckResult & { percentage: number | null }
type PublicApiResult = CheckResult & { found: boolean }

async function checkMcpServer(baseUrl: string): Promise<McpResult> {
  for (const path of ["/.well-known/mcp.json", "/.well-known/ai-plugin.json"]) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: { "User-Agent": USER_AGENT } })
      if (res.ok) return { score: 10, maxScore: 10, found: true, url: path }
    } catch { /* continue */ }
  }
  try {
    const domain = new URL(baseUrl).hostname.replace(/^www\./, "")
    const res = await fetchWithTimeout(
      `https://mcp.so/api/search?q=${encodeURIComponent(domain)}`,
      { headers: { "User-Agent": USER_AGENT } }
    )
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        return { score: 10, maxScore: 10, found: true, url: "mcp.so registry" }
      }
    }
  } catch { /* continue */ }
  return { score: 0, maxScore: 10, found: false }
}

async function checkOpenApiSpec(baseUrl: string): Promise<{ result: OpenApiResult; spec?: Record<string, unknown> }> {
  const results = await Promise.allSettled(
    OPENAPI_PATHS.map(path =>
      fetchWithTimeout(`${baseUrl}${path}`, { headers: { "User-Agent": USER_AGENT } })
        .then(async res => {
          if (!res.ok) return null
          const data = await res.json().catch(() => null)
          if (!data || typeof data !== "object") return null
          return { path, data: data as Record<string, unknown> }
        })
        .catch(() => null)
    )
  )

  for (const r of results) {
    if (r.status !== "fulfilled" || !r.value) continue
    const { path, data } = r.value
    if ("paths" in data && data.paths && typeof data.paths === "object" && Object.keys(data.paths).length > 0) {
      return { result: { score: 8, maxScore: 8, found: true, url: path }, spec: data }
    }
    if ("openapi" in data || "swagger" in data) {
      return { result: { score: 4, maxScore: 8, found: true, url: path }, spec: data }
    }
  }
  return { result: { score: 0, maxScore: 8, found: false } }
}

export function computeApiCoverage(spec: Record<string, unknown> | undefined): CoverageResult {
  if (!spec || !("paths" in spec) || !spec.paths || typeof spec.paths !== "object") {
    return { score: 0, maxScore: 6, percentage: null }
  }
  const paths = spec.paths as Record<string, Record<string, { description?: string; summary?: string }>>
  const httpMethods = ["get", "post", "put", "patch", "delete", "head", "options"]
  let total = 0
  let documented = 0
  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== "object") continue
    for (const method of httpMethods) {
      const op = pathItem[method]
      if (!op) continue
      total++
      if (op.description?.trim() || op.summary?.trim()) documented++
    }
  }
  if (total === 0) return { score: 0, maxScore: 6, percentage: 0 }
  const pct = documented / total
  const percentage = Math.round(pct * 100)
  if (pct > 0.7) return { score: 6, maxScore: 6, percentage }
  if (pct >= 0.4) return { score: 4, maxScore: 6, percentage }
  if (pct >= 0.1) return { score: 2, maxScore: 6, percentage }
  return { score: 0, maxScore: 6, percentage }
}

async function checkPublicApi(baseUrl: string): Promise<PublicApiResult> {
  let signals = 0
  try {
    const res = await fetchWithTimeout(baseUrl, { headers: { "User-Agent": USER_AGENT } })
    if (res.ok) {
      const html = await res.text()
      if (/href=["'][^"']*\/(developers|api|docs)[^"']*["']/i.test(html)) signals++
      if (/\b(API|Developers|Documentation)\b/.test(html)) signals++
      if (/rel=["']api["']/i.test(html)) signals++
    }
  } catch { /* ignore */ }
  try {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`, { headers: { "User-Agent": USER_AGENT } })
    if (res.ok) {
      const txt = await res.text()
      if (/^(?:Allow|Disallow):\s*\/api\//im.test(txt)) signals++
    }
  } catch { /* ignore */ }
  if (signals >= 2) return { score: 6, maxScore: 6, found: true }
  if (signals === 1) return { score: 3, maxScore: 6, found: true }
  return { score: 0, maxScore: 6, found: false }
}

export async function checkMachineInterface(baseUrl: string): Promise<BlockResult> {
  const [mcpRes, openApiRes, publicApiRes] = await Promise.allSettled([
    checkMcpServer(baseUrl),
    checkOpenApiSpec(baseUrl),
    checkPublicApi(baseUrl),
  ])

  const mcpServer = mcpRes.status === "fulfilled" ? mcpRes.value : { score: 0, maxScore: 10, found: false }
  const { result: openApiSpec, spec } = openApiRes.status === "fulfilled"
    ? openApiRes.value
    : { result: { score: 0, maxScore: 8, found: false }, spec: undefined }
  const coverage = computeApiCoverage(spec)
  const publicApi = publicApiRes.status === "fulfilled" ? publicApiRes.value : { score: 0, maxScore: 6, found: false }

  const score = mcpServer.score + openApiSpec.score + coverage.score + publicApi.score

  return {
    score,
    maxScore: 30,
    checks: { mcpServer, openApiSpec, apiDescriptionCoverage: coverage, publicApiExists: publicApi },
  }
}
