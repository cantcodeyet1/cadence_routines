// All dates in this app are stored/compared as calendar days (no time-of-day),
// normalized to UTC midnight so "today" is stable regardless of server timezone.

export function toDateOnly(d) {
  const date = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function todayDateOnly() {
  return toDateOnly(new Date());
}

export function weekdayOf(dateOnly) {
  return dateOnly.getUTCDay(); // 0 = Sunday ... 6 = Saturday
}

export function addDays(dateOnly, n) {
  const d = new Date(dateOnly);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function isSameDate(a, b) {
  return toDateOnly(a).getTime() === toDateOnly(b).getTime();
}

export function dateKey(dateOnly) {
  return toDateOnly(dateOnly).toISOString().slice(0, 10); // YYYY-MM-DD
}
