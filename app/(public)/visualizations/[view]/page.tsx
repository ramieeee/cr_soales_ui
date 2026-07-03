import Link from "next/link";
import { notFound } from "next/navigation";

const modules = {
  connectomics: {
    label: "Connectomics",
    icon: "hub",
    accent: "#93c5fd",
    title: "Connectomics Array",
    subtitle: "A sample neural network canvas for reviewing reserve-linked nodes.",
    metric: "42,891",
    metricLabel: "Active Nodes",
  },
  temporal: {
    label: "Temporal",
    icon: "bar_chart",
    accent: "#ffb95f",
    title: "Temporal Dynamics",
    subtitle: "A sample 3D histogram module for epoch-level cognitive response.",
    metric: "3,492ms",
    metricLabel: "Peak Amplitude",
  },
  spatial: {
    label: "Spatial",
    icon: "travel_explore",
    accent: "#38bdf8",
    title: "Spatial Resolution",
    subtitle: "A sample spatial field map for geographic and scan-region analysis.",
    metric: "0.5mm3",
    metricLabel: "Resolution",
  },
  global: {
    label: "Global",
    icon: "public",
    accent: "#38bdf8",
    title: "Global Distribution",
    subtitle: "A sample global distribution surface for extraction provenance.",
    metric: "31",
    metricLabel: "Countries",
  },
  clusters: {
    label: "Clusters",
    icon: "bubble_chart",
    accent: "#93c5fd",
    title: "Cognitive Clusters",
    subtitle: "A sample cluster-identification module for grouped activity patterns.",
    metric: "92%",
    metricLabel: "Correlation",
  },
  methodology: {
    label: "Methodology",
    icon: "science",
    accent: "#ffb95f",
    title: "Methodology Pipeline",
    subtitle: "A sample protocol page for extraction, validation, and projection flow.",
    metric: "03",
    metricLabel: "Pipeline Stages",
  },
} as const;

const navItems = Object.entries(modules).map(([key, value]) => ({
  href: `/visualizations/${key}`,
  key,
  ...value,
}));

type ViewKey = keyof typeof modules;

export function generateStaticParams() {
  return Object.keys(modules).map((view) => ({ view }));
}

export default async function VisualizationModulePage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!(view in modules)) notFound();

  const key = view as ViewKey;
  const module = modules[key];

  return (
    <div className="soales-page min-h-dvh">
      <aside className="soales-rail soales-rail-pinned group hidden pt-24 md:flex">
        <nav className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`soales-rail-link ${
                item.key === key ? "soales-rail-link-active" : ""
              }`}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={
                  item.key === key
                    ? { fontVariationSettings: "'FILL' 1" }
                    : undefined
                }
              >
                {item.icon}
              </span>
              <span className="soales-rail-label soales-mono">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <Link href="/" className="soales-rail-link">
            <span className="material-symbols-outlined shrink-0">home</span>
            <span className="soales-rail-label soales-mono">Home</span>
          </Link>
        </div>
      </aside>

      <main className="flex min-h-dvh w-full flex-col gap-8 px-6 py-10 md:ml-48 md:w-[calc(100%-12rem)] md:p-16">
        <header className="mx-auto w-full max-w-[1440px]">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="soales-chip mb-5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: module.accent }}
                />
                <span className="soales-mono" style={{ color: module.accent }}>
                  {module.label.toUpperCase()}_MODULE
                </span>
              </div>
              <h1 className="soales-heading text-5xl leading-[56px] text-[#e5e7eb] md:text-[64px] md:leading-[72px]">
                {module.title}
              </h1>
              <p className="mt-5 max-w-2xl text-[#ccc3d8]">{module.subtitle}</p>
            </div>
            <div className="soales-panel min-w-64 p-5">
              <p className="soales-mono text-[#ccc3d8]">{module.metricLabel}</p>
              <p
                className="soales-heading mt-2 text-5xl"
                style={{ color: module.accent }}
              >
                {module.metric}
              </p>
            </div>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1440px] grid-cols-1 gap-8 xl:grid-cols-12">
          <div className="relative min-h-[560px] overflow-hidden xl:col-span-8">
            <div className="relative h-full min-h-[510px] overflow-hidden">
              {key === "methodology" ? (
                <Pipeline accent={module.accent} />
              ) : key === "temporal" ? (
                <Histogram accent={module.accent} />
              ) : (
                <ParticleField accent={module.accent} dense={key === "clusters"} />
              )}
            </div>
          </div>

          <aside className="flex flex-col gap-4 xl:col-span-4">
            {[
              ["Signal Integrity", "99.8%", "#93c5fd"],
              ["Sample Coverage", "84.2%", "#38bdf8"],
              ["Variance", "±12.4%", "#ffb95f"],
            ].map(([label, value, color]) => (
              <div key={label} className="soales-panel p-5">
                <p className="soales-mono text-[#ccc3d8]">{label}</p>
                <p className="soales-subheading mt-3 text-3xl" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
            <div className="soales-panel p-5">
              <p className="soales-mono mb-3 text-[#ffb95f]">SAMPLE STATUS</p>
              <p className="text-sm leading-6 text-[#ccc3d8]">
                This is a linked sample module. Live data wiring can be attached
                later without changing the navigation structure.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Histogram({ accent }: { accent: string }) {
  return (
    <div className="absolute inset-x-8 bottom-12 grid h-[72%] grid-cols-[repeat(14,minmax(0,1fr))] items-end gap-3">
      {Array.from({ length: 14 }).map((_, index) => (
        <div
          key={index}
          className="rounded-t opacity-85"
          style={{
            height: `${24 + ((index * 29) % 74)}%`,
            background: "#38bdf8",
            boxShadow: `0 0 28px ${accent}44`,
          }}
        />
      ))}
    </div>
  );
}

function ParticleField({ accent, dense }: { accent: string; dense?: boolean }) {
  const count = dense ? 58 : 34;
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="absolute rounded-full"
          style={{
            width: `${10 + (index % 7) * 7}px`,
            height: `${10 + (index % 7) * 7}px`,
            left: `${8 + ((index * 19) % 82)}%`,
            top: `${10 + ((index * 31) % 76)}%`,
            backgroundColor:
              index % 3 === 0
                ? "rgba(147,197,253,0.76)"
                : index % 3 === 1
                  ? "rgba(255,185,95,0.7)"
                  : "rgba(56,189,248,0.7)",
            boxShadow: `0 0 30px ${accent}55`,
          }}
        />
      ))}
    </>
  );
}

function Pipeline({ accent }: { accent: string }) {
  return (
    <div className="grid h-full min-h-[510px] place-items-center p-8">
      <div className="grid w-full gap-5 md:grid-cols-3">
        {[
          ["01", "Extract", "Normalize paper source data."],
          ["02", "Validate", "Review staging metadata."],
          ["03", "Project", "Publish client visual modules."],
        ].map(([step, title, copy]) => (
          <div
            key={step}
            className="rounded-lg p-6"
            style={{ boxShadow: `0 0 34px ${accent}22` }}
          >
            <p className="soales-mono" style={{ color: accent }}>
              {step}
            </p>
            <h3 className="soales-subheading mt-5 text-2xl text-[#dae2fd]">
              {title}
            </h3>
            <p className="mt-4 text-sm leading-6 text-[#ccc3d8]">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
