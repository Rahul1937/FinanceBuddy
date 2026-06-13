"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Upload, FileText, Plus, Trash2, X, CreditCard, Landmark, Lock, Loader2, History,
} from "lucide-react";
import ReviewTable, { type ReviewRow, type CommitRow } from "@/components/import/ReviewTable";
import { emitRefresh } from "@/lib/hooks/useRefreshBus";

type Source = { id: string; name: string; kind: "bank" | "credit_card"; cycle_day: number | null };
type Category = { id: string; name: string; exclude_from_spend?: boolean | null };
type ImportRow = {
  id: string;
  file_name: string | null;
  period_start: string | null;
  period_end: string | null;
  parsed_count: number;
  imported_count: number;
  duplicate_count: number;
  status: string;
  created_at: string;
  statement_sources: { name: string; kind: string } | null;
};

type Review = {
  importId: string;
  sourceKind: string;
  sourceName: string;
  periodStart: string | null;
  periodEnd: string | null;
  importableCount: number;
  duplicateCount: number;
  rows: ReviewRow[];
};

export default function ImportPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);

  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  const [showAddSource, setShowAddSource] = useState(false);
  const [newSource, setNewSource] = useState<{ name: string; kind: "bank" | "credit_card"; cycle_day: string }>({
    name: "", kind: "bank", cycle_day: "",
  });

  const [review, setReview] = useState<Review | null>(null);
  const [committing, setCommitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    const [sRes, cRes, iRes] = await Promise.all([
      fetch("/api/sources"), fetch("/api/categories"), fetch("/api/statements"),
    ]);
    const [s, c, i] = await Promise.all([sRes.json(), cRes.json(), iRes.json()]);
    setSources(s.sources ?? []);
    setCategories(c.categories ?? []);
    setImports(i.imports ?? []);
    if (!selectedSourceId && (s.sources ?? []).length) setSelectedSourceId(s.sources[0].id);
  };

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addSource = async () => {
    if (!newSource.name.trim()) { toast.error("Give the source a name."); return; }
    const res = await fetch("/api/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newSource.name.trim(),
        kind: newSource.kind,
        cycle_day: newSource.kind === "credit_card" ? Number(newSource.cycle_day) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) { toast.error(data.error || "Couldn't add source."); return; }
    toast.success("Source added");
    setNewSource({ name: "", kind: "bank", cycle_day: "" });
    setShowAddSource(false);
    setSources((prev) => [...prev, data.source]);
    setSelectedSourceId(data.source.id);
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Delete this source? Imported transactions stay.")) return;
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Couldn't delete source."); return; }
    toast.success("Source deleted");
    setSources((prev) => prev.filter((s) => s.id !== id));
    if (selectedSourceId === id) setSelectedSourceId("");
  };

  const handleUpload = async () => {
    if (!selectedSourceId) { toast.error("Choose a statement source."); return; }
    if (!file) { toast.error("Choose a PDF file."); return; }
    setUploading(true);
    setReview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("source_id", selectedSourceId);
      if (password) fd.append("password", password);
      const res = await fetch("/api/statements/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Upload failed.");
      if (!data.rows?.length) {
        toast.message("No transactions found in this statement.");
      }
      setReview(data);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async (rows: CommitRow[]) => {
    if (!review) return;
    setCommitting(true);
    try {
      const res = await fetch(`/api/statements/${review.importId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Import failed.");
      toast.success(`Imported ${data.imported} transaction${data.imported !== 1 ? "s" : ""}`);
      emitRefresh();
      setReview(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setCommitting(false);
    }
  };

  const selectedSource = sources.find((s) => s.id === selectedSourceId);

  return (
    <div className="space-y-5 p-5 lg:p-6">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Import statements</h1>
          <p className="fb-page-sub">Upload a bank or credit-card PDF — we parse, de-duplicate, and you review before saving.</p>
        </div>
      </div>

      {/* ── Sources ─────────────────────────────────────── */}
      <div className="fb-card">
        <div className="fb-card-title">
          <span>Statement sources</span>
          <button onClick={() => setShowAddSource((v) => !v)} className="fb-btn text-xs">
            <Plus size={13} className="mr-1" /> Add source
          </button>
        </div>

        {showAddSource && (
          <div className="mb-3 space-y-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
            <input
              placeholder="Name (e.g. HDFC Savings, ICICI Card)"
              value={newSource.name}
              onChange={(e) => setNewSource((s) => ({ ...s, name: e.target.value }))}
              className="fb-input"
            />
            <div className="flex gap-2">
              {(["bank", "credit_card"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setNewSource((s) => ({ ...s, kind: k }))}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl border py-2 text-sm font-semibold transition ${
                    newSource.kind === k
                      ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "border-[var(--surface-border)] text-[var(--text-muted)]"
                  }`}
                >
                  {k === "bank" ? <Landmark size={15} /> : <CreditCard size={15} />}
                  {k === "bank" ? "Bank" : "Credit card"}
                </button>
              ))}
            </div>
            {newSource.kind === "credit_card" && (
              <input
                type="number"
                min={1}
                max={28}
                placeholder="Statement cycle day (e.g. 15)"
                value={newSource.cycle_day}
                onChange={(e) => setNewSource((s) => ({ ...s, cycle_day: e.target.value }))}
                className="fb-input"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowAddSource(false)} className="fb-btn flex-1 text-sm">Cancel</button>
              <button onClick={addSource} className="fb-add-btn flex-1 justify-center text-sm">Save source</button>
            </div>
          </div>
        )}

        {sources.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No sources yet. Add a bank account or credit card to start.</p>
        ) : (
          <div className="space-y-1.5">
            {sources.map((s) => (
              <div
                key={s.id}
                className={`group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition ${
                  selectedSourceId === s.id ? "border-[var(--brand)]/50 bg-[var(--brand-soft)]" : "border-[var(--surface-border)]"
                }`}
              >
                <button onClick={() => setSelectedSourceId(s.id)} className="flex flex-1 items-center gap-2.5 text-left">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-[var(--text-secondary)]">
                    {s.kind === "bank" ? <Landmark size={15} /> : <CreditCard size={15} />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-[var(--text-primary)]">{s.name}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {s.kind === "bank" ? "Bank account" : `Credit card · cycle day ${s.cycle_day ?? "?"}`}
                    </span>
                  </span>
                </button>
                <button
                  onClick={() => deleteSource(s.id)}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] opacity-0 transition hover:bg-[rgba(220,38,38,0.1)] hover:text-[var(--danger)] group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Upload ──────────────────────────────────────── */}
      <div className="fb-card">
        <div className="fb-card-title">Upload a statement</div>

        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--surface-border)] bg-[var(--surface-raised)] px-6 py-8 text-center transition hover:border-[var(--brand)]/50">
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <FileText size={16} className="text-[var(--brand)]" /> {file.name}
            </span>
          ) : (
            <>
              <Upload size={22} className="mb-2 text-[var(--text-muted)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">Click to choose a PDF</span>
              <span className="mt-0.5 text-xs text-[var(--text-muted)]">Bank or credit-card statement (previous months only)</span>
            </>
          )}
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Source</label>
            <select value={selectedSourceId} onChange={(e) => setSelectedSourceId(e.target.value)} className="fb-select">
              <option value="">Choose a source…</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              PDF password <span className="normal-case text-[var(--text-muted)]">(if protected)</span>
            </label>
            <div className="relative">
              <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Optional"
                className="fb-input pl-8"
              />
            </div>
          </div>
        </div>

        <button onClick={handleUpload} disabled={uploading} className="fb-add-btn mt-3 w-full justify-center disabled:opacity-60">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? "Parsing statement…" : "Parse statement"}
        </button>

        {selectedSource?.kind === "credit_card" && (
          <p className="mt-2 text-[11px] text-[var(--text-muted)]">
            Card payments on your bank statement are auto-tagged as <b>Credit Card Payment</b> and excluded from spend, so they’re not double-counted against this card’s purchases.
          </p>
        )}
      </div>

      {/* ── Review ──────────────────────────────────────── */}
      {review && (
        <div className="fb-card">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-[0.95rem] font-semibold text-[var(--text-primary)]">Review · {review.sourceName}</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {review.rows.length} parsed
                {review.duplicateCount > 0 && ` · ${review.duplicateCount} already added`}
                {review.periodStart && ` · ${review.periodStart} → ${review.periodEnd ?? "?"}`}
              </p>
            </div>
            <button onClick={() => setReview(null)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>

          {review.rows.length === 0 ? (
            <p className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-muted)]">
              No transactions were detected in this PDF.
            </p>
          ) : (
            <ReviewTable rows={review.rows} categories={categories} committing={committing} onCommit={handleCommit} />
          )}
        </div>
      )}

      {/* ── History ─────────────────────────────────────── */}
      <div className="fb-card">
        <div className="fb-card-title">
          <span className="flex items-center gap-2"><History size={15} /> Import history</span>
        </div>
        {imports.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No imports yet.</p>
        ) : (
          <div className="space-y-1.5">
            {imports.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {imp.statement_sources?.name ?? "Statement"} · {imp.file_name ?? "PDF"}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    {new Date(imp.created_at).toLocaleDateString("en-IN")} · {imp.imported_count} imported
                    {imp.duplicate_count > 0 && ` · ${imp.duplicate_count} duplicates skipped`}
                  </p>
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize"
                  style={{
                    background: imp.status === "done" ? "var(--positive-soft)" : "var(--surface-raised)",
                    color: imp.status === "done" ? "var(--positive)" : "var(--text-muted)",
                  }}
                >
                  {imp.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
