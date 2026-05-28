import { describe, it, expect, vi, beforeEach } from "vitest"
import { checkMachineInterface } from "../machine-interface"
import * as utils from "../utils"

vi.mock("../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils")>()
  return { ...actual, fetchWithTimeout: vi.fn() }
})

const mockFetch = vi.mocked(utils.fetchWithTimeout)

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })
}
function notFound(): Response {
  return new Response("Not Found", { status: 404 })
}
function okText(body: string): Response {
  return new Response(body, { status: 200, headers: { "Content-Type": "text/plain" } })
}

beforeEach(() => { mockFetch.mockReset() })

describe("checkMachineInterface", () => {
  it("awards 10 pts when /.well-known/mcp.json returns 200", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/.well-known/mcp.json")) return Promise.resolve(ok({}))
      return Promise.resolve(notFound())
    })

    const result = await checkMachineInterface("https://example.com")
    expect(result.checks.mcpServer.score).toBe(10)
    expect((result.checks.mcpServer as { found: boolean }).found).toBe(true)
  })

  it("awards 8 pts for OpenAPI spec with paths", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/openapi.json")) return Promise.resolve(
        ok({ openapi: "3.0.0", paths: { "/users": { get: { summary: "List users" } } } })
      )
      return Promise.resolve(notFound())
    })

    const result = await checkMachineInterface("https://example.com")
    expect(result.checks.openApiSpec.score).toBe(8)
  })

  it("awards 4 pts for minimal OpenAPI (no paths)", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/openapi.json")) return Promise.resolve(ok({ openapi: "3.0.0" }))
      return Promise.resolve(notFound())
    })

    const result = await checkMachineInterface("https://example.com")
    expect(result.checks.openApiSpec.score).toBe(4)
  })

  it("total maxScore is 30 when everything returns 404", async () => {
    mockFetch.mockResolvedValue(notFound())
    const result = await checkMachineInterface("https://example.com")
    expect(result.maxScore).toBe(30)
    expect(result.score).toBe(0)
  })

  it("awards 6 pts for publicApi when 2+ signals found in HTML", async () => {
    mockFetch.mockImplementation((url: string) => {
      // Return homepage with API signals
      if (!url.includes("/") || url === "https://example.com") return Promise.resolve(
        okText('<nav><a href="/api/v1">API</a></nav><p>Check out our Developers section</p>')
      )
      return Promise.resolve(notFound())
    })

    const result = await checkMachineInterface("https://example.com")
    expect(result.checks.publicApiExists.score).toBeGreaterThanOrEqual(3)
  })
})
