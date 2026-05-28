import { fetchWithTimeout, callOpenRouter } from "./utils"
import type { SubAgentResult } from "./types"

const USER_AGENT = `AgentReadinessBot/1.0 (compatible; ${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/agent-report)`
const HEADERS = { "User-Agent": USER_AGENT }
const HAIKU = "anthropic/claude-haiku-4-5"
const FALLBACK: SubAgentResult = { found: false, confidence: "low", evidence: "sub-agent error" }

async function fetchPages(baseUrl: string, paths: string[]): Promise<string> {
  const parts: string[] = []
  for (const path of paths.slice(0, 3)) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${path}`, { headers: HEADERS }, 8000)
      if (res.ok) {
        const text = await res.text()
        parts.push(`--- ${path} ---\n${text.slice(0, 2000)}`)
      }
    } catch { /* skip */ }
  }
  return parts.join("\n\n")
}

function buildPrompt(domain: string, homepageHtml: string, pages: string, task: string): string {
  return `You are analyzing ${domain} for AI agent operability.

HOMEPAGE HTML (excerpt):
${homepageHtml.slice(0, 3000)}

${pages ? `ADDITIONAL PAGES:\n${pages}` : "No additional pages fetched."}

TASK: ${task}

Return ONLY valid JSON with no other text:
{
  "found": boolean,
  "confidence": "high" | "medium" | "low",
  "evidence": "URL or quoted text where found, or empty string if not found",
  "details": "optional extra context"
}`
}

async function callAgent(prompt: string): Promise<SubAgentResult> {
  try {
    const content = await callOpenRouter(HAIKU, prompt, 400)
    const parsed = JSON.parse(content) as SubAgentResult
    if (typeof parsed.found !== "boolean" || !["high", "medium", "low"].includes(parsed.confidence)) {
      return FALLBACK
    }
    return parsed
  } catch { return FALLBACK }
}

export async function checkMcpServerAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/developers", "/docs", "/platform"])
  const task = `Search for an official MCP (Model Context Protocol) server for ${domain}. Look for:
- Links or mentions of "MCP server", "model context protocol"
- A GitHub repository with "mcp" in the name alongside ${domain}
- Install instructions like "npx @modelcontextprotocol/" or similar
- Any reference to serving MCP protocol
Return the repository URL or install command as evidence.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkOpenApiSpecAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/developers", "/docs", "/api", "/platform", "/build"])
  const task = `Find an OpenAPI or Swagger API specification for ${domain}. It may be linked from the pages provided. Look for:
- Links containing "openapi", "swagger", "api-spec", "api-docs", or "rest-api"
- File extensions .json or .yaml on spec-like paths
- Mentions of a machine-readable API specification URL
Return the direct URL to the spec file.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkPublicApiAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/developers", "/docs"])
  const task = `Determine if ${domain} offers a public API for programmatic access. Look in navigation, footer, and the pages provided for mentions of "API", "REST API", "GraphQL API", "developer platform", or links to API documentation. Return a URL to the API docs or developer portal.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkOAuthAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/docs/authentication", "/docs/auth", "/developers", "/security"])
  const task = `Find evidence that ${domain} supports OAuth 2.0 authentication. Look for text mentioning "OAuth 2.0", "OAuth2", "OpenID Connect", "authorization flow", or "access token" in the pages provided. Return a URL and a short quoted snippet as evidence.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkApiKeyAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/docs/authentication", "/developers", "/api"])
  const task = `Find evidence that ${domain} offers API keys or tokens for programmatic access. Look for "API key", "API token", "personal access token", "secret key", or "bearer token" in the pages provided. Return a URL and a short quoted snippet.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkSdkDocsAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/developers", "/docs", "/build", "/platform"])
  const task = `Find evidence of a developer SDK for ${domain}. Look for links to npmjs.com, pypi.org, or GitHub alongside the word "SDK", or text like "npm install", "pip install", "client library" in the pages provided. Return the URL and package name if found.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}

export async function checkSchemaOrgAgent(url: string, homepageHtml: string): Promise<SubAgentResult> {
  const domain = new URL(url).hostname.replace(/^www\./, "")
  const pages = await fetchPages(url, ["/about", "/product", "/features", "/platform"])
  const task = `Check the pages provided for JSON-LD structured data (inside <script type="application/ld+json"> tags). Look for @type values: SoftwareApplication, WebAPI, APIReference, Service, Action, or EntryPoint. Return the @type found and the page URL.`
  return callAgent(buildPrompt(domain, homepageHtml, pages, task))
}
