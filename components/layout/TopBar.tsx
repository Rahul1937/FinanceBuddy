export default function TopBar() {
  return (
    <header className="border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Finance Buddy</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">Manage your money with confidence.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            Account
          </button>
        </div>
      </div>
    </header>
  );
}
