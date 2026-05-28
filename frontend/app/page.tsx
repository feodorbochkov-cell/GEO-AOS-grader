import UrlForm from "@/components/UrlForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-8">
      <div className="space-y-6">
        <header className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight">AEO Grader</h1>
          <p className="max-w-xl text-lg text-neutral-600">
            Узнай, как твой бренд виден в AI-поисковой выдаче Perplexity. Один прогон,
            10 запросов, разовый отчёт со Score 0–100.
          </p>
        </header>
        <UrlForm />
      </div>
    </main>
  );
}
