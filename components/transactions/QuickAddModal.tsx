"use client";

import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { X, Mic, Square, Loader2 } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";
import { emitRefresh } from "@/lib/hooks/useRefreshBus";
import { useSpeechRecognition } from "@/lib/hooks/useSpeechRecognition";

type Category = { id: string; name: string; color: string | null };

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [date, setDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  const { supported, listening, transcript, error: voiceError, start, stop, reset } = useSpeechRecognition();

  useEffect(() => {
    if (!open) return;
    // reset + load categories each time it opens
    setAmount(""); setType("expense"); setCategoryId(""); setMerchant(""); setDate(todayStr());
    setVoiceActive(false); reset();
    fetch("/api/categories").then((r) => r.json()).then((d) => setCategories(d.categories ?? []));
  }, [open, reset]);

  // Surface voice errors
  useEffect(() => {
    if (voiceError) toast.error(voiceError);
  }, [voiceError]);

  const parseVoice = async (text: string) => {
    setParsing(true);
    try {
      const res = await fetch("/api/ai/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.status === 503) { toast.error(data.error || "Voice parsing isn't configured."); return; }
      if (!res.ok || data.error) throw new Error(data.error || "Couldn't understand that.");

      if (data.amount) setAmount(String(data.amount));
      setType(data.type === "income" ? "income" : "expense");
      if (data.merchant) setMerchant(data.merchant);
      else if (data.description) setMerchant(data.description);
      if (data.date) setDate(data.date);

      const suggestion = String(data.category_suggestion || "").toLowerCase().trim();
      if (suggestion) {
        const match =
          categories.find((c) => c.name.toLowerCase() === suggestion) ||
          categories.find((c) => c.name.toLowerCase().includes(suggestion) || suggestion.includes(c.name.toLowerCase()));
        if (match) setCategoryId(match.id);
      }
      toast.success("Got it — review the details and save");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't understand that.");
    } finally {
      setParsing(false);
    }
  };

  // When a voice session ends with a transcript, parse it.
  useEffect(() => {
    if (voiceActive && !listening && transcript && !parsing) {
      setVoiceActive(false);
      parseVoice(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceActive, listening, transcript]);

  const toggleVoice = () => {
    if (listening) {
      stop();
    } else {
      reset();
      setVoiceActive(true);
      start();
    }
  };

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) { toast.error("Enter an amount greater than zero."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num, type, category_id: categoryId || null,
          merchant: merchant || null, occurred_at: `${date}T00:00:00.000Z`, currency: "INR",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Couldn't save.");
      toast.success(`${type === "income" ? "Income" : "Expense"} of ₹${num.toLocaleString("en-IN")} added`);
      emitRefresh();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl sm:rounded-2xl pb-safe">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">Add transaction</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"><X size={18} /></button>
        </div>

        {/* Voice bar */}
        {supported && (
          <div className="mb-5">
            <button
              type="button"
              onClick={toggleVoice}
              disabled={parsing}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold transition disabled:opacity-60 ${
                listening
                  ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                  : "border-[var(--surface-border)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              }`}
            >
              {parsing ? (
                <><Loader2 size={16} className="animate-spin" /> Understanding…</>
              ) : listening ? (
                <><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand)] opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--brand)]" /></span> Listening… tap to stop <Square size={14} /></>
              ) : (
                <><Mic size={16} /> Speak a transaction</>
              )}
            </button>
            {(listening || transcript) && (
              <p className="mt-2 text-center text-xs text-[var(--text-muted)]">
                {transcript ? `“${transcript}”` : "Try: “spent 250 on lunch at Dominos yesterday”"}
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount hero */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className="font-mono text-3xl text-[var(--text-muted)]">₹</span>
              <input
                type="number" inputMode="decimal" min="0" step="0.01" autoFocus
                value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                className="w-40 bg-transparent text-center font-mono text-3xl font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--surface-border)] [appearance:textfield]"
              />
            </div>
          </div>

          {/* Type toggle */}
          <div className="flex rounded-xl bg-[var(--surface-raised)] p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                  type === t
                    ? t === "expense" ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-[var(--positive-soft)] text-[var(--positive)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >{t}</button>
            ))}
          </div>

          <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant / description" className="fb-input" />

          <div className="grid grid-cols-2 gap-3">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="fb-select">
              <option value="">Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{getCategoryIcon(c.name)} {c.name}</option>)}
            </select>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="fb-input" />
          </div>

          <button type="submit" disabled={submitting} className="fb-add-btn w-full justify-center disabled:opacity-60">
            {submitting ? "Saving…" : "Add transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
