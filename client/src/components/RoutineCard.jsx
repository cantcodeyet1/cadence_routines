import { useNavigate } from "react-router-dom";
import { IconFlame, IconPlay, IconCheck } from "./Icons.jsx";

export function RoutineCard({ routine, isToday }) {
  const navigate = useNavigate();
  const done = routine.completedAt != null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => navigate(`/routines/${routine.id}`)}
        className="card card-pop"
        style={{
          background: routine.color,
          borderRadius: 18,
          padding: "16px 18px",
          textAlign: "left",
          width: "100%",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(255,255,255,0.8)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {done ? "Complete" : isToday ? "Today" : "Not today"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <IconFlame color="#FFB020" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {routine.currentStreak}
            </div>
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "#fff", marginTop: 2 }}>
          {routine.name}
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4, fontWeight: 700 }}>
          {routine.doneCount} / {routine.habitCount} done &middot; +{routine.xpLeft} XP left
        </div>
      </button>

      {isToday && (
        <button
          onClick={() => navigate(`/routines/${routine.id}/session`)}
          style={{
            position: "absolute",
            right: 16,
            bottom: -22,
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: done ? "#fff" : "#FFB020",
            border: "2.5px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 14px rgba(0,0,0,0.25)",
            cursor: "pointer",
          }}
          aria-label={done ? "Review routine" : "Start routine"}
        >
          {done ? <IconCheck color="#06B6A4" width={22} height={22} /> : <IconPlay color="#241E3D" />}
        </button>
      )}
    </div>
  );
}
