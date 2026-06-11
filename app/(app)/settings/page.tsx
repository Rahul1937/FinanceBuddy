"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { useAuth } from "@/lib/hooks/useAuth";

type Category = {
  id: string;
  name: string;
  color: string | null;
};

export default function SettingsPage() {
  const { signOut } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState("#818cf8");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCategories = async () => {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.categories ?? []);
    };

    loadCategories();
  }, []);

  const refreshCategories = async () => {
    const response = await fetch("/api/categories");
    const data = await response.json();
    setCategories(data.categories ?? []);
  };

  const handleSaveCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!categoryName.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/categories/${editingId}` : "/api/categories";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName.trim(), color: categoryColor }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to save category.");
      }
      setCategoryName("");
      setCategoryColor("#818cf8");
      setEditingId(null);
      await refreshCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save category.");
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingId(category.id);
    setCategoryName(category.name);
    setCategoryColor(category.color || "#818cf8");
    setError("");
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || data.error) {
      setError(data.error || "Unable to delete category.");
      return;
    }
    setEditingId((current) => (current === id ? null : current));
    setCategoryName("");
    setCategoryColor("#818cf8");
    await refreshCategories();
  };

  return (
    <section className="space-y-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-slate-400">Manage categories and sign out of your account.</p>
        </div>
        <Button className="bg-rose-600" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Manage categories</h2>
            <p className="mt-2 text-sm text-slate-400">Add or edit spending categories for your transactions and budgets.</p>
          </div>
          <form className="grid gap-4 md:grid-cols-[1fr_180px_120px]" onSubmit={handleSaveCategory}>
            <label className="block text-sm font-medium text-slate-300">
              Category name
              <Input
                value={categoryName}
                onChange={(event) => setCategoryName(event.target.value)}
                className="mt-2 bg-slate-900 text-slate-100"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Color
              <Input
                type="color"
                value={categoryColor}
                onChange={(event) => setCategoryColor(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-100"
              />
            </label>
            <div className="flex items-end gap-3">
              {editingId && (
                <Button type="button" className="bg-slate-700" onClick={() => {
                  setEditingId(null);
                  setCategoryName("");
                  setCategoryColor("#818cf8");
                  setError("");
                }}>
                  Cancel
                </Button>
              )}
              <Button type="submit">{editingId ? "Update category" : "Add category"}</Button>
            </div>
          </form>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <h2 className="text-xl font-semibold">Your categories</h2>
        <div className="mt-4 space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-slate-400">No categories found yet. Create one to start organizing your transactions.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: category.color || "#334155" }} />
                  <div>
                    <p className="font-semibold text-slate-100">{category.name}</p>
                    <p className="text-sm text-slate-400">{category.color || "#818cf8"}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button type="button" className="bg-slate-700" onClick={() => handleEditCategory(category)}>
                    Edit
                  </Button>
                  <Button type="button" className="bg-rose-600" onClick={() => handleDeleteCategory(category.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </section>
  );
}
