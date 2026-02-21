import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login | CR Soles",
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#0b0b0b] px-4 py-10 text-[#f2f2f2]">
      <section className="w-full max-w-md rounded-3xl border border-white/15 bg-[rgba(18,18,18,0.82)] p-8 shadow-[0_18px_55px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <h1 className="text-xl font-semibold tracking-tight">CR Soles Login</h1>
        <p className="mt-2 text-sm text-[#a5a5a5]">
          Enter the password to access
        </p>

        <form
          action="/api/auth/login"
          method="post"
          className="mt-6 grid gap-4"
        >
          <label className="grid gap-2 text-sm font-semibold">
            <span className="text-[#a5a5a5]">Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className='rounded-xl border border-white/[0.18] bg-[rgba(12,12,12,0.9)] px-[14px] py-3 text-sm text-[#f2f2f2] transition-[border-color,box-shadow] duration-200 ease-in focus:border-white/45 focus:outline-none focus:shadow-[0_0_0_3px_rgba(255,255,255,0.12)] [font-family:var(--font-body),"Helvetica_Neue",Arial,sans-serif]'
            />
          </label>

          {hasError ? (
            <p
              className="text-xs font-semibold text-[rgba(255,170,170,0.95)]"
              role="alert"
            >
              비밀번호가 올바르지 않습니다.
            </p>
          ) : null}

          <button
            type="submit"
            className="rounded-full bg-[linear-gradient(120deg,#f0f0f0,#cfcfcf)] px-6 py-3 text-sm font-semibold text-[#0b0b0b] transition-transform duration-150 ease-in hover:-translate-y-px"
          >
            Enter
          </button>
        </form>
      </section>
    </main>
  );
}
