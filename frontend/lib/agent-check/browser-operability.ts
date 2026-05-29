import type { BrowserOperabilityResult } from "./types"

const MOCK: BrowserOperabilityResult = {
  score: 0,
  maxScore: 25,
  status: "pending",
  checks: {
    botBlocking:       { score: 0, maxScore: 6 },
    navigationWorking: { score: 0, maxScore: 6 },
    formsInteractable: { score: 0, maxScore: 5 },
    authFlowReachable: { score: 0, maxScore: 4 },
    noJsWall:          { score: 0, maxScore: 4 },
  },
}

export async function callBrowserService(url: string): Promise<BrowserOperabilityResult> {
  const serviceUrl = process.env.PLAYWRIGHT_SERVICE_URL
  if (!serviceUrl) return MOCK

  try {
    const res = await fetch(`${serviceUrl}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(60000),
    })
    if (!res.ok) return MOCK
    return await res.json() as BrowserOperabilityResult
  } catch {
    return MOCK
  }
}
