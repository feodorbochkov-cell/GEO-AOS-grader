import { describe, it, expect } from "vitest"
import { normalizeUrl, checkRateLimit } from "../utils"

describe("normalizeUrl", () => {
  it("adds https:// when no scheme given", () => {
    const { url, domain } = normalizeUrl("stripe.com")
    expect(url).toBe("https://stripe.com")
    expect(domain).toBe("stripe.com")
  })

  it("strips www from domain", () => {
    const { domain } = normalizeUrl("https://www.github.com")
    expect(domain).toBe("github.com")
  })

  it("strips path, keeps origin only", () => {
    const { url } = normalizeUrl("https://stripe.com/docs/api")
    expect(url).toBe("https://stripe.com")
  })

  it("preserves https scheme", () => {
    const { url } = normalizeUrl("https://api.example.com")
    expect(url).toBe("https://api.example.com")
    expect(normalizeUrl("https://api.example.com").domain).toBe("example.com")
  })

  it("throws on clearly invalid input", () => {
    expect(() => normalizeUrl("not a url at all !!!")).toThrow()
  })
})

describe("checkRateLimit", () => {
  // Each test uses a unique IP to avoid cross-test state
  it("allows first request", () => {
    expect(checkRateLimit("1.1.1.1")).toBe(true)
  })

  it("blocks when limit exceeded", () => {
    const ip = "2.2.2.2"
    for (let i = 0; i < 10; i++) checkRateLimit(ip)
    expect(checkRateLimit(ip)).toBe(false)
  })

  it("allows up to the limit", () => {
    const ip = "3.3.3.3"
    for (let i = 0; i < 9; i++) checkRateLimit(ip)
    expect(checkRateLimit(ip)).toBe(true) // 10th request — allowed
  })
})
