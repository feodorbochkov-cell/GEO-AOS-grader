import { describe, it, expect, vi, beforeEach } from "vitest"
import { extractNavLinks, buildCandidates } from "../page-router"
import * as utils from "../utils"

vi.mock("../utils", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils")>()
  return { ...actual, fetchWithTimeout: vi.fn() }
})

const mockFetch = vi.mocked(utils.fetchWithTimeout)

function notFound(): Response { return new Response("Not Found", { status: 404 }) }
function okText(body: string): Response { return new Response(body, { status: 200 }) }

beforeEach(() => { mockFetch.mockReset() })

describe("extractNavLinks", () => {
  it("extracts links from nav elements", () => {
    const html = `<nav><a href="/docs">Docs</a><a href="/api">API</a></nav>`
    const result = extractNavLinks(html, "https://example.com")
    expect(result).toContain("https://example.com/docs")
    expect(result).toContain("https://example.com/api")
  })

  it("includes doc subdomain links from nav", () => {
    const html = `<nav><a href="https://docs.example.com/sdk">SDK</a></nav>`
    const result = extractNavLinks(html, "https://example.com")
    expect(result).toContain("https://docs.example.com/sdk")
  })

  it("excludes external unrelated domains", () => {
    const html = `<nav><a href="https://twitter.com/example">Twitter</a></nav>`
    const result = extractNavLinks(html, "https://example.com")
    expect(result).not.toContain("https://twitter.com/example")
  })

  it("picks up keyword-bearing links outside structural elements", () => {
    const html = `<div><a href="/developers/sdk">SDK</a></div>`
    const result = extractNavLinks(html, "https://example.com")
    expect(result).toContain("https://example.com/developers/sdk")
  })

  it("ignores hash and query-only hrefs", () => {
    const html = `<nav><a href="#section">Section</a><a href="?tab=1">Tab</a></nav>`
    const result = extractNavLinks(html, "https://example.com")
    expect(result).toHaveLength(0)
  })
})

describe("buildCandidates", () => {
  it("merges nav links and sitemap candidates, capped at 35", async () => {
    const html = `<nav><a href="/docs">Docs</a></nav>`
    mockFetch
      .mockResolvedValueOnce(okText("Sitemap: https://example.com/sitemap.xml"))
      .mockResolvedValueOnce(okText(`
        <urlset>
          <url><loc>https://example.com/api/reference</loc></url>
          <url><loc>https://example.com/developers</loc></url>
        </urlset>
      `))
    const result = await buildCandidates(html, "https://example.com")
    expect(result).toContain("https://example.com/docs")
    expect(result).toContain("https://example.com/api/reference")
    expect(result.length).toBeLessThanOrEqual(35)
  })

  it("adds fallback paths when nav yields fewer than 3 links", async () => {
    const html = `<html></html>`
    mockFetch.mockResolvedValue(notFound())
    const result = await buildCandidates(html, "https://example.com")
    expect(result).toContain("https://example.com/docs")
  })

  it("deduplicates URLs across nav and sitemap", async () => {
    const html = `<nav><a href="/docs">Docs</a></nav>`
    mockFetch
      .mockResolvedValueOnce(okText("Sitemap: https://example.com/sitemap.xml"))
      .mockResolvedValueOnce(okText(`<urlset><url><loc>https://example.com/docs</loc></url></urlset>`))
    const result = await buildCandidates(html, "https://example.com")
    expect(result.filter(u => u === "https://example.com/docs")).toHaveLength(1)
  })
})
