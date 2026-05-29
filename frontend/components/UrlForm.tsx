"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createAnalysis } from "@/lib/api";

export default function UrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const trimmed = url.trim();
      const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      const { id } = await createAnalysis(normalized);
      router.push(`/analyze/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com or https://example.com"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-base outline-none focus:border-neutral-900"
          required
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-lg bg-neutral-900 px-6 py-3 text-base font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Starting…" : "Analyze"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-neutral-500">
        Analysis takes ~15 seconds + ~60 seconds for the report.
      </p>
    </form>
  );
}
