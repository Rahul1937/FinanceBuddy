export default function DashboardPage() {
  return (
    <section className="space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Overview of your spending, budgets, and recent activity.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          Dashboard placeholder card
        </div>
      </div>
    </section>
  );
}
