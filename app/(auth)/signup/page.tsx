import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6 py-16 dark:bg-slate-950">
      <div className="w-full max-w-md space-y-8 rounded-3xl bg-white p-10 shadow-xl dark:bg-slate-900">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Create your account</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Start tracking your spending with Finance Buddy.</p>
        </div>
        <form className="space-y-6">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Full name</span>
            <input type="text" placeholder="Jane Doe" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</span>
            <input type="email" placeholder="you@example.com" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-500" />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</span>
            <input type="password" placeholder="Password" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:focus:border-slate-500" />
          </label>
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">
            Create account
          </button>
        </form>
        <p className="text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account? <Link href="/login" className="font-semibold text-slate-900 hover:underline dark:text-slate-100">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
