const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"]; // index 0 = Sunday, matches getDay()

export function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Returns the 7 dates (Mon-Sun) of the week containing `reference`.
export function currentWeek(reference = new Date()) {
  const day = reference.getDay(); // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(reference);
  monday.setDate(reference.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { date: d, key: toDateKey(d), letter: DAY_LETTERS[d.getDay()], dayNum: d.getDate() };
  });
}

export function weekdayName(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long" });
}
