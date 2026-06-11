import { defaultCategories } from "@/lib/utils/categories";

export function useCategories() {
  return {
    categories: defaultCategories,
  };
}
