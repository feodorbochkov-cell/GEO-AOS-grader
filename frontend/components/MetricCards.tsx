import type { ReportOut } from "@/lib/types";
import { SENTIMENT_LABEL, formatPercent } from "@/lib/score";

interface Props {
  report: ReportOut;
}

function authorityRank(report: ReportOut): string {
  const sov = report.source_share_of_voice ?? [];
  const idx = sov.findIndex((e) => e.is_brand);
  if (idx < 0) return "Вне топ-15";
  return `#${idx + 1} из ${sov.length}`;
}

export default function MetricCards({ report }: Props) {
  const cards = [
    {
      label: "Citation Rate",
      value: formatPercent(report.citation_rate),
      hint: "Доля запросов, где бренд цитируется в источниках",
    },
    {
      label: "Mention Rate",
      value: formatPercent(report.mention_rate),
      hint: "Доля запросов, где бренд назван в тексте ответа",
    },
    {
      label: "Sentiment",
      value: report.sentiment_summary ? SENTIMENT_LABEL[report.sentiment_summary] ?? "—" : "—",
      hint: "Агрегированная тональность упоминаний",
    },
    {
      label: "Authority Rank",
      value: authorityRank(report),
      hint: "Место бренда в Source Share of Voice",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{c.label}</p>
          <p className="mt-2 text-3xl font-semibold text-neutral-900">{c.value}</p>
          <p className="mt-3 text-xs text-neutral-500">{c.hint}</p>
        </div>
      ))}
    </section>
  );
}
