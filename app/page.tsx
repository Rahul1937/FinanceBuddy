import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--surface-base)] px-6 py-16">
      {/* Subtle background glow */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 50% 20%, rgba(229,83,61,0.10), transparent 60%)",
        }}
      />

      <div className="w-full max-w-lg text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-soft)] ring-1 ring-[var(--brand)]/20">
            <span className="font-display text-3xl font-bold text-[var(--brand)]">₹</span>
          </div>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--text-muted)]">
          Finance Buddy
        </p>
        <h1 className="font-display text-4xl font-bold leading-tight text-[var(--text-primary)]">
          Smart finance tracking<br />with AI insights
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
          Track expenses, set budgets, and get personalised spending guidance — all from a clean, modern dashboard.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className="rounded-xl bg-[var(--brand)] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)]"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-8 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            Sign in
          </Link>
        </div>

        {/* Feature list */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          {[
            { icon: "📊", label: "Budget tracking" },
            { icon: "🤖", label: "AI insights" },
            { icon: "🔒", label: "Secure & private" },
          ].map((f) => (
            <div
              key={f.label}
              className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4"
            >
              <div className="mb-1.5 text-2xl">{f.icon}</div>
              <p className="text-xs font-medium text-[var(--text-muted)]">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
