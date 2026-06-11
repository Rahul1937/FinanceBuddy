import Link from "next/link";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-slate-100">
      <Card className="max-w-3xl bg-slate-950/95 text-slate-100 shadow-slate-950/30">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">Finance Buddy</p>
            <h1 className="text-5xl font-semibold leading-tight">Smart personal finance tracking with AI insights.</h1>
            <p className="max-w-2xl text-base leading-8 text-slate-400">
              Track expenses, manage budgets, and get tailored spending guidance from a clean, modern dashboard.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/login" className="w-full">
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link href="/signup" className="w-full">
              <Button className="w-full bg-slate-800 text-slate-100 hover:bg-slate-700">Create account</Button>
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
