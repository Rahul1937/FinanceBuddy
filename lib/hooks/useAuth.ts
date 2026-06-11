"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type AuthUser = {
  id: string;
  email: string;
};

type AuthResponse<T> = {
  data: T | null;
  error: { message: string } | null;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (!response.ok) {
          setUser(null);
        } else {
          const payload = await response.json();
          setUser(payload.user ?? null);
        }
      } catch (err) {
        console.error("Session initialization failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok || payload.error) {
        const message = payload.error?.message || payload.error || "Sign in failed.";
        setError(message);
        return { data: null, error: { message } };
      }

      setUser(payload.user);
      return { data: payload.user, error: null };
    } catch (err) {
      console.error("Sign-in exception:", err);
      const message = err instanceof Error ? err.message : "Sign-in failed.";
      setError(message);
      return { data: null, error: { message } };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await response.json();

      if (!response.ok || payload.error) {
        const message = payload.error?.message || payload.error || "Sign up failed.";
        setError(message);
        return { data: null, error: { message } };
      }

      setUser(payload.user);
      return { data: payload.user, error: null };
    } catch (err) {
      console.error("Sign-up exception:", err);
      const message = err instanceof Error ? err.message : "Sign-up failed.";
      setError(message);
      return { data: null, error: { message } };
    }
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setUser(null);
      router.push("/login");
    }
  }, [router]);

  const requireAuth = useCallback(() => {
    if (!isAuthenticated && !loading) {
      router.replace("/login");
    }
  }, [isAuthenticated, loading, router]);

  return useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
      requireAuth,
    }),
    [user, loading, error, isAuthenticated, signIn, signUp, signOut, requireAuth]
  );
}
