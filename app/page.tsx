import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white/90 p-10 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:shadow-slate-950/20">
        <h1 className="text-4xl font-semibold tracking-tight">Finance Buddy</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-400">
          Track expenses, set budgets, and get AI-powered spending insights across devices.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/login" className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
            Sign in
          </Link>
          <Link href="/signup" className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            Create account
          </Link>
        </div>
      </div>
    </main>
  );
}
