export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(date));
}

export function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}
