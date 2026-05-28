import { fetchWithTimeout } from "./utils"
import type { BlockResult, CheckResult } from "./types"

const USER_AGENT = `AgentReadinessBot/1.0 (compatible; ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/agent-report)`
const HEADERS = { "User-Agent": USER_AGENT }

const AI_BOTS = ["anthropic-ai", "gpt-bot", "claude-bot", "perplexity-bot", "cohere-ai", "google-extended", "amazonbot"]
const ACTION_SECTIONS = ["## api", "## tools", "## actions", "## capabilities", "## integrations"]
const HIGH_VALUE_TYPES = ["WebAPI", "APIReference", "SoftwareApplication", "Action", "EntryPoint"]
const MEDIUM_VALUE_TYPES = ["Service", "Organization", "WebSite", "Product"]

type LlmsResult = CheckResult & { found: boolean; hasActionSections: boolean; wordCount: number }
type RobotsResult = CheckResult & { allowedBots: string[]; blockedBots: string[] }
type SchemaResult = CheckResult & { typesFound: string[] }
type SdkResult = CheckResult & { found: boolean }

async function checkLlmsTxt(baseUrl: string): Promise<LlmsResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/llms.txt`, { headers: HEADERS })
    if (!res.ok) return { score: 0, maxScore: 8, found: false, hasActionSections: false, wordCount: 0 }
    const text = await res.text()
    const lower = text.toLowerCase()
    let score = 2
    if (/^-\s+https?:\/\//m.test(text)) score += 1
    const hasActionSections = ACTION_SECTIONS.some(s => lower.includes(s))
    if (hasActionSections) score += 3
    const wordCount = text.split(/\s+/).filter(Boolean).length
    if (wordCount >= 200) score += 2
    return { score: Math.min(score, 8), maxScore: 8, found: true, hasActionSections, wordCount }
  } catch {
    return { score: 0, maxScore: 8, found: false, hasActionSections: false, wordCount: 0 }
  }
}

async function checkRobotsTxtAi(baseUrl: string): Promise<RobotsResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`, { headers: HEADERS })
    if (!res.ok) return { score: 6, maxScore: 6, allowedBots: [...AI_BOTS], blockedBots: [] }
    const text = await res.text()
    const lines = text.split("\n").map(l => l.trim())
    let currentAgents: string[] = []
    const explicitBlocked = new Set<string>()
    let wildcardBlocked = false
    const wildcardExceptions = new Set<string>()

    for (const line of lines) {
      if (/^user-agent:/i.test(line)) {
        currentAgents = [line.replace(/^user-agent:\s*/i, "").toLowerCase()]
      } else if (/^disallow:\s*\/$/i.test(line)) {
        if (currentAgents.includes("*")) wildcardBlocked = true
        for (const agent of currentAgents) {
          const matched = AI_BOTS.find(b => agent.includes(b))
          if (matched) explicitBlocked.add(matched)
        }
      } else if (/^allow:\s*\/$/i.test(line)) {
        for (const agent of currentAgents) {
          const matched = AI_BOTS.find(b => agent.includes(b))
          if (matched) wildcardExceptions.add(matched)
        }
      }
    }

    const blockedBots = AI_BOTS.filter(bot =>
      explicitBlocked.has(bot) || (wildcardBlocked && !wildcardExceptions.has(bot))
    )
    const allowedBots = AI_BOTS.filter(b => !blockedBots.includes(b))
    const blocked = blockedBots.length

    let score: number
    if (blocked === 0) score = 6
    else if (blocked <= 2) score = 4
    else if (blocked <= 4) score = 2
    else score = 0

    return { score, maxScore: 6, allowedBots, blockedBots }
  } catch {
    return { score: 6, maxScore: 6, allowedBots: [...AI_BOTS], blockedBots: [] }
  }
}

async function checkSchemaOrg(baseUrl: string): Promise<SchemaResult> {
  try {
    const res = await fetchWithTimeout(baseUrl, { headers: HEADERS })
    if (!res.ok) return { score: 0, maxScore: 6, typesFound: [] }
    const html = await res.text()
    const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    const typesFound: string[] = []
    let score = 0

    for (const match of ldMatches) {
      try {
        const data = JSON.parse(match[1])
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          const t = item?.["@type"]
          if (typeof t !== "string" || typesFound.includes(t)) continue
          typesFound.push(t)
          if (HIGH_VALUE_TYPES.includes(t)) score = Math.min(score + 2, 6)
          else if (MEDIUM_VALUE_TYPES.includes(t)) score = Math.min(score + 1, 6)
        }
      } catch { /* malformed JSON-LD */ }
    }
    return { score, maxScore: 6, typesFound }
  } catch {
    return { score: 0, maxScore: 6, typesFound: [] }
  }
}

async function checkSdkDocs(baseUrl: string): Promise<SdkResult> {
  let signals = 0
  const pages = [baseUrl, `${baseUrl}/developers`, `${baseUrl}/docs`]

  await Promise.allSettled(pages.map(async url => {
    try {
      const res = await fetchWithTimeout(url, { headers: HEADERS })
      if (!res.ok) return
      const html = await res.text()
      if (/npmjs\.com/i.test(html)) signals += 2
      if (/pypi\.org/i.test(html)) signals += 2
      if (/github\.com[^\s"']*sdk/i.test(html)) signals += 1
      if (/npm\s+install\b/i.test(html)) signals += 2
      if (/pip\s+install\b/i.test(html)) signals += 2
      if (/<(?:nav|h[1-6])[^>]*>[^<]*\bSDK\b[^<]*<\/(?:nav|h[1-6])>/i.test(html)) signals += 1
    } catch { /* ignore */ }
  }))

  const score = signals >= 5 ? 5 : signals >= 3 ? 3 : signals >= 1 ? 1 : 0
  return { score, maxScore: 5, found: signals > 0 }
}

export async function checkAgentDiscovery(baseUrl: string): Promise<BlockResult> {
  const [llmsRes, robotsRes, schemaRes, sdkRes] = await Promise.allSettled([
    checkLlmsTxt(baseUrl),
    checkRobotsTxtAi(baseUrl),
    checkSchemaOrg(baseUrl),
    checkSdkDocs(baseUrl),
  ])

  const checks = {
    llmsTxt: llmsRes.status === "fulfilled" ? llmsRes.value : { score: 0, maxScore: 8, found: false, hasActionSections: false, wordCount: 0 },
    robotsTxtAi: robotsRes.status === "fulfilled" ? robotsRes.value : { score: 6, maxScore: 6, allowedBots: [...AI_BOTS], blockedBots: [] },
    schemaOrg: schemaRes.status === "fulfilled" ? schemaRes.value : { score: 0, maxScore: 6, typesFound: [] },
    sdkDocs: sdkRes.status === "fulfilled" ? sdkRes.value : { score: 0, maxScore: 5, found: false },
  }

  const score = checks.llmsTxt.score + checks.robotsTxtAi.score + checks.schemaOrg.score + checks.sdkDocs.score
  return { score, maxScore: 25, checks }
}
