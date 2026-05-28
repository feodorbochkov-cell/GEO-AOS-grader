"use client";

import { use, useEffect, useState } from "react";

import ConfirmationForm from "@/components/ConfirmationForm";
import { getAnalysis } from "@/lib/api";
import type { AnalyzeStatus } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AnalyzePage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<AnalyzeStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      try {
        const fresh = await getAnalysis(id);
        if (cancelled) return;
        setData(fresh);
        if (fresh.status === "analyzing") {
          timer = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="mb-4 text-2xl font-semibold">Ошибка</h1>
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p className="text-neutral-500">Загружаем…</p>
      </main>
    );
  }

  if (data.status === "failed") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="mb-4 text-2xl font-semibold">Не получилось</h1>
        <p className="text-red-600">{data.error ?? "Неизвестная ошибка"}</p>
      </main>
    );
  }

  if (data.status === "analyzing") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">Анализируем сайт…</h1>
          <p className="text-neutral-600">
            Парсим {data.url}, извлекаем бренд, конкурентов и подбираем поисковые
            запросы. Обычно ~15 секунд.
          </p>
          <div className="h-1 w-full overflow-hidden rounded bg-neutral-200">
            <div className="h-full w-1/3 animate-pulse rounded bg-neutral-900" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <header className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Подтверди данные</h1>
        <p className="text-neutral-600">
          Проверь, что бренд, конкуренты и запросы определены верно. Поправь — затем
          запусти прогон через Perplexity.
        </p>
      </header>
      <ConfirmationForm data={data} />
    </main>
  );
}
