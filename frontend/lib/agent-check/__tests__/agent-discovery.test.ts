import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkAgentDiscovery } from "../agent-discovery"
import * as utils from "../utils"

vi.mock("../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils")>()
  return { ...actual, fetchWithTimeout: vi.fn() }
})

const mockFetch = vi.mocked(utils.fetchWithTimeout)

function ok(body: string, ct = "text/plain"): Response {
  return new Response(body, { status: 200, headers: { "Content-Type": ct } })
}
function notFound(): Response {
  return new Response("Not Found", { status: 404 })
}

beforeEach(() => { mockFetch.mockReset() })

describe("llms.txt scoring", () => {
  it("awards 0 pts when llms.txt not found", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.llmsTxt.score).toBe(0)
    expect((result.checks.llmsTxt as { found: boolean }).found).toBe(false)
  })

  it("awards base 2 pts when llms.txt found", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/llms.txt")) return Promise.resolve(ok("# Hello world"))
      return Promise.resolve(notFound())
    })
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.llmsTxt.score).toBeGreaterThanOrEqual(2)
  })

  it("awards +3 when llms.txt has ## Tools section", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/llms.txt")) return Promise.resolve(ok("# Intro\n## Tools\nsome tool info"))
      return Promise.resolve(notFound())
    })
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.llmsTxt.score).toBeGreaterThanOrEqual(5) // 2 base + 3 sections
    expect((result.checks.llmsTxt as unknown as { hasActionSections: boolean }).hasActionSections).toBe(true)
  })
})

describe("robots.txt AI scoring", () => {
  it("awards 6 pts when robots.txt not found (allowed by default)", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.robotsTxtAi.score).toBe(6)
  })

  it("awards 0 pts when all bots blocked via wildcard Disallow: /", async () => {
    const robotsTxt = "User-agent: *\nDisallow: /"
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/robots.txt")) return Promise.resolve(ok(robotsTxt))
      return Promise.resolve(notFound())
    })
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.robotsTxtAi.score).toBe(0)
  })

  it("awards full pts when only non-AI bots are restricted", async () => {
    const robotsTxt = "User-agent: Googlebot\nDisallow: /private"
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/robots.txt")) return Promise.resolve(ok(robotsTxt))
      return Promise.resolve(notFound())
    })
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.checks.robotsTxtAi.score).toBe(6)
  })
})

describe("checkAgentDiscovery totals", () => {
  it("maxScore is 25", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkAgentDiscovery("https://example.com")
    expect(result.maxScore).toBe(25)
  })
})
