import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { toDateKey } from "../lib/week.js";
import { BottomNav } from "../components/BottomNav.jsx";
import { HabitPicker } from "../components/HabitPicker.jsx";
import { DraggableList } from "../components/DraggableList.jsx";
import {
  IconBack,
  IconFlame,
  IconPlay,
  IconTimer,
  IconCountUp,
  IconCheck,
  IconChevronRight,
  IconPlus,
  IconTrash,
  IconEdit,
  IconQuote,
} from "../components/Icons.jsx";

const TYPE_ICON = { TICK: IconCheck, COUNTDOWN: IconTimer, COUNTUP: IconCountUp };

function formatClock(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDuration(sec) {
  if (sec == null) return null;
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  return `${m} min`;
}

function formatDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export function RoutineDetail() {
  const { routineId } = useParams();
  const navigate = useNavigate();
  const today = toDateKey(new Date());
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [habitOrder, setHabitOrder] = useState(null); // optimistic local order during/after drag
  const { data: routine, error, refresh } = useCachedData(`routine:${routineId}:${today}`, () =>
    api.getRoutine(routineId, today)
  );
  const { data: history } = useCachedData(`routine-history:${routineId}`, () =>
    api.getRoutineHistory(routineId, 10)
  );

  if (error) return <div className="center-empty">Couldn't load that routine: {error}</div>;
  if (!routine) return <div className="center-loading">Loading...</div>;

  const habits = habitOrder ?? routine.habits;
  const doneCount = habits.filter((h) => h.log?.completedAt).length;

  async function addHabit(habit) {
    await api.addHabitToRoutine(routineId, habit);
    setShowHabitPicker(false);
    setHabitOrder(null);
    refresh();
  }

  async function removeHabit(routineHabitId) {
    await api.removeHabitFromRoutine(routineId, routineHabitId);
    setHabitOrder(null);
    refresh();
  }

  async function persistOrder(newHabits) {
    setHabitOrder(newHabits);
    try {
      await api.reorderRoutineHabits(routineId, newHabits.map((h) => h.routineHabitId));
    } finally {
      await refresh();
      setHabitOrder(null);
    }
  }

  return (
    <div className="page">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <div className="title-lg">{routine.name}</div>
        <button className="icon-btn" onClick={() => navigate(`/routines/${routineId}/edit`)}>
          <IconEdit />
        </button>
      </div>

      <Link
        to={`/routines/${routine.id}/milestones`}
        className="card card-pop"
        style={{
          margin: "18px 20px 0",
          background: routine.color,
          borderRadius: 16,
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          textDecoration: "none",
        }}
      >
        <IconFlame width={26} height={26} color="#FFB020" />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, color: "#fff" }}>
            {routine.currentStreak} day streak
          </div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>
            best ever: {routine.bestStreak} &middot; {doneCount}/{habits.length} done today
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <IconChevronRight color="rgba(255,255,255,0.85)" />
          <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap" }}>
            milestones
          </div>
        </div>
      </Link>

      {routine.quote && (
        <div
          style={{
            margin: "14px 20px 0",
            background: "#fff",
            border: "2.5px solid var(--ink)",
            borderRadius: 16,
            padding: "16px 18px",
            display: "flex",
            gap: 12,
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          <IconQuote color={routine.color} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 14.5, fontStyle: "italic", fontWeight: 600, lineHeight: 1.5 }}>{routine.quote}</div>
        </div>
      )}

      <div style={{ marginTop: 22, padding: "0 20px 140px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="field-label">Habits</div>

        <DraggableList
          items={habits}
          getKey={(h) => h.id}
          onReorder={setHabitOrder}
          onDragEnd={persistOrder}
          renderContent={(h) => {
            const TypeIcon = TYPE_ICON[h.type];
            const done = !!h.log?.completedAt;
            return (
              <button
                onClick={() => navigate(`/habits/${h.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", width: "100%" }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: done ? "var(--teal)" : "#F0E4CE",
                    border: "2px solid var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <TypeIcon width={16} height={16} color={done ? "#fff" : "var(--muted)"} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 800 }}>{h.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                    {!h.required && "optional · "}
                    {h.type === "COUNTDOWN" && h.targetSec ? `${Math.round(h.targetSec / 60)} min` : h.type === "COUNTUP" ? "count up" : "tick"}
                  </div>
                </div>
              </button>
            );
          }}
          renderTrailing={(h) => (
            <>
              <IconFlame />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700 }}>{h.currentStreak}</div>
              <button
                onClick={() => removeHabit(h.routineHabitId)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-2)" }}
                aria-label={`Remove ${h.name} from this routine`}
              >
                <IconTrash width={15} height={15} />
              </button>
            </>
          )}
        />

        {showHabitPicker ? (
          <HabitPicker
            alreadyAdded={habits.map((h) => ({ existingHabitId: h.id }))}
            onAdd={addHabit}
            onCancel={() => setShowHabitPicker(false)}
          />
        ) : (
          <button
            onClick={() => setShowHabitPicker(true)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              border: "2px dashed var(--border-soft-2)",
              borderRadius: 13,
              padding: 12,
              color: "var(--muted)",
              background: "none",
              cursor: "pointer",
            }}
          >
            <IconPlus width={16} height={16} strokeWidth={2.6} />
            <span style={{ fontFamily: "var(--font-display)", fontSize: 13.5, fontWeight: 600 }}>Add habit</span>
          </button>
        )}

        <div style={{ marginTop: 14 }}>
          <div className="field-label">Recent sessions</div>
          {!history && <div style={{ fontSize: 13, color: "var(--muted)" }}>Loading...</div>}
          {history && history.sessions.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>No completed sessions yet.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history?.sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 76,
          padding: "14px 20px",
          background: "var(--cream)",
          borderTop: "2px solid var(--border-soft)",
        }}
      >
        <button
          className="btn"
          style={{ background: routine.color }}
          onClick={() => navigate(`/routines/${routine.id}/session`)}
        >
          <IconPlay color="#fff" width={18} height={18} />
          {doneCount === habits.length ? "Review routine" : "Start routine"}
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function SessionCard({ session: s }) {
  const [open, setOpen] = useState(false);
  const doneCount = s.logs.filter((l) => !l.skipped).length;

  return (
    <div className="card" style={{ padding: "12px 14px", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>{formatDate(s.date)}</div>
        <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: "var(--muted-2)" }}>
          {s.startedAt && s.completedAt
            ? `${formatClock(s.startedAt)} – ${formatClock(s.completedAt)}`
            : formatClock(s.completedAt)}
        </div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: doneCount === s.logs.length ? "var(--teal)" : "var(--muted)" }}>
          {doneCount}/{s.logs.length}
        </div>
        <IconChevronRight
          width={13}
          height={13}
          color="var(--muted-2)"
          style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s ease" }}
        />
      </div>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
          {s.logs.map((l) => (
            <div key={l.habitId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
              <div style={{ width: 13, fontSize: 10.5, fontWeight: 700, color: "var(--muted-2)", flexShrink: 0 }}>
                {l.position}
              </div>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: l.skipped ? "var(--red)" : "var(--teal)",
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, fontWeight: 700, color: l.skipped ? "var(--muted)" : "var(--ink)" }}>
                {l.habitName}
              </div>
              {l.skipped ? (
                <div style={{ color: "var(--red)", fontWeight: 600 }}>skipped</div>
              ) : (
                <div style={{ color: "var(--muted)", fontWeight: 600 }}>
                  {l.startedAt && l.completedAt
                    ? `${formatClock(l.startedAt)} – ${formatClock(l.completedAt)}`
                    : formatClock(l.completedAt)}
                  {formatDuration(l.durationSec) ? ` · ${formatDuration(l.durationSec)}` : ""}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
