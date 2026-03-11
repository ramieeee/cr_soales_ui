"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ExtractionDock } from "@/components/extraction-session";
import { UploadStatusCard } from "@/components/upload-session";

const navItems = [
  { href: "/upload", label: "File Upload", short: "Upload" },
  { href: "/papers-staging", label: "Papers Staging", short: "Staging" },
  { href: "/papers", label: "Papers", short: "Papers" },
];

const sectionTitle = (pathname: string) => {
  if (pathname.startsWith("/papers-staging")) return "Staging Review";
  if (pathname.startsWith("/papers")) return "Paper Library";
  return "Ingestion";
};

export default function ProtectedShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-dvh px-4 py-4 text-[var(--text-primary)] md:px-6 md:py-6">
      <div className="mx-auto grid w-full max-w-[1480px] gap-4 xl:grid-cols-[296px_minmax(0,1fr)]">
        <aside className="surface-panel glass-highlight panel-rise rounded-[32px] p-4 md:p-5">
          <div className="surface-card halo-drift rounded-[28px] p-5">
            <p className="eyebrow">CR Soles</p>
            <h1 className="mt-4 font-[var(--font-display)] text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">
              Document operations tuned for fast review.
            </h1>
            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Upload, stage, validate, and extract without leaving one workspace.
            </p>
          </div>

          <nav className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[22px] border px-4 py-3 transition duration-200 ease-out ${
                    isActive
                      ? "border-[rgba(182,255,122,0.34)] bg-[rgba(182,255,122,0.12)] text-[#f6ffe7] shadow-[0_14px_32px_rgba(127,214,77,0.12)]"
                      : "border-white/10 bg-white/[0.025] text-[var(--text-secondary)] hover:border-white/18 hover:bg-white/[0.05] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] xl:hidden">
                    {item.short}
                  </span>
                  <span className="hidden text-sm font-semibold tracking-[-0.02em] xl:block">
                    {item.label}
                  </span>
                  <span className="mt-1 hidden text-xs leading-5 text-[var(--text-muted)] xl:block">
                    {item.href.replace("/", "") || "upload"}
                  </span>
                </Link>
              );
            })}
          </nav>

          <UploadStatusCard />

          <form action="/api/auth/logout" method="post" className="mt-4">
            <button type="submit" className="secondary-button w-full">
              Logout
            </button>
          </form>
        </aside>

        <div className="grid gap-4">
          <section className="surface-panel glass-highlight panel-rise rounded-[32px] px-5 py-5 md:px-7 md:py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow">Workspace</p>
                <h2 className="mt-3 font-[var(--font-display)] text-[1.9rem] font-semibold tracking-[-0.06em] text-balance md:text-[2.6rem]">
                  {sectionTitle(pathname)}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-[0.98rem]">
                  Cleaner visual hierarchy, stronger state feedback, and less
                  friction moving through ingestion and review.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 md:min-w-[340px]">
                <div className="metric-card">
                  <span className="metric-label">Mode</span>
                  <span className="metric-value text-[1.2rem]">Live</span>
                </div>
                <div className="metric-card">
                  <span className="metric-label">Route</span>
                  <span className="metric-value text-[1.2rem]">
                    {pathname.replace("/", "") || "upload"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <main className="surface-panel glass-highlight panel-rise rounded-[36px] px-4 py-4 md:px-6 md:py-6">
            {children}
          </main>
        </div>
      </div>

      <ExtractionDock />
    </div>
  );
}
