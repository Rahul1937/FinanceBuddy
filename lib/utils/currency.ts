export function formatCurrency(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(value);
}
