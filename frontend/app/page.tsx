import UrlForm from "@/components/UrlForm";

const workflow = [
  {
    step: "01",
    title: "Считываем сайт",
    text: "Забираем главную страницу и ключевые разделы, чтобы понять бренд, рынок, продукты и конкурентов.",
  },
  {
    step: "02",
    title: "Собираем спрос",
    text: "Генерируем 10 коммерческих AI-запросов, которые покупатель реально задает перед выбором.",
  },
  {
    step: "03",
    title: "Проверяем выдачу",
    text: "Прогоняем запросы через Perplexity Sonar Pro и фиксируем упоминания, цитаты, источники и тональность.",
  },
];

const reportSignals = [
  "AEO Score 0-100",
  "Citation Rate",
  "Mention Rate",
  "Source Share of Voice",
  "Разбивка по 10 промптам",
  "Actionable-инсайты",
];

const sourceRows = [
  { domain: "brand.ru", value: 38, tone: "Бренд" },
  { domain: "reviewhub.ru", value: 24, tone: "Источник" },
  { domain: "competitor.ru", value: 18, tone: "Конкурент" },
  { domain: "media.ru", value: 12, tone: "Медиа" },
];

export default function HomePage() {
  return (
    <main className="landing-surface min-h-screen overflow-hidden bg-[#f6f1e8] text-[#17130f]">
      <section className="relative border-b border-[#17130f]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(176,53,26,0.18),transparent_32%),linear-gradient(135deg,rgba(23,19,15,0.08)_0,transparent_38%)]" />
        <div className="relative mx-auto grid min-h-[92vh] max-w-7xl gap-10 px-5 py-6 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10 lg:py-8">
          <div className="flex flex-col justify-between gap-12">
            <nav className="flex items-center justify-between text-xs uppercase text-[#17130f]/60">
              <span className="font-semibold text-[#17130f]">AEO Grader</span>
              <span>Single-shot AI visibility audit</span>
            </nav>

            <div className="max-w-3xl animate-rise space-y-8">
              <div className="inline-flex border border-[#17130f]/20 bg-[#fffaf1]/70 px-3 py-2 text-xs uppercase text-[#17130f]/70 shadow-sm backdrop-blur">
                Perplexity visibility report - без подписки
              </div>
              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-semibold leading-[0.95] sm:text-7xl lg:text-8xl [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
                  Покажите, как AI-поиск видит ваш бренд
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#413831] sm:text-xl">
                  AEO Grader прогоняет ваш сайт через поисковые сценарии Perplexity и
                  возвращает отчет: где бренд цитируют, где проигрывает конкурентам и
                  какие источники формируют выдачу.
                </p>
              </div>

              <div className="max-w-2xl border border-[#17130f]/15 bg-[#fffaf1]/85 p-4 shadow-[0_24px_80px_rgba(23,19,15,0.12)] backdrop-blur sm:p-6">
                <UrlForm />
              </div>
            </div>

            <div className="grid max-w-3xl grid-cols-3 border-y border-[#17130f]/15 text-sm text-[#4b4037]">
              <div className="py-4 pr-4">
                <div className="text-2xl font-semibold text-[#17130f]">10</div>
                <div>AI-запросов</div>
              </div>
              <div className="border-x border-[#17130f]/15 px-4 py-4">
                <div className="text-2xl font-semibold text-[#17130f]">60-90с</div>
                <div>до отчета</div>
              </div>
              <div className="py-4 pl-4">
                <div className="text-2xl font-semibold text-[#17130f]">0-100</div>
                <div>AEO Score</div>
              </div>
            </div>
          </div>

          <div className="flex items-center lg:justify-end">
            <ReportPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:px-10 lg:py-24">
        <div className="space-y-5">
          <p className="text-sm uppercase text-[#9d3d21]">Методология</p>
          <h2 className="text-4xl font-semibold leading-tight sm:text-5xl [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
            Аудит построен как реальный путь покупателя
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <article
              key={item.step}
              className="border border-[#17130f]/15 bg-[#fffaf1] p-6 shadow-sm"
            >
              <div className="mb-10 text-sm text-[#9d3d21]">{item.step}</div>
              <h3 className="mb-3 text-xl font-semibold">{item.title}</h3>
              <p className="leading-7 text-[#5c5148]">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#17130f]/10 bg-[#17130f] text-[#fff7ea]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10 lg:py-24">
          <div className="space-y-6">
            <p className="text-sm uppercase text-[#d9a441]">Что в отчете</p>
            <h2 className="text-4xl font-semibold leading-tight sm:text-5xl [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
              Не просто оценка, а карта источников влияния
            </h2>
            <p className="max-w-xl text-lg leading-8 text-[#d8cbbb]">
              Отчет показывает, почему AI-ответ сформировался именно так: какие
              домены цитируются, где бренд упомянут, а где конкуренты забирают
              видимость.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-[#fff7ea]/15 bg-[#fff7ea]/15">
            {reportSignals.map((signal) => (
              <div key={signal} className="bg-[#17130f] p-5 text-lg font-medium">
                {signal}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-24">
        <div className="space-y-6">
          <p className="text-sm uppercase text-[#9d3d21]">Для кого</p>
          <h2 className="text-4xl font-semibold leading-tight sm:text-5xl [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
            Для команд, которым нужен быстрый сигнал перед SEO, PR и контентом
          </h2>
          <p className="max-w-2xl text-lg leading-8 text-[#5c5148]">
            Используйте разовый аудит как входную диагностику: увидеть пробелы,
            сравнить себя с конкурентами и понять, какие страницы или публикации
            стоит усиливать в первую очередь.
          </p>
        </div>
        <div className="border border-[#17130f]/15 bg-[#fffaf1] p-6 shadow-sm">
          <div className="mb-8 flex items-center justify-between border-b border-[#17130f]/10 pb-4">
            <span className="text-sm uppercase text-[#17130f]/55">Готовность</span>
            <span className="bg-[#d9a441] px-3 py-1 text-sm font-semibold text-[#17130f]">
              Agent Friendly
            </span>
          </div>
          <div className="space-y-5">
            {["Бренд найден в ответах", "Источники цитируются стабильно", "Есть конкурентные разрывы"].map(
              (item) => (
                <div key={item} className="flex items-center gap-4">
                  <span className="h-3 w-3 bg-[#9d3d21]" />
                  <span className="text-lg">{item}</span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl border border-[#17130f]/15 bg-[#fffaf1] p-6 shadow-[0_24px_80px_rgba(23,19,15,0.10)] sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-sm uppercase text-[#9d3d21]">Запустить аудит</p>
              <h2 className="text-3xl font-semibold leading-tight sm:text-5xl [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
                Введите домен и получите первый срез AI-видимости
              </h2>
            </div>
            <UrlForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function ReportPreview() {
  return (
    <div className="animate-rise-delayed w-full max-w-xl border border-[#17130f]/15 bg-[#fffaf1] p-4 shadow-[0_34px_100px_rgba(23,19,15,0.18)] sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-[#17130f]/10 pb-5">
        <div>
          <p className="text-xs uppercase text-[#17130f]/50">Report preview</p>
          <h2 className="mt-2 text-2xl font-semibold">brand.ru</h2>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold leading-none [font-family:Georgia,'Iowan_Old_Style','Times_New_Roman',serif]">
            74
          </div>
          <p className="mt-1 text-xs uppercase text-[#9d3d21]">AEO Score</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Citation", "42%"],
          ["Mention", "68%"],
          ["Sentiment", "Mixed"],
        ].map(([label, value]) => (
          <div key={label} className="border border-[#17130f]/10 bg-white/50 p-4">
            <p className="text-xs uppercase text-[#17130f]/50">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Source Share of Voice</h3>
          <span className="text-xs uppercase text-[#17130f]/45">Top domains</span>
        </div>
        <div className="space-y-3">
          {sourceRows.map((row) => (
            <div key={row.domain} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{row.domain}</span>
                <span className="text-[#17130f]/55">{row.tone}</span>
              </div>
              <div className="h-2 bg-[#17130f]/10">
                <div
                  className="h-full bg-[#9d3d21]"
                  style={{ width: `${row.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 border border-[#17130f]/10 bg-[#17130f] p-4 text-[#fff7ea]">
        <p className="text-xs uppercase text-[#fff7ea]/50">Prompt sample</p>
        <p className="mt-3 leading-7">
          Какие сервисы выбрать для автоматизации поддержки в e-commerce?
        </p>
      </div>
    </div>
  );
}
