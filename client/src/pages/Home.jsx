import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { currentWeek, toDateKey, weekdayName } from "../lib/week.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { RoutineCard } from "../components/RoutineCard.jsx";
import { IconPlus } from "../components/Icons.jsx";

export function Home() {
  const todayKey = toDateKey(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const week = currentWeek();

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .getRoutines(selected)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [selected]);

  return (
    <div className="page">
      <Link to="/routines/new" className="fab" aria-label="New routine">
        <IconPlus color="#fff" />
      </Link>

      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700 }}>Cadence</div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "22px 20px 0" }}>
        {week.map((d) => (
          <button
            key={d.key}
            onClick={() => setSelected(d.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: d.key === selected ? "var(--orange)" : "var(--muted)" }}>
              {d.letter}
            </span>
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: d.key === selected ? "var(--orange)" : "#fff",
                border: "2px solid var(--ink)",
                boxShadow: d.key === selected ? "2px 2px 0 var(--ink)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontSize: 13,
                fontWeight: 600,
                color: d.key === selected ? "#fff" : "var(--ink)",
              }}
            >
              {d.dayNum}
            </span>
          </button>
        ))}
      </div>

      <div className="section-label">
        {weekdayName(selected)} &middot; {data ? `${data.routines.length} routine${data.routines.length === 1 ? "" : "s"}` : "..."}
      </div>

      {error && <div className="center-empty">Couldn't load routines: {error}</div>}

      {!error && !data && <div className="center-loading">Loading...</div>}

      {data && data.routines.length === 0 && (
        <div className="center-empty">
          Nothing scheduled for {weekdayName(selected).toLowerCase()}.
          <br />
          Tap + to create a routine.
        </div>
      )}

      {data && data.routines.length > 0 && (
        <div style={{ padding: "10px 20px 40px", display: "flex", flexDirection: "column", gap: 34 }}>
          {data.routines.map((r) => (
            <RoutineCard key={r.id} routine={r} isToday={selected === todayKey} />
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}
