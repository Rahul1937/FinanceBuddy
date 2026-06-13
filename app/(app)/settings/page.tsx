"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, LogOut } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

type Category = {
  id: string;
  name: string;
  color: string | null;
};

export default function SettingsPage() {
  const { signOut, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#818cf8");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.categories ?? []);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setCatName("");
    setCatColor("#818cf8");
    setError("");
    setShowForm(true);
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setCatName(cat.name);
    setCatColor(cat.color || "#818cf8");
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) { setError("Category name is required."); return; }
    setError("");
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: catName.trim(), color: catColor }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save.");
      await load();
      setShowForm(false);
      toast.success(editingId ? "Category updated" : "Category added");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Transactions using it will become uncategorized.")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.error) { toast.error(data.error || "Failed to delete."); return; }
    await load();
    if (editingId === id) setShowForm(false);
    toast.success("Category deleted");
  };

  const name = user?.email?.split("@")[0] ?? "Account";
  const initials = name.charAt(0).toUpperCase();

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Settings</h1>
          <p className="fb-page-sub">Manage categories and account preferences</p>
        </div>
      </div>

      {/* Account card */}
      <div className="fb-card">
        <p className="mb-4 text-sm font-semibold text-[var(--text-primary)]">Account</p>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--brand-soft)] font-bold text-[var(--brand)]">
              {initials}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{name}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-xl border border-[rgba(220,38,38,0.3)] bg-[rgba(220,38,38,0.07)] px-4 py-2 text-sm font-medium text-[var(--danger)] transition hover:bg-[rgba(220,38,38,0.13)]"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="fb-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Categories</p>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">Organise your transactions and budgets</p>
          </div>
          <button onClick={openAdd} className="fb-add-btn text-xs">
            <Plus size={14} />
            Add
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--surface-border)] py-10 text-center">
            <p className="text-sm text-[var(--text-muted)]">No categories yet</p>
            <button onClick={openAdd} className="mt-3 text-xs font-medium text-[var(--brand)] hover:underline">
              Create your first category
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-lg"
                    style={{ background: cat.color || "#818cf8" }}
                  />
                  <p className="text-sm font-medium text-[var(--text-primary)]">{cat.name}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(cat)}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[rgba(244,63,94,0.12)] hover:text-[var(--danger)]"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {editingId ? "Edit category" : "New category"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Category name
                </label>
                <input
                  type="text"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Food, Transport…"
                  required
                  autoFocus
                  className="fb-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={catColor}
                    onChange={(e) => setCatColor(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-lg border border-[var(--surface-border)] bg-transparent p-0.5"
                  />
                  <span className="font-mono text-sm text-[var(--text-muted)]">{catColor}</span>
                  <div
                    className="ml-auto h-8 w-8 rounded-lg"
                    style={{ background: catColor }}
                  />
                </div>
              </div>

              {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Update" : "Add category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
