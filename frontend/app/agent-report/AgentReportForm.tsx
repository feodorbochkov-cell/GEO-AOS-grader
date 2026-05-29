"use client"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { normalizeUrl } from "@/lib/agent-check/url-utils"

export default function AgentReportForm() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const { domain } = normalizeUrl(url.trim())
      router.push(`/agent-report/${encodeURIComponent(domain)}`)
    } catch {
      setError("Enter a valid URL — e.g. stripe.com")
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="stripe.com or https://stripe.com"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
          required
        />
        <button
          type="submit"
          disabled={!url.trim()}
          className="rounded-lg bg-neutral-900 px-6 py-3 text-base font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Analyze
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-neutral-500">Scan takes ~15–30 seconds.</p>
    </form>
  )
}
