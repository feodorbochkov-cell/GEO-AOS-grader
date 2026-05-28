import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkMcpServerAgent, checkOpenApiSpecAgent, checkOAuthAgent } from "../phase2-agents"
import * as utils from "../utils"

vi.mock("../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils")>()
  return { ...actual, fetchWithTimeout: vi.fn(), callOpenRouter: vi.fn() }
})

const mockFetch = vi.mocked(utils.fetchWithTimeout)
const mockOpenRouter = vi.mocked(utils.callOpenRouter)

function notFound(): Response { return new Response("Not Found", { status: 404 }) }
function okText(body: string): Response { return new Response(body, { status: 200 }) }

beforeEach(() => {
  mockFetch.mockReset()
  mockOpenRouter.mockReset()
})

describe("checkMcpServerAgent", () => {
  it("returns found=true when Haiku identifies an MCP repo", async () => {
    mockFetch.mockResolvedValue(notFound())
    mockOpenRouter.mockResolvedValue(JSON.stringify({
      found: true,
      confidence: "high",
      evidence: "https://github.com/example/mcp-server",
      details: "Official MCP server repository",
    }))
    const result = await checkMcpServerAgent("https://example.com", "<html></html>")
    expect(result.found).toBe(true)
    expect(result.confidence).toBe("high")
    expect(result.evidence).toContain("github.com")
  })

  it("returns found=false with low confidence when Haiku finds nothing", async () => {
    mockFetch.mockResolvedValue(notFound())
    mockOpenRouter.mockResolvedValue(JSON.stringify({
      found: false,
      confidence: "high",
      evidence: "",
    }))
    const result = await checkMcpServerAgent("https://example.com", "")
    expect(result.found).toBe(false)
  })

  it("returns safe fallback on OpenRouter error", async () => {
    mockFetch.mockResolvedValue(notFound())
    mockOpenRouter.mockRejectedValue(new Error("timeout"))
    const result = await checkMcpServerAgent("https://example.com", "")
    expect(result.found).toBe(false)
    expect(result.confidence).toBe("low")
  })
})

describe("checkOpenApiSpecAgent", () => {
  it("returns found=true when Haiku finds a spec URL", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/developers")) return Promise.resolve(okText('<a href="/api/spec.json">OpenAPI</a>'))
      return Promise.resolve(notFound())
    })
    mockOpenRouter.mockResolvedValue(JSON.stringify({
      found: true,
      confidence: "high",
      evidence: "https://example.com/api/spec.json",
    }))
    const result = await checkOpenApiSpecAgent("https://example.com", "")
    expect(result.found).toBe(true)
    expect(result.evidence).toContain("spec.json")
  })
})

describe("checkOAuthAgent", () => {
  it("returns found=false with safe fallback on JSON parse error", async () => {
    mockFetch.mockResolvedValue(notFound())
    mockOpenRouter.mockResolvedValue("not valid json at all {{{")
    const result = await checkOAuthAgent("https://example.com", "")
    expect(result.found).toBe(false)
    expect(result.confidence).toBe("low")
  })
})
