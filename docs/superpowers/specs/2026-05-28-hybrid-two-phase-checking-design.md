# Hybrid Two-Phase Checking — Design Spec

**Date:** 2026-05-28  
**Feature:** Improved Agent Operability scoring via deterministic HTTP + agentic LLM fallback  
**Status:** Approved

---

## Problem

The current single-pass HTTP checker returns NOT_FOUND and scores 0 for checks where the signal exists but lives at a non-standard path. A platform's OAuth docs might be at `/docs/authentication` instead of `/.well-known/oauth-authorization-server`. Their OpenAPI spec might be at `/platform/api/spec.json`. SDK docs might live under `/build` instead of `/developers`. The result is inaccurate scores, especially for niche or unconventional platforms — which are the primary audience for this tool.

---

## Solution: Hybrid Two-Phase Architecture

A two-phase scan followed by a Sonnet synthesis step. Phase 1 is fast and free. Phase 2 is triggered only when Phase 1 comes up empty. Sonnet produces nuanced, auditable scores from all collected evidence.

---

## Phase 1 — Deterministic HTTP

**Timing:** ≤8s per check, all checks in parallel  
**Cost:** $0  
**LLM:** None

### Homepage Pre-fetch

Before Phase 1 checks run, the orchestrator fetches the homepage HTML **once** and stores it in a local variable. This HTML is passed to all Phase 1 parsers and all Phase 2 sub-agents. The homepage is never fetched more than once per scan.

### Check Outputs

Each check returns one of three statuses:

```typescript
type Phase1Status = "FOUND" | "NOT_FOUND" | "UNCERTAIN"

type Phase1Result = {
  status: Phase1Status
  evidence?: string       // URL, snippet, or structured data found
  rawData?: unknown       // e.g. parsed OpenAPI spec object
}
```

### Checks Covered in Phase 1

| Check | Method | UNCERTAIN trigger |
|---|---|---|
| MCP Server | Well-known paths + Smithery API + mcp.so API with hostname verification | Registry match with low confidence |
| OpenAPI Spec | 7 standard paths + `api.`, `developer.` subdomains | Spec found but no `paths` object |
| llms.txt | Fetch `/llms.txt` and parse | Never — binary |
| robots.txt AI permissions | Fetch + parse agent rules | Never — binary |
| Schema.org | Parse JSON-LD from homepage HTML | Never — but Phase 2 checks inner pages if NOT_FOUND |
| CORS | HTTP OPTIONS on detected API endpoint | No API endpoint found |
| Public API | Homepage HTML signals + robots.txt `/api/` mentions | Only 1 of 2 signals present |

---

## Phase 2 — Haiku Sub-Agents

**Timing:** ≤15s per sub-agent, all triggered sub-agents in parallel  
**Cost:** ~$0.02–0.04 if several checks run  
**LLM:** `anthropic/claude-haiku-4-5` via OpenRouter

### Trigger Condition

After Phase 1 completes, the orchestrator inspects each check's status. Any check returning `NOT_FOUND` or `UNCERTAIN` gets a Haiku sub-agent launched for it. If Phase 1 returns `FOUND` for everything, Phase 2 is skipped entirely.

### Sub-Agent Interface

Each sub-agent is an exported async function in `lib/agent-check/phase2-agents.ts`:

```typescript
type SubAgentResult = {
  found: boolean
  confidence: "high" | "medium" | "low"
  evidence: string    // URL or quoted text snippet
  details?: string    // extra context (e.g. repo age, package name)
}

async function checkMcpServerAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkOpenApiSpecAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkPublicApiAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkOAuthAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkApiKeyAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkSdkDocsAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
async function checkSchemaOrgAgent(url: string, homepageHtml: string): Promise<SubAgentResult>
```

Each function may fetch up to 3 additional pages beyond the homepage HTML it receives. The JS function itself calls `fetchWithTimeout` to retrieve those pages and includes their HTML content in the Haiku prompt — Haiku does not fetch autonomously.

### Sub-Agent Task Prompts

**MCP Server:**  
"Search this website for an official MCP (Model Context Protocol) server. Check the homepage HTML provided, then if needed fetch /developers, /docs, /platform pages. Look for links or mentions of 'MCP server', 'model context protocol', a GitHub repository containing 'mcp' in the name, or install instructions like 'npx @modelcontextprotocol/'. Return the repository URL or install command as evidence."

**OpenAPI / Swagger Spec:**  
"Search this website for an OpenAPI or Swagger API specification. It may be linked from the homepage, /developers, /docs, /api, /platform, or /build pages. Look for links containing 'openapi', 'swagger', 'api-spec', 'api-docs', or 'rest-api'. Also check if the homepage HTML mentions an API specification URL. Return the URL if found."

**OAuth 2.0:**  
"Find evidence that this platform supports OAuth 2.0 authentication. Check /docs, /developers, /api, /docs/authentication, /docs/auth, /security pages. Look for text mentioning 'OAuth 2.0', 'OAuth2', 'OpenID Connect', 'authorization flow', 'access token'. Return a URL and a short quote as evidence."

**API Key / Token Support:**  
"Find evidence that this platform offers API keys or tokens for programmatic access. Check /settings, /account, /developers, /api, /docs/authentication pages. Look for 'API key', 'API token', 'personal access token', 'secret key', 'bearer token'. Return a URL and short quote."

