import { api } from "../api.js";
import { prefetch, prefetchAndGet } from "./cache.js";
import { currentWeek, toDateKey } from "./week.js";

// Warms the cache for the rest of the app right after the first screen's
// data is in, so by the time the user actually taps into Habits, Profile,
// or a routine, it's already sitting there instead of showing a spinner.
// Deliberately sequenced (today's data, then the next most likely screens,
// then everything else) rather than firing 20 requests at once.
export async function warmCache() {
  const today = toDateKey(new Date());

  const routinesToday = await prefetchAndGet(`routines:${today}`, () => api.getRoutines(today));

  prefetch("habits", () => api.getHabits());
  prefetch("routines:all", () => api.getAllRoutines());

  for (const r of routinesToday.routines) {
    prefetch(`routine:${r.id}:${today}`, () => api.getRoutine(r.id, today));
    prefetch(`routine-history:${r.id}`, () => api.getRoutineHistory(r.id, 10));
  }

  for (const d of currentWeek()) {
    if (d.key !== today) prefetch(`routines:${d.key}`, () => api.getRoutines(d.key));
  }
}
