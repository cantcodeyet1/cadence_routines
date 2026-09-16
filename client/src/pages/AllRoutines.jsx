import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { IconFlame, IconChevronRight, IconPlus } from "../components/Icons.jsx";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function daysLabel(weekdays) {
  if (weekdays.length === 7) return "Every day";
  const sorted = [...weekdays].sort();
  return sorted.map((w) => WEEKDAY_LETTERS[w]).join(" ");
}

export function AllRoutines() {
  const navigate = useNavigate();
  const { data, error } = useCachedData("routines:all", () => api.getAllRoutines());
  const routines = data?.routines;

  return (
    <div className="page" style={{ position: "relative" }}>
      <Link to="/routines/new" className="fab" aria-label="New routine">
        <IconPlus color="#fff" />
      </Link>

      <div style={{ padding: "26px 20px 0" }}>
        <div className="title-lg">Routines</div>
        <div className="subtitle" style={{ marginTop: 2 }}>Everything you're stacking</div>
      </div>

      {error && <div className="center-empty">Couldn't load routines: {error}</div>}
      {!error && !routines && <div className="center-loading">Loading...</div>}
      {routines && routines.length === 0 && (
        <div className="center-empty">No routines yet. Tap + to create your first one.</div>
      )}

      <div style={{ marginTop: 18, padding: "0 20px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
        {routines?.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/routines/${r.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              background: "#fff",
              border: "2px solid var(--ink)",
              borderRadius: 15,
              padding: "14px 16px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: r.color,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 800 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700, marginTop: 2 }}>
                {daysLabel(r.weekdays ?? [])}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <IconFlame />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700 }}>{r.currentStreak}</div>
            </div>
            <IconChevronRight color="var(--muted-2)" />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