**SDK Documentation:**  
"Find evidence of a developer SDK for this platform. Check the homepage HTML and /developers, /docs, /build, /platform pages. Look for links to npmjs.com, pypi.org, or github.com alongside the word 'SDK', or text like 'npm install', 'pip install', 'client library'. Return the URL and package name if found."

**Schema.org (fallback to inner pages):**  
"Check the /about, /product, /features, or /platform pages of this website for JSON-LD structured data. Look for @type values of: SoftwareApplication, WebAPI, APIReference, Service, Action, EntryPoint. Return the @type found and the page URL."

**Public API Exists:**  
"Determine if this platform offers a public API. Search the homepage, navigation, footer, and /developers or /docs pages for mentions of 'API', 'REST API', 'GraphQL API', 'developer platform', or links to API documentation. Return a confidence level and URL evidence."

### OpenRouter Call Pattern

```typescript
const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "anthropic/claude-haiku-4-5",
    messages: [{ role: "user", content: taskPrompt }],
    max_tokens: 500,
    response_format: { type: "json_object" },
  }),
})
```

Each sub-agent function wraps this call, parses the JSON response into `SubAgentResult`, and catches errors to return `{ found: false, confidence: "low", evidence: "error" }`.

---

## Sonnet Synthesis — Final Scoring

**Timing:** ≤10s  
**Cost:** ~$0.05–0.10 per scan  
**LLM:** `anthropic/claude-sonnet-4-5` via OpenRouter  
**File:** `lib/agent-check/sonnet-scoring.ts`

### Input

Sonnet receives a single prompt containing:
- The target domain
- All Phase 1 results (status + evidence per check)
- All Phase 2 results (found, confidence, evidence, details per check) — or null if Phase 2 wasn't triggered for a check
- The scoring schema: each check's name, max points, and what each point tier means

### Output

```typescript
type ScoredCheck = {
  score: number
  maxScore: number
  found: boolean
  detectionMethod: "deterministic" | "ai_fallback"
  confidence: "high" | "medium" | "low" | null
  justification: string   // one sentence explaining the score
  evidence?: string
}

type SonnetScoringResult = {
  checks: Record<string, ScoredCheck>
}
```

### Scoring Nuance

Sonnet applies judgment rather than rigid rules. Examples:

- MCP server repo found but last commit 2 years ago → 5/10 with justification "Found archived MCP repo at github.com/…, inactive since 2023"
- OpenAPI spec exists but has 2 paths with no descriptions → 3/8 with justification "Spec found but minimal coverage (2 undocumented endpoints)"
- OAuth mentioned in docs as "coming soon" → 1/8 with justification "OAuth referenced in docs but marked as upcoming feature"
- High-confidence Phase 2 find → full points with `detectionMethod: "ai_fallback"`
- Low-confidence Phase 2 find → partial credit at Sonnet's discretion

The key principle: **Sonnet scores what was actually found, not what a rubric says to score.** The rubric (max points per check) is a ceiling, not a formula.

---

## Orchestrator Changes (`lib/agent-check/index.ts`)

```
1. Fetch homepage HTML (shared, cached in memory)
2. Run all Phase 1 checks in parallel (pass homepageHtml)
3. Identify checks with status NOT_FOUND or UNCERTAIN
4. Run Phase 2 sub-agents in parallel for those checks only
5. Call Sonnet synthesis with all evidence
6. Assemble final BlockResult objects from SonnetScoringResult
7. Check DB cache before step 1; write to cache after step 6
```

---

## Caching

- **Store:** Upstash Redis
- **Key:** `agent-check:{normalizedHostname}` (e.g. `agent-check:github.com`)
- **TTL:** 24 hours
- **On hit:** Stream stored result immediately, skip all phases
- **On miss:** Run full scan, write result to cache after Sonnet synthesis

---

## Timing Budget

```
Homepage fetch:       ~1s
Phase 1 (parallel):   ≤8s
Phase 2 (parallel):   ≤15s  (only if triggered)
Sonnet synthesis:     ≤10s
Total:                ≤35s
```

---

## Type Changes (`lib/agent-check/types.ts`)

Add to `CheckResult`:

```typescript
detectionMethod?: "deterministic" | "ai_fallback"
confidence?: "high" | "medium" | "low"
justification?: string
```

---

## What Does NOT Change

- Block structure and scoring weights (MCP=10, OpenAPI=8, etc.)
- Browser Operability block — still a stub, no Phase 2 needed
- API route (`app/api/agent-check/route.ts`) — unchanged
- UI components — unchanged (they consume richer `CheckResult` fields automatically via optional fields)

---

## New Files

| File | Purpose |
|---|---|
| `lib/agent-check/phase2-agents.ts` | 7 exported Haiku sub-agent functions |
| `lib/agent-check/sonnet-scoring.ts` | Sonnet synthesis function |

## Modified Files

| File | Change |
|---|---|
| `lib/agent-check/index.ts` | Two-phase orchestration + caching |
| `lib/agent-check/machine-interface.ts` | Return Phase1Result instead of BlockResult |
| `lib/agent-check/agent-discovery.ts` | Return Phase1Result instead of BlockResult |
| `lib/agent-check/auth-security.ts` | Return Phase1Result instead of BlockResult |
| `lib/agent-check/types.ts` | Add Phase1Status, Phase1Result, SubAgentResult, ScoredCheck |
| `lib/agent-check/utils.ts` | Add Upstash Redis cache helpers |
