export default function SummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {['Total spent', 'Total income', 'Budget health'].map((label) => (
        <div key={label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">--</p>
        </div>
      ))}
    </div>
  );
}
