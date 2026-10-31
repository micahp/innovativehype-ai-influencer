export function jsonSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, entry) => {
    if (typeof entry === "bigint") return entry.toString();
    if (entry && typeof entry === "object" && entry.constructor?.name === "Decimal") return Number(entry.toString());
    return entry;
  })) as T;
}
