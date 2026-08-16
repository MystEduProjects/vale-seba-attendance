export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Si" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}