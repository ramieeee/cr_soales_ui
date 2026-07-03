import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login | SOALES",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="soales-page relative grid min-h-dvh place-items-center overflow-hidden px-6 py-10">
      <Link
        href="/"
        className="soales-button-secondary fixed left-6 top-6 z-20 px-4 py-2"
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        Home
      </Link>

      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <div className="absolute h-[800px] w-[800px] rounded-full bg-[#38bdf8]/5 blur-[120px] mix-blend-screen" />
        <div className="absolute h-[600px] w-[600px] translate-x-1/2 -translate-y-1/4 rounded-full bg-[#93c5fd]/5 blur-[100px] mix-blend-screen" />
      </div>

      <section className="relative z-10 flex w-full max-w-[480px] flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-4">
          <div className="text-center">
            <h1 className="soales-heading mb-2 hidden text-5xl leading-[56px] tracking-[-0.02em] text-[#e5e7eb] md:block">
              SOALES PROJECT
            </h1>
          </div>
        </div>

        <div className="soales-panel soales-light-leak relative w-full rounded-xl bg-[#0b1326]/80 p-8 shadow-2xl backdrop-blur-xl">
          <form
            action="/api/auth/login"
            method="post"
            className="relative z-10 flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <label className="soales-mono text-[#ccc3d8]" htmlFor="email">
                Email Address
              </label>
              <div className="soales-input-wrap">
                <input
                  className="soales-input"
                  id="email"
                  name="email"
                  placeholder="sample@sample.com"
                  required
                  type="email"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  className="soales-mono text-[#ccc3d8]"
                  htmlFor="password"
                >
                  Password
                </label>
              </div>
              <div className="soales-input-wrap">
                <input
                  className="soales-input tracking-widest"
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {hasError ? (
              <p className="rounded bg-[#93000a]/20 px-3 py-2 text-sm text-[#ffdad6]">
                이메일 또는 비밀번호가 올바르지 않습니다.
              </p>
            ) : null}

            <button
              className="soales-button-primary mt-4 w-full text-[18px]"
              type="submit"
            >
              <span>Sign In</span>
              <span className="material-symbols-outlined text-[20px]">
                arrow_forward
              </span>
            </button>
          </form>

          <div className="relative z-10 mt-8 bg-[#070b16] p-4 text-center">
            <p className="text-sm leading-6 text-[#ccc3d8]">Access required</p>
          </div>
        </div>
      </section>
    </main>
  );
}
