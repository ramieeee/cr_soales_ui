import type { Metadata } from "next";

import sample from "@/test/extractions.sample.json";
import { CountryGlobe } from "@/components/visualizations/country-globe";

export const metadata: Metadata = {
  title: "CR Soles | Visualizations",
  description: "Public visualization dashboard for extraction samples.",
};

type EvidenceItem = {
  page: number;
  quote: string;
};

type PopulationExtraction = {
  population_summary: string;
  target_population: string | null;
  age_band: "young" | "middle" | "older" | "mixed" | null;
  clinical_condition_tags: string[];
  country_setting: string | null;
  evidence: EvidenceItem[];
  confidence: number;
};

type InstrumentExtraction = {
  instrument_name: string | null;
  instrument_family: Array<
    | "CRIq"
    | "CRQ"
    | "LEQ"
    | "NART"
    | "MWT-B"
    | "mCRS"
    | "CRASH"
    | "CR-interview"
    | "multi_proxy_custom"
    | "not_detected"
  >;
  detected_proxy_labels: string[];
  scoring_method: string | null;
  time_administration: string | null;
  evidence: EvidenceItem[];
  confidence: number;
};

type ExtractionRow = {
  id: string;
  paper_id: string;
  extraction_version: string;
  metadata_jsonb: Record<string, unknown>;
  study_design_jsonb: Record<string, unknown>;
  sample_jsonb: {
    population: PopulationExtraction | null;
    instrument: InstrumentExtraction | null;
  };
  outcomes_jsonb: Record<string, unknown>;
  risk_of_bias_jsonb: Record<string, unknown>;
  extraction_timestamp: string;
  status: "success" | "partial" | "failed";
};

const asExtractions = (value: unknown): ExtractionRow[] => {
  if (!value || typeof value !== "object") return [];
  const payload = value as { extractions?: unknown };
  if (!Array.isArray(payload.extractions)) return [];
  return payload.extractions.filter(
    (item): item is ExtractionRow => typeof item === "object" && item !== null,
  );
};

const countBy = (items: Array<string | null | undefined>) => {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item?.trim() ? item.trim() : "(missing)";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const mean = (values: number[]) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel?: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/5 p-5 shadow-[0_16px_50px_rgba(2,6,23,0.2)] backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 font-[var(--font-display)] text-3xl font-semibold text-white">
        {value}
      </p>
      {sublabel ? (
        <p className="mt-1 text-sm text-slate-400">{sublabel}</p>
      ) : null}
    </div>
  );
}

const toCountryCounts = (counts: Map<string, number>) => {
  return Array.from(counts.entries())
    .filter(([label]) => label !== "(missing)")
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }));
};

