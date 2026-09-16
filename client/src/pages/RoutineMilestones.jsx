import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { toDateKey } from "../lib/week.js";
import { TIERS, NAMES } from "../lib/milestones.js";
import { IconBack, IconFlame, IconCheck } from "../components/Icons.jsx";

export function RoutineMilestones() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const today = toDateKey(new Date());
  const { data: routine, error } = useCachedData(`routine:${routineId}:${today}`, () =>
    api.getRoutine(routineId, today)
  );

  if (error) return <div className="center-empty">Couldn't load milestones: {error}</div>;
  if (!routine) return <div className="center-loading">Loading...</div>;

  const currentTierIndex = TIERS.findIndex((t) => t > routine.bestStreak);
  const nextTier = currentTierIndex >= 0 ? TIERS[currentTierIndex] : null;

  return (
    <div className="page">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <div>
          <div className="title-lg">Milestones</div>
          <div className="subtitle" style={{ marginTop: 2 }}>{routine.name}</div>
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div
        className="card card-pop"
        style={{ margin: "18px 20px 0", background: routine.color, borderRadius: 16, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}
      >
        <IconFlame width={30} height={30} color="#FFB020" />
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff" }}>
            {routine.currentStreak} days
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            best ever: {routine.bestStreak}
            {nextTier ? ` · ${nextTier - routine.currentStreak} to go for ${NAMES[currentTierIndex]}` : " · maxed out!"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22, padding: "0 20px 30px", display: "flex", flexDirection: "column", gap: 10 }}>
        {TIERS.map((tier, i) => {
          const earned = routine.bestStreak >= tier;
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
                    in progress &middot; {routine.currentStreak} / {tier}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
