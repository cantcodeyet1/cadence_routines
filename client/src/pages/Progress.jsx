import { useEffect, useState } from "react";
import { api } from "../api.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { IconFlame, IconCheck } from "../components/Icons.jsx";
import { toDateKey } from "../lib/week.js";

const TIERS = [1, 2, 3, 5, 10, 15, 20, 30, 31, 40, 50, 60, 75, 100, 150, 200, 365];
const NAMES = [
  "Spark", "Flicker", "Flame", "Blaze", "Bonfire", "Ember", "Inferno", "Wildfire",
  "Phoenix", "Supernova", "Comet", "Nova", "Eclipse", "Aurora", "Zenith", "Legend", "Immortal",
];

export function Progress() {
  const [routines, setRoutines] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .getRoutines(toDateKey(new Date()))
      .then((res) => {
        setRoutines(res.routines);
        if (res.routines.length) setSelectedId(res.routines[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDetail(null);
    api.getRoutine(selectedId).then(setDetail).catch((err) => setError(err.message));
  }, [selectedId]);

  if (error) return <div className="center-empty">Couldn't load progress: {error}</div>;
  if (!routines) return <div className="center-loading">Loading...</div>;
  if (routines.length === 0) {
    return (
      <div className="page">
        <div style={{ padding: "26px 20px 0" }}>
          <div className="title-lg">Progress</div>
        </div>
        <div className="center-empty">Create a routine first to see streaks and milestones here.</div>
        <BottomNav />
      </div>
    );
  }

  const currentTierIndex = detail ? TIERS.findIndex((t) => t > detail.bestStreak) : -1;

  return (
    <div className="page">
      <div style={{ padding: "26px 20px 0" }}>
        <div className="title-lg">Progress</div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "14px 20px 0", overflowX: "auto" }}>
        {routines.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            style={{
              background: selectedId === r.id ? "var(--ink)" : "#fff",
              color: selectedId === r.id ? "#fff" : "var(--muted)",
              border: `2px solid ${selectedId === r.id ? "var(--ink)" : "var(--border-soft)"}`,
              borderRadius: 100,
              padding: "8px 16px",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {r.name}
          </button>
        ))}
      </div>

      {!detail && <div className="center-loading">Loading...</div>}

      {detail && (
        <>
          <div className="card card-pop" style={{ margin: "18px 20px 0", background: "var(--purple)", borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <IconFlame width={30} height={30} color="#FFB020" />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff" }}>
                {detail.currentStreak} days
              </div>
              <div style={{ fontSize: 12.5, color: "#E4DBFF", fontWeight: 700 }}>
                best ever: {detail.bestStreak} days
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, padding: "0 20px" }}>
            <div className="field-label">Milestones</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {TIERS.map((tier, i) => {
                const earned = detail.bestStreak >= tier;
                const isCurrent = i === currentTierIndex;
                return (
                  <div key={tier} style={{ display: "flex", alignItems: "center", gap: 14, opacity: earned || isCurrent ? 1 : 0.5 }}>
                    <div
                      style={{
                        width: isCurrent ? 50 : 40,
                        height: isCurrent ? 50 : 40,
                        borderRadius: "50%",
                        background: earned ? "var(--teal)" : isCurrent ? "var(--amber)" : "#F0E4CE",
                        border: `2.5px solid ${earned || isCurrent ? "var(--ink)" : "var(--border-soft-2)"}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {earned ? <IconCheck color="#fff" /> : <IconFlame color={isCurrent ? "var(--ink)" : "var(--muted-2)"} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5 }}>Day {tier} &middot; {NAMES[i]}</div>
                      {isCurrent && (
                        <div style={{ fontSize: 12, color: "var(--orange)", fontWeight: 700 }}>
                          in progress &middot; {detail.currentStreak} / {tier}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 22, padding: "0 20px 30px" }}>
            <div className="field-label">Habits in this routine</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {detail.habits.map((h) => (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>{h.name}</div>
                  <IconFlame />
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700 }}>{h.currentStreak}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
}
