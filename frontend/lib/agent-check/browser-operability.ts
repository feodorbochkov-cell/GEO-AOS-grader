import type { BlockResult, BrowserOperabilityResult } from "./types"

// TODO: implement with Playwright service in V1.0

const MOCK: BrowserOperabilityResult = {
  score: 0,
  maxScore: 25,
  status: "pending",
  checks: {
    semanticHtml:       { score: 0, maxScore: 7 },
    ariaAttributes:     { score: 0, maxScore: 5 },
    stableUrls:         { score: 0, maxScore: 5 },
    keyboardNavigation: { score: 0, maxScore: 4 },
    noCaptcha:          { score: 0, maxScore: 4 },
  },
}

export async function callBrowserService(_url: string): Promise<BlockResult & { status: "pending" | "complete" }> {
  const serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL
  if (!serviceUrl) return MOCK

  try {
    const res = await fetch(`${serviceUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: _url }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return MOCK
    const data = await res.json() as BlockResult
    // Always "pending" until V1.0 — override service status
    return { ...MOCK, ...data, status: "pending" }
  } catch {
    return MOCK
  }
}
