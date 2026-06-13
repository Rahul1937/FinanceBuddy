export const defaultCategories = [
  { id: "food", name: "Food", icon: "🍽️", color: "#f97316" },
  { id: "transport", name: "Transport", icon: "🚌", color: "#2563eb" },
  { id: "utilities", name: "Utilities", icon: "💡", color: "#10b981" },
];

const CATEGORY_ICON_MAP: Record<string, string> = {
  food: "🍽️",
  transport: "🚌",
  shopping: "🛍️",
  bills: "💡",
  entertainment: "🎬",
  health: "❤️",
  income: "💰",
  utilities: "⚡",
  savings: "🏦",
  education: "📚",
  travel: "✈️",
  clothing: "👕",
  personal: "🧴",
  fitness: "🏋️",
};

const CATEGORY_COLOR_MAP: Record<string, string> = {
  food: "#f97316",
  transport: "#22c55e",
  shopping: "#818cf8",
  bills: "#38bdf8",
  entertainment: "#fb7185",
  health: "#34d399",
  income: "#facc15",
  utilities: "#a78bfa",
  savings: "#60a5fa",
};

export function getCategoryIcon(name: string): string {
  const key = name.toLowerCase().trim();
  return CATEGORY_ICON_MAP[key] ?? "📌";
}

export function getCategoryColor(name: string, fallback?: string | null): string {
  const key = name.toLowerCase().trim();
  return CATEGORY_COLOR_MAP[key] ?? fallback ?? "#818cf8";
}
