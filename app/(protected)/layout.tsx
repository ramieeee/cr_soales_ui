import Link from "next/link";
import { UploadSessionProvider, UploadStatusCard } from "@/components/upload-session";

const navItems = [
  { href: "/upload", label: "File Upload" },
  { href: "/papers-staging", label: "Papers Staging" },
  { href: "/papers", label: "Papers" },
];

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <UploadSessionProvider>
      <div className="min-h-dvh bg-[#0b0b0b] text-[#f2f2f2]">
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-4 py-6 md:grid-cols-[240px_1fr] md:px-6">
          <aside className="rounded-2xl border border-white/15 bg-[rgba(18,18,18,0.8)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a5a5a5]">
              CR SOLES
            </p>
            <nav className="mt-5 grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-[#d8d8d8] hover:border-white/30 hover:bg-white/[0.04]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <UploadStatusCard />

            <form action="/api/auth/logout" method="post" className="mt-8">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/15 bg-[rgba(20,20,20,0.9)] px-3 py-2 text-sm font-semibold text-[#e5e5e5] hover:border-white/30"
              >
                Logout
              </button>
            </form>
          </aside>

          <main className="rounded-2xl border border-white/15 bg-[rgba(18,18,18,0.72)] p-5 md:p-7">
            {children}
          </main>
        </div>
      </div>
    </UploadSessionProvider>
  );
}
