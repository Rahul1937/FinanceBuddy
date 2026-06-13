// Helpers for recurring rules / bill reminders.
import { addDays, addWeeks, addMonths, addYears, differenceInCalendarDays, parseISO, format } from "date-fns";

export type Frequency = "daily" | "weekly" | "monthly" | "yearly";

export type RecurringRule = {
  id: string;
  category_id: string | null;
  type: "expense" | "income" | string;
  amount: string | number;
  merchant: string | null;
  notes: string | null;
  frequency: string;
  interval: number;
  next_due: string; // YYYY-MM-DD
  end_date: string | null;
  is_active: boolean;
  auto_post: boolean;
};

/** Advance a date by one period (frequency × interval). Returns YYYY-MM-DD. */
export function advanceDate(dateStr: string, frequency: string, interval: number): string {
  const d = parseISO(dateStr);
  const n = Math.max(1, interval || 1);
  let next: Date;
  switch (frequency) {
    case "daily": next = addDays(d, n); break;
    case "weekly": next = addWeeks(d, n); break;
    case "yearly": next = addYears(d, n); break;
    case "monthly":
    default: next = addMonths(d, n); break;
  }
  return format(next, "yyyy-MM-dd");
}

const UNIT: Record<string, string> = { daily: "day", weekly: "week", monthly: "month", yearly: "year" };

export function frequencyLabel(frequency: string, interval: number): string {
  const n = Math.max(1, interval || 1);
  const unit = UNIT[frequency] || "month";
  return n === 1 ? `Every ${unit}` : `Every ${n} ${unit}s`;
}

/** Calendar days from today until the date (negative = overdue). */
export function daysUntil(dateStr: string, today: Date = new Date()): number {
  return differenceInCalendarDays(parseISO(dateStr), today);
}

export type RuleStatus = "paused" | "overdue" | "due-soon" | "upcoming";

export function ruleStatus(
  rule: { is_active: boolean; next_due: string },
  today: Date = new Date()
): RuleStatus {
  if (!rule.is_active) return "paused";
  const d = daysUntil(rule.next_due, today);
  if (d < 0) return "overdue";
  if (d <= 7) return "due-soon";
  return "upcoming";
}

/** Active and due within `days` (includes overdue, i.e. negative days). */
export function dueWithin(
  rule: { is_active: boolean; next_due: string },
  days: number,
  today: Date = new Date()
): boolean {
  if (!rule.is_active) return false;
  return daysUntil(rule.next_due, today) <= days;
}

/** Human label for a due date relative to today. */
export function dueLabel(dateStr: string, today: Date = new Date()): string {
  const d = daysUntil(dateStr, today);
  if (d < 0) return `Overdue by ${Math.abs(d)} day${Math.abs(d) !== 1 ? "s" : ""}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due in ${d} days`;
}
