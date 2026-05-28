export interface CheckResult {
  score: number
  maxScore: number
  found?: boolean
  url?: string
  evidence?: string
}

export interface BlockResult {
  score: number
  maxScore: number
  checks: Record<string, CheckResult>
}

export interface AgentCheckResponse {
  domain: string
  scannedAt: string
  totalScore: number
  grade: string
  gradeColor: string
  blocks: {
    machineInterface: BlockResult
    browserOperability: BlockResult & { status: "pending" | "complete" }
    agentDiscovery: BlockResult
    authSecurity: BlockResult
  }
}

export type SSEEvent =
  | { type: "block"; block: keyof AgentCheckResponse["blocks"]; result: BlockResult }
  | { type: "complete"; result: AgentCheckResponse }
  | { type: "error"; message: string }

// Full type definitions for Block 2 — used by the Playwright service in V1.0
export interface BrowserOperabilityChecks {
  semanticHtml: CheckResult      // 7 pts
  ariaAttributes: CheckResult    // 5 pts
  stableUrls: CheckResult        // 5 pts
  keyboardNavigation: CheckResult // 4 pts
  noCaptcha: CheckResult         // 4 pts
}

export interface BrowserOperabilityResult extends BlockResult {
  status: "pending" | "complete"
  checks: Record<keyof BrowserOperabilityChecks, CheckResult>
}
