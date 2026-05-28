import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkAuthSecurity } from "../auth-security"
import * as utils from "../utils"

vi.mock("../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils")>()
  return { ...actual, fetchWithTimeout: vi.fn() }
})

const mockFetch = vi.mocked(utils.fetchWithTimeout)

function ok(body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...headers },
  })
}
function notFound(): Response {
  return new Response("Not Found", { status: 404 })
}

beforeEach(() => { mockFetch.mockReset() })

describe("OAuth detection", () => {
  it("awards 8 pts when /.well-known/oauth-authorization-server returns valid JSON", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("oauth-authorization-server")) return Promise.resolve(ok({ issuer: "https://example.com" }))
      return Promise.resolve(notFound())
    })
    const result = await checkAuthSecurity("https://example.com")
    expect(result.checks.oauth.score).toBe(8)
    expect((result.checks.oauth as unknown as { method: string }).method).toBe("well-known")
  })

  it("awards 4 pts when OAuth 2.0 mentioned in /developers HTML", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/developers")) return Promise.resolve(
        new Response("<p>We support OAuth 2.0 flows.</p>", { status: 200 })
      )
      return Promise.resolve(notFound())
    })
    const result = await checkAuthSecurity("https://example.com")
    expect(result.checks.oauth.score).toBe(4)
    expect((result.checks.oauth as unknown as { method: string }).method).toBe("docs")
  })

  it("awards 0 pts when OAuth not found", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkAuthSecurity("https://example.com")
    expect(result.checks.oauth.score).toBe(0)
  })
})

describe("CORS detection", () => {
  it("awards 6 pts when Access-Control-Allow-Origin is *", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api")) return Promise.resolve(
        new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "*" } })
      )
      return Promise.resolve(notFound())
    })
    const result = await checkAuthSecurity("https://example.com")
    expect(result.checks.corsPolicy.score).toBe(6)
    expect((result.checks.corsPolicy as unknown as { policy: string }).policy).toBe("*")
  })

  it("awards 3 pts when Access-Control-Allow-Origin is a specific domain", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/api")) return Promise.resolve(
        new Response(null, { status: 200, headers: { "Access-Control-Allow-Origin": "https://app.example.com" } })
      )
      return Promise.resolve(notFound())
    })
    const result = await checkAuthSecurity("https://example.com")
    expect(result.checks.corsPolicy.score).toBe(3)
  })
})

describe("checkAuthSecurity totals", () => {
  it("maxScore is 20", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkAuthSecurity("https://example.com")
    expect(result.maxScore).toBe(20)
  })
})
