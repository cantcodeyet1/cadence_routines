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
  updateRoutine: (id, data) => request(`/api/routines/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteRoutine: (id) => request(`/api/routines/${id}`, { method: "DELETE" }),
  addHabitToRoutine: (routineId, data) =>
    request(`/api/routines/${routineId}/habits`, { method: "POST", body: JSON.stringify(data) }),
  removeHabitFromRoutine: (routineId, routineHabitId) =>
    request(`/api/routines/${routineId}/habits/${routineHabitId}`, { method: "DELETE" }),
  reorderRoutineHabits: (routineId, order) =>
    request(`/api/routines/${routineId}/habits/reorder`, { method: "PATCH", body: JSON.stringify({ order }) }),
  getRoutineHistory: (routineId, limit) =>
    request(`/api/routines/${routineId}/history${limit ? `?limit=${limit}` : ""}`),

  getHabits: () => request("/api/habits"),
  getHabit: (id) => request(`/api/habits/${id}`),
  createHabit: (data) => request("/api/habits", { method: "POST", body: JSON.stringify(data) }),
  updateHabit: (id, data) => request(`/api/habits/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  startSession: (routineId, date) =>
    request("/api/sessions/start", { method: "POST", body: JSON.stringify({ routineId, date }) }),
  deleteSession: (sessionId) => request(`/api/sessions/${sessionId}`, { method: "DELETE" }),
  logHabit: (sessionId, data) =>
    request(`/api/sessions/${sessionId}/logs`, { method: "POST", body: JSON.stringify(data) }),
  completeSession: (sessionId, note) =>
    request(`/api/sessions/${sessionId}/complete`, {
      method: "POST",
      body: JSON.stringify({ note }),
    }),
};
