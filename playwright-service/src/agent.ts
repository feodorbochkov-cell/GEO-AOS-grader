import Anthropic from "@anthropic-ai/sdk"
import type { MessageParam, ToolResultBlockParam } from "@anthropic-ai/sdk/resources/messages"
import type { Page } from "playwright"
import { BROWSER_TOOLS, executeTool } from "./tools"
import type { AgentAssessment } from "./types"

export const FALLBACK_ASSESSMENT: AgentAssessment = {
  checks: {
    botBlocking:       { score: 0, maxScore: 6, found: false, evidence: "Scan failed" },
    navigationWorking: { score: 0, maxScore: 6, found: false, evidence: "Scan failed" },
    formsInteractable: { score: 0, maxScore: 5, found: false, evidence: "Scan failed" },
    authFlowReachable: { score: 0, maxScore: 4, found: false, evidence: "Scan failed" },
    noJsWall:          { score: 0, maxScore: 4, found: false, evidence: "Scan failed" },
  },
  blockers: ["Scan could not be completed"],
  sessionSummary: "Scan failed or timed out",
}

export const SYSTEM_PROMPT = `You are an AI agent testing whether a website can be operated by AI agents. Your job is to explore the site using the provided tools and assess how easy it is for an AI agent to navigate and interact with it.

Start by calling detect_blocking to check for bot-blocking, then navigate to the URL and explore. Try to:
1. Load the homepage and check if content is visible (noJsWall)
2. Navigate 2-3 internal links from the main navigation (navigationWorking)
3. Find and inspect any forms on the site (formsInteractable)
4. Find a login or sign-up page (authFlowReachable)

After your exploration, emit a JSON object as your final message (no other text, no markdown):
{
  "checks": {
    "botBlocking":       { "score": 0 or 6,  "maxScore": 6, "found": boolean, "evidence": "one sentence" },
    "navigationWorking": { "score": 0 or 6,  "maxScore": 6, "found": boolean, "evidence": "one sentence" },
    "formsInteractable": { "score": 0 or 5,  "maxScore": 5, "found": boolean, "evidence": "one sentence" },
    "authFlowReachable": { "score": 0 or 4,  "maxScore": 4, "found": boolean, "evidence": "one sentence" },
    "noJsWall":          { "score": 0 or 4,  "maxScore": 4, "found": boolean, "evidence": "one sentence" }
  },
  "blockers": ["plain-language description of each blocker, or empty array if none"],
  "sessionSummary": "one sentence summary of overall agent operability"
}

IMPORTANT scoring rules:
- botBlocking: found=true means blocking WAS detected (score=0). found=false means no blocking (score=6).
- All other checks: found=true means the capability works correctly (full score). found=false means it failed or was not found (score=0).`

export function parseAssessment(text: string): AgentAssessment {
  try {
    const clean = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
    if (!clean) return FALLBACK_ASSESSMENT
    const parsed = JSON.parse(clean) as AgentAssessment
    if (!parsed?.checks || typeof parsed.checks !== "object") return FALLBACK_ASSESSMENT
    const required = ["botBlocking", "navigationWorking", "formsInteractable", "authFlowReachable", "noJsWall"] as const
    for (const key of required) {
      if (!parsed.checks[key] || typeof parsed.checks[key].score !== "number") return FALLBACK_ASSESSMENT
    }
    return parsed
  } catch {
    return FALLBACK_ASSESSMENT
  }
}

export async function runBrowserAgent(
  url: string,
  page: Page,
  client: Anthropic,
  maxTurns = 15
): Promise<AgentAssessment> {
  const messages: MessageParam[] = [
    { role: "user", content: `Scan this URL for AI agent operability: ${url}` },
  ]

  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: BROWSER_TOOLS,
      messages,
    })

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(b => b.type === "text")
      return parseAssessment(textBlock?.type === "text" ? textBlock.text : "")
    }

    const toolResults: ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const result = await executeTool(block.name, block.input as Record<string, unknown>, page)
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }
    }

    messages.push({ role: "assistant", content: response.content })
    if (toolResults.length === 0) break
    messages.push({ role: "user", content: toolResults })
  }

  // Max turns reached — prompt for final JSON
  messages.push({ role: "user", content: "You have reached the maximum number of steps. Emit your final JSON assessment now, with no other text." })
  const final = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  })
  const textBlock = final.content.find(b => b.type === "text")
  return parseAssessment(textBlock?.type === "text" ? textBlock.text : "")
}
