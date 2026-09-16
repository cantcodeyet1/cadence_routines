import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { highestEarnedTier } from "../lib/milestones.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { IconPerson, IconFlame } from "../components/Icons.jsx";

export function Profile() {
  const { data: routinesData } = useCachedData("routines:all", () => api.getAllRoutines());
  const { data: habitsData } = useCachedData("habits", () => api.getHabits());
  const routines = routinesData?.routines;
  const habits = habitsData?.habits;

  const bestStreak = routines?.length ? Math.max(...routines.map((r) => r.bestStreak)) : 0;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "28px 20px 0" }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "var(--purple)",
            border: "2.5px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconPerson width={34} height={34} color="#fff" />
        </div>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 600 }}>Nyasha</div>
          <div className="subtitle" style={{ marginTop: 2 }}>Building better routines</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "26px 20px 0" }}>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--purple)" }}>
            {routines?.length ?? "-"}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>routines</div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--orange)" }}>
            {bestStreak}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>best streak</div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--teal)" }}>
            {habits?.length ?? "-"}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--muted)", fontWeight: 700 }}>habits tracked</div>
        </div>
      </div>

      <div style={{ marginTop: 30, padding: "0 20px" }}>
        <div className="field-label">Badges</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(routines ?? []).map((r) => {
            const tier = highestEarnedTier(r.bestStreak);
            return (
              <Link
                key={r.id}
                to={`/routines/${r.id}/milestones`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "#fff",
                  border: "2px solid var(--ink)",
                  borderRadius: 13,
                  padding: "10px 14px",
                  textDecoration: "none",
                  color: "var(--ink)",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: tier ? "var(--teal)" : "#F0E4CE",
                    border: `2px solid ${tier ? "var(--ink)" : "var(--border-soft-2)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconFlame color={tier ? "#fff" : "var(--muted-2)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{tier ? tier.name : "Not started"}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>{r.name}</div>
                </div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 700, color: "var(--muted)" }}>
                  best {r.bestStreak}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 22, padding: "0 20px 30px" }}>
        <div className="field-label">Your routines</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(routines ?? []).map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: "2px solid var(--border-soft)", borderRadius: 13, padding: "12px 14px" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
              <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{r.currentStreak} day streak</div>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
