import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/transactions/new", label: "Add transaction" },
  { href: "/budgets", label: "Budgets" },
  { href: "/insights", label: "Insights" },
  { href: "/settings", label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Finance Buddy</p>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-2xl px-4 py-3 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
