import type { Metadata } from "next";

import sample from "@/test/extractions.sample.json";
import { CountryGlobe } from "@/components/visualizations/country-globe";

export const metadata: Metadata = {
  title: "CR Soles | Visualizations",
  description: "Public visualization dashboard for extraction samples.",
};

type ExtractionRow = {
  paper_id: string;
  sample_jsonb: {
    population: {
      country_setting: string | null;
    } | null;
  };
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

const toCountryCounts = (counts: Map<string, number>) => {
  return Array.from(counts.entries())
    .filter(([label]) => label !== "(missing)")
    .sort((a, b) => b[1] - a[1])
    .map(([country, count]) => ({ country, count }));
};

export default function VisualizationsPage() {
  const extractions = asExtractions(sample);
  const paperCount = new Set(extractions.map((row) => row.paper_id)).size;
  const allCountryCounts = countBy(
    extractions.map(
      (row) => row.sample_jsonb.population?.country_setting ?? null,
    ),
  );

  const countries = toCountryCounts(allCountryCounts);
  const topCountry = countries[0] ?? null;
  const missingCountryCount = allCountryCounts.get("(missing)") ?? 0;

  return (
    <div className="min-h-dvh bg-[linear-gradient(180deg,#000000_0%,#020308_100%)] text-neutral-100">
      <div className="mx-auto grid min-h-dvh w-full max-w-none grid-cols-1 px-4 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:px-6 md:py-4">
        <aside className="hidden md:flex md:flex-col md:justify-between">
          <div className="space-y-8 pt-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                CR Soles
              </p>
              <h1 className="font-[var(--font-display)] text-base font-semibold text-white">
                Visualizations
              </h1>
            </div>

            <nav className="space-y-2 text-sm">
              <a href="#globe" className="block text-slate-400 transition-colors hover:text-white">
                Globe
              </a>
            </nav>
          </div>
        </aside>

        <main id="globe" className="min-w-0">
          <CountryGlobe
            countries={countries}
            meta={{
              paperCount,
              extractionCount: extractions.length,
              topCountry: topCountry?.country ?? null,
              topCountryCount: topCountry?.count ?? 0,
              missingCountryCount,
            }}
          />
        </main>
      </div>
    </div>
  );
}
