import Link from "next/link";

export default function RootPage() {
  return (
    <main className="soales-page relative flex min-h-dvh flex-col overflow-hidden">
      <nav className="fixed top-0 z-50 w-full bg-[rgba(5,10,24,0.82)] shadow-[0_20px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6">
          <Link
            href="/"
            className="soales-heading text-4xl leading-none tracking-[-0.02em] text-[#e5e7eb]"
          >
            SOALES
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            {[
              ["Connectomics", "/visualizations/connectomics"],
              ["Temporal", "/visualizations/temporal"],
              ["Spatial", "/visualizations/spatial"],
              ["Clusters", "/visualizations/clusters"],
              ["Methodology", "/visualizations/methodology"],
            ].map(([item, href], index) => (
              <Link
                key={item}
                href={href}
                className={`font-medium transition-colors hover:text-[#93c5fd] ${
                  index === 0 ? "font-bold text-[#93c5fd]" : "text-[#ccc3d8]"
                }`}
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="soales-button-primary px-4 py-2">
              Login
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative flex min-h-screen flex-1 items-center justify-center pt-16">
        <div className="soales-grid" />
        <div className="absolute inset-0 z-0 bg-[#020614] opacity-95" />
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-40 mix-blend-screen">
          <div className="h-[620px] w-[620px] rounded-full bg-[#38bdf8]/5 shadow-[0_0_130px_rgba(56,189,248,0.18)]" />
        </div>
        <div className="absolute inset-0 z-0 flex items-center justify-end pr-[10%] opacity-60">
          <div className="h-[500px] w-[500px] rounded-full bg-[#93c5fd]/5" />
        </div>

        <div className="relative z-10 mx-auto mt-4 flex w-full max-w-[1440px] flex-col items-center justify-between gap-12 px-6 md:mt-16 md:flex-row">
          <div className="flex max-w-2xl flex-1 flex-col gap-6">
            <h1 className="soales-heading text-5xl leading-[56px] text-[#dae2fd] md:text-[64px] md:leading-[72px]">
              Deep Insight <br />
              <span className="text-[#93c5fd]">Into the Human Mind</span>
            </h1>
            <p className="max-w-xl p-4 text-lg leading-7 text-[#ccc3d8]">
              A cognitive reserve research platform for data extraction and
              analysis.
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                href="/visualizations/connectomics"
                className="soales-button-primary"
              >
                View Data
              </Link>
              <Link
                href="/visualizations/connectomics"
                className="soales-button-secondary"
              >
                View Datasets
                <span className="material-symbols-outlined text-sm">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>

          <aside className="soales-glass soales-light-leak relative flex w-full max-w-md flex-1 flex-col gap-6 overflow-hidden p-6">
            <div className="relative z-10 flex items-end justify-between rounded-lg bg-[#121d39] p-4">
              <div>
                <span className="soales-mono uppercase text-[#ccc3d8]">
                  Active Nodes
                </span>
                <div className="soales-subheading mt-1 text-4xl text-[#dae2fd]">
                  42,891
                </div>
              </div>
              <span className="material-symbols-outlined text-4xl text-[#93c5fd]">
                bubble_chart
              </span>
            </div>
            <div className="relative z-10 space-y-4">
              {[
                ["Temporal Sync", "99.8%", "#ffb95f", "99.8%"],
                ["Spatial Resolution", "0.5mm3", "#38bdf8", "85%"],
              ].map(([label, value, color, width]) => (
                <div key={label}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#ccc3d8]">{label}</span>
                    <span className="soales-mono" style={{ color }}>
                      {value}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-[#2d3449]">
                    <div
                      className="h-1.5 rounded-full shadow-[0_0_10px_rgba(147,197,253,0.34)]"
                      style={{ width, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="relative z-10 mt-4 rounded-lg bg-[#080f22] p-4">
              <p className="soales-mono text-center text-[10px] uppercase tracking-widest text-[#ccc3d8]/50">
                Live telemetry stream active
              </p>
            </div>
          </aside>
        </div>
      </section>

      <footer className="bg-[#060e20]">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <div className="flex flex-col items-center gap-2 md:items-start">
            <span className="soales-mono text-[#dae2fd]">SOALES</span>
            <span className="text-sm text-[#ccc3d8]">
              © 2026 Cognitive Reserve SOALES Research Platform.
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-[#ccc3d8]">
            {["Privacy Policy", "Data Ethics", "Contact Lab"].map((item) => (
              <a
                key={item}
                href="#methodology"
                className="transition-colors hover:text-[#93c5fd]"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
