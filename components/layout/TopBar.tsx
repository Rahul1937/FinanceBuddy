export default function TopBar() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 px-4 py-4 backdrop-blur-lg lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Finance Buddy</p>
          <p className="text-sm text-slate-400">A smarter way to track spending.</p>
        </div>
        <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200">
          Account
        </div>
      </div>
    </header>
  );
}
