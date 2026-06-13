"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading: authLoading, error: authError, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error.message || "Failed to sign in. Check your email and password.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  const displayError = error || authError;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-base)] px-5 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
            <span className="font-display text-3xl font-bold text-[var(--brand)]">₹</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to your Finance Buddy account</p>
        </div>

        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6">
          {displayError && (
            <div className="mb-5 rounded-xl border border-[var(--danger)]/30 bg-[rgba(220,38,38,0.07)] px-4 py-3 text-sm text-[var(--danger)]">
              {displayError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="fb-input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Password
              </label>
              <input
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                className="fb-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[var(--text-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-[var(--brand)] hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
