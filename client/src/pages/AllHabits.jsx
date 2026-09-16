import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { IconFlame, IconChevronRight, IconPlus } from "../components/Icons.jsx";

export function AllHabits() {
  const navigate = useNavigate();
  const { data, error } = useCachedData("habits", () => api.getHabits());
  const habits = data?.habits;

  const groups = {};
  for (const h of habits ?? []) {
    const key = h.routines[0]?.name ?? "Unassigned";
    (groups[key] ??= []).push(h);
  }

  return (
    <div className="page" style={{ position: "relative" }}>
      <Link to="/habits/new" className="fab" aria-label="New habit">
        <IconPlus color="#fff" />
      </Link>

      <div style={{ padding: "26px 20px 0" }}>
        <div className="title-lg">Habits</div>
        <div className="subtitle" style={{ marginTop: 2 }}>Across every routine</div>
      </div>

      {error && <div className="center-empty">Couldn't load habits: {error}</div>}
      {!error && !habits && <div className="center-loading">Loading...</div>}
      {habits && habits.length === 0 && (
        <div className="center-empty">No habits yet. Tap + to add one, or create a routine first.</div>
      )}

      <div style={{ marginTop: 18, padding: "0 20px 30px", display: "flex", flexDirection: "column", gap: 16 }}>
        {Object.entries(groups).map(([routineName, list]) => (
          <div key={routineName}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
              {routineName}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((h) => (
                <button
                  key={h.id}
                  onClick={() => navigate(`/habits/${h.id}`)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "#fff",
                    border: "2px solid var(--ink)",
                    borderRadius: 13,
                    padding: "10px 12px",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 5 }}>{h.name}</div>
                    <div style={{ display: "flex", gap: 2 }}>
                      {h.sparkline.map((v, i) => (
                        <div
                          key={i}
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: v ? h.colorTag : "#F0E4CE",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <IconFlame />
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{h.currentStreak}</div>
                  </div>
                  <IconChevronRight color="var(--muted-2)" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
