import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { IconBack } from "../components/Icons.jsx";

export function HabitDetail() {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const { data: habit, error } = useCachedData(`habit:${habitId}`, () => api.getHabit(habitId));

  if (error) return <div className="center-empty">Couldn't load habit: {error}</div>;
  if (!habit) return <div className="center-loading">Loading...</div>;

  // 84 days as 12 columns x 7 rows
  const columns = [];
  for (let c = 0; c < 12; c++) columns.push(habit.heatmap.slice(c * 7, c * 7 + 7));

  return (
    <div className="page">
      <div className="top-bar">
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <div>
          <div className="title-lg">{habit.name}</div>
          <div className="subtitle" style={{ marginTop: 2 }}>
            part of {habit.routines.map((r) => r.name).join(", ") || "no routine"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "16px 20px 0" }}>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center", padding: 11 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--teal)" }}>{habit.currentStreak}</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>current</div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center", padding: 11 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--purple)" }}>{habit.bestStreak}</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>best streak</div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center", padding: 11 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--orange)" }}>{habit.completionRate}%</div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>completion</div>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "0 20px" }}>
        <div className="field-label">Last 84 days</div>
        <div style={{ display: "flex", gap: 3 }}>
          {columns.map((col, ci) => (
            <div key={ci} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {col.map((day, ri) => (
                <div
                  key={ri}
                  title={day.date}
                  style={{ width: 12, height: 12, borderRadius: 3, background: day.done ? habit.colorTag : "#F0E4CE" }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22, padding: "0 20px 30px" }}>
        <div className="field-label">Recent notes</div>
        {habit.recentNotes.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>No notes yet.</div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habit.recentNotes.map((n, i) => (
            <div key={i} className="card">
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>{n.date}</div>
              <div style={{ fontSize: 13.5, marginTop: 2 }}>{n.note}</div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
