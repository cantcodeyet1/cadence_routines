const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getRoutines: (date) => request(`/api/routines${date ? `?date=${date}` : ""}`),
  getAllRoutines: () => request("/api/routines?all=true"),
  getRoutine: (id, date) => request(`/api/routines/${id}${date ? `?date=${date}` : ""}`),
  createRoutine: (data) =>
    request("/api/routines", { method: "POST", body: JSON.stringify(data) }),
  addHabitToRoutine: (routineId, data) =>
    request(`/api/routines/${routineId}/habits`, { method: "POST", body: JSON.stringify(data) }),

  getHabits: () => request("/api/habits"),
  getHabit: (id) => request(`/api/habits/${id}`),
  createHabit: (data) => request("/api/habits", { method: "POST", body: JSON.stringify(data) }),

  startSession: (routineId, date) =>
    request("/api/sessions/start", { method: "POST", body: JSON.stringify({ routineId, date }) }),
  logHabit: (sessionId, data) =>
    request(`/api/sessions/${sessionId}/logs`, { method: "POST", body: JSON.stringify(data) }),
  completeSession: (sessionId, note) =>
    request(`/api/sessions/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
};