function CountryLeaderboard({
  countries,
}: {
  countries: { country: string; count: number }[];
}) {
  const total = countries.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(1, ...countries.map((item) => item.count));
  const topCountries = countries.slice(0, 10);
  const leader = topCountries[0];

  return (
    <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f7c97c]">
        Country ranking
      </p>
      <h2 className="mt-3 font-[var(--font-display)] text-2xl font-semibold text-white">
        Study density
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        Where the sample set is concentrated across mapped extraction records.
      </p>

      {leader ? (
        <div className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(247,201,124,0.16),rgba(15,23,42,0.2))] p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#f8deb1]">
                Most represented
              </p>
              <p className="mt-2 font-[var(--font-display)] text-3xl font-semibold text-white">
                {leader.country}
              </p>
            </div>
            <div className="text-right">
              <p className="font-[var(--font-display)] text-5xl font-semibold leading-none text-white">
                {leader.count}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-300">
                mentions
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2 rounded-2xl border border-white/8 bg-slate-950/45 p-3 text-center">
        <div>
          <p className="font-[var(--font-display)] text-2xl text-white">
            {countries.length}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Countries
          </p>
        </div>
        <div>
          <p className="font-[var(--font-display)] text-2xl text-white">
            {total}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Mentions
          </p>
        </div>
        <div>
          <p className="font-[var(--font-display)] text-2xl text-white">
            {max}
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
            Peak
          </p>
        </div>
      </div>

      <div className="mt-6">
        {topCountries.map((item, index) => {
          const share = total ? Math.round((item.count / total) * 100) : 0;
          const width = `${Math.max(10, (item.count / max) * 100)}%`;

          return (
            <div
              key={item.country}
              className="border-b border-white/8 py-3 last:border-b-0"
            >
              <div className="flex items-baseline justify-between gap-4">
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="font-[var(--font-display)] text-sm text-slate-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate text-sm font-medium text-white">
                    {item.country}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-[var(--font-display)] text-xl text-white">
                    {item.count}
                  </span>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {share}%
                  </span>
                </div>
              </div>
              <div className="mt-2 h-px w-full bg-white/8">
                <div
                  className="h-px bg-[linear-gradient(90deg,#f7c97c_0%,#f59e0b_45%,#fff1d6_100%)]"
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function VisualizationsPage() {
  const extractions = asExtractions(sample);

  const paperCount = new Set(extractions.map((row) => row.paper_id)).size;
  const statusCounts = countBy(extractions.map((row) => row.status));

  const populationConfidence = extractions
    .map((row) => row.sample_jsonb.population?.confidence)
    .filter((value): value is number => typeof value === "number")
    .map(clamp01);

  const instrumentConfidence = extractions
    .map((row) => row.sample_jsonb.instrument?.confidence)
    .filter((value): value is number => typeof value === "number")
    .map(clamp01);

  const avgPopulationConfidence = mean(populationConfidence);
  const avgInstrumentConfidence = mean(instrumentConfidence);

  const countryCounts = countBy(
    extractions.map(
      (row) => row.sample_jsonb.population?.country_setting ?? null,
    ),
  );

  const countries = toCountryCounts(countryCounts);

  const successCount = statusCounts.get("success") ?? 0;
  const successRate = extractions.length
    ? Math.round((successCount / extractions.length) * 100)
    : 0;

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_26%),linear-gradient(180deg,#020617_0%,#06101f_40%,#020617_100%)] text-neutral-100">
      <div className="mx-auto w-full max-w-[1360px] px-4 py-10 md:px-6">
        <div className="grid gap-10 md:grid-cols-[160px_1fr]">
          <aside className="md:sticky md:top-10 md:self-start">
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  CR Soles
                </p>
                <p className="font-[var(--font-display)] text-sm font-semibold text-white">
                  Visualizations
                </p>
              </div>

              <nav className="grid gap-2 text-sm">
                <a
                  href="#overview"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Overview
                </a>
                <a
                  href="#countries"
                  className="text-slate-400 transition-colors hover:text-white"
                >
                  Countries
                </a>
              </nav>
            </div>
          </aside>

          <main className="min-w-0">
            <header className="rounded-[32px] border border-white/10 bg-white/5 px-6 py-7 shadow-[0_24px_80px_rgba(2,6,23,0.3)] backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
                Public visualization
              </p>
              <h1 className="mt-3 font-[var(--font-display)] text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Extraction Visualizations
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Local sample data rendered as a cleaner research dashboard:
                stronger globe scene, clearer country ranking, and less
                placeholder-looking chrome.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                {extractions.length} extractions · {paperCount} papers
              </p>
            </header>

            <section id="overview" className="mt-8 scroll-mt-10">
              <div className="grid gap-4 md:grid-cols-4">
                <StatCard label="Papers" value={String(paperCount)} />
                <StatCard
                  label="Extractions"
                  value={String(extractions.length)}
                />
                <StatCard
                  label="Success Rate"
                  value={`${successRate}%`}
                  sublabel="status=success"
                />
                <StatCard
                  label="Avg Confidence"
                  value={`${Math.round(((avgPopulationConfidence + avgInstrumentConfidence) / 2) * 100)}%`}
                  sublabel={`population ${Math.round(avgPopulationConfidence * 100)}% · instrument ${Math.round(avgInstrumentConfidence * 100)}%`}
                />
              </div>
            </section>

            <section id="countries" className="mt-8 scroll-mt-10">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_380px]">
                <CountryGlobe countries={countries} />
                <CountryLeaderboard countries={countries} />
              </div>
            </section>

            <footer className="mt-10 text-xs text-slate-500">
              Data source: test/extractions.sample.json
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
