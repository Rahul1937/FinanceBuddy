"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading: authLoading, error: authError, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const result = await signUp(email, password);
    console.log("Sign-up result:", result);

    if (result.error) {
      setError(result.error.message || "Failed to create account. Try again.");
      setLoading(false);
      return;
    }

    try {
      await router.push("/dashboard");
    } catch (err) {
      console.error("Navigation error:", err);
      setLoading(false);
    }
  };

  const displayError = error || authError;

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-6 py-16 text-slate-100">
      <Card className="w-full max-w-md space-y-8 bg-slate-900 text-slate-100">
        <div>
          <h1 className="text-3xl font-semibold">Create your account</h1>
          <p className="mt-2 text-sm text-slate-400">Start tracking your spending with Finance Buddy.</p>
        </div>
        {displayError && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded text-red-200 text-sm">
            {displayError}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-300">
            Email
            <Input
              type="email"
              placeholder="you@example.com"
              className="mt-2 bg-slate-950 text-slate-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || authLoading}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Password
            <Input
              type="password"
              placeholder="Password"
              className="mt-2 bg-slate-950 text-slate-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || authLoading}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Confirm Password
            <Input
              type="password"
              placeholder="Confirm password"
              className="mt-2 bg-slate-950 text-slate-100"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading || authLoading}
              required
            />
          </label>
          <Button type="submit" className="w-full" disabled={loading || authLoading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-slate-100 hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
