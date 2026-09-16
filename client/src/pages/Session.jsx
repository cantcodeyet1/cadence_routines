import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { invalidate } from "../lib/cache.js";
import { toDateKey } from "../lib/week.js";
import { TIERS, NAMES } from "../lib/milestones.js";
import { TimerRing } from "../components/TimerRing.jsx";
import { IconBack, IconCheck, IconSkip, IconPause, IconFlame, IconQuote } from "../components/Icons.jsx";

// Lightens (positive percent) or darkens (negative percent) a hex color -
// used to build a gradient/ribbon shades from a routine's own color without
// needing a fixed palette of pre-made variants for every accent color.
function shade(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function Session() {
  const { routineId } = useParams();
  const navigate = useNavigate();

  const [routine, setRoutine] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [logs, setLogs] = useState({}); // habitId -> { completedAt, skipped, durationSec }
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [noteHabit, setNoteHabit] = useState(null); // habit object when the note sheet is open
  const [noteText, setNoteText] = useState("");
  const [summary, setSummary] = useState(null);
  const [celebrated, setCelebrated] = useState(false);
  const [routineNote, setRoutineNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const tickRef = useRef(null);
  const habitStartRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const date = toDateKey(new Date());
      const [detail, session] = await Promise.all([
        api.getRoutine(routineId, date),
        api.startSession(routineId, date),
      ]);
      if (cancelled) return;
      setRoutine(detail);
      setSessionId(session.id);
      const logMap = {};
      for (const l of session.logs) logMap[l.habitId] = l;
      setLogs(logMap);

      const firstOpen = detail.habits.findIndex((h) => !logMap[h.id] || (!logMap[h.id].completedAt && !logMap[h.id].skipped));
      setIndex(firstOpen === -1 ? detail.habits.length : firstOpen);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [routineId]);

  const current = routine?.habits[index];

  // reset the timer whenever the active habit changes
  useEffect(() => {
    if (!current) return;
    setSeconds(current.type === "COUNTDOWN" ? current.targetSec ?? 0 : 0);
    setRunning(true);
    habitStartRef.current = new Date();
  }, [current?.id]);

  useEffect(() => {
    if (!current || current.type === "TICK" || !running || noteHabit) return;
    tickRef.current = setInterval(() => {
      setSeconds((s) => {
        if (current.type === "COUNTDOWN") return Math.max(0, s - 1);
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [current, running, noteHabit]);

  async function completeCurrent() {
    if (!current) return;
    setRunning(false);
    setNoteHabit(current);
    setNoteText("");
  }

  async function saveNoteAndAdvance() {
    const habit = noteHabit;
    // `seconds` is frozen at whatever it was when Complete was tapped (the
    // ticking effect stops as soon as noteHabit is set) - normalize it to
    // true elapsed time regardless of whether this habit counts up or down.
    const elapsed = habit.type === "COUNTDOWN" ? (habit.targetSec ?? 0) - seconds : seconds;
    setSavingNote(true);
    try {
      await api.logHabit(sessionId, {
        habitId: habit.id,
        startedAt: habitStartRef.current?.toISOString(),
        completedAt: new Date().toISOString(),
        durationSec: habit.type === "TICK" ? null : elapsed,
        note: noteText.trim() || null,
      });
      setLogs((prev) => ({ ...prev, [habit.id]: { completedAt: new Date().toISOString(), note: noteText } }));
      setNoteHabit(null);
      advance();
    } finally {
      setSavingNote(false);
    }
  }

  function skipCurrent() {
    if (!current) return;
    api.logHabit(sessionId, { habitId: current.id, skipped: true }).catch(() => {});
    setLogs((prev) => ({ ...prev, [current.id]: { skipped: true } }));
    advance();
  }

  function advance() {
    if (index + 1 >= routine.habits.length) {
      setIndex(routine.habits.length);
    } else {
      setIndex(index + 1);
    }
  }

  function goBack() {
    if (index > 0) setIndex(index - 1);
  }

  async function finishRoutine() {
    setFinishing(true);
    try {
      const result = await api.completeSession(sessionId, routineNote.trim() || null);
      setSummary(result);
      // The routine and every habit it contains just changed streak/XP state -
      // drop the other pages' cached copies so Home, Habits and Milestones
      // pick up the new numbers on next visit instead of showing stale ones.
      invalidate([
        `routines:${toDateKey(new Date())}`,
        "routines:all",
        "habits",
        ...routine.habits.map((h) => `habit:${h.id}`),
      ]);
    } finally {
      setFinishing(false);
    }
  }

  if (!routine) {
    return <div className="center-loading">Loading...</div>;
  }

  // all habits handled, not yet marked complete on the server
  if (index >= routine.habits.length && !summary) {
    return (
      <RoutineWrapUp
        routine={routine}
        logs={logs}
        note={routineNote}
        setNote={setRoutineNote}
        onDone={finishRoutine}
        saving={finishing}
      />
    );
  }

  if (summary) {
    const crossedIndex =
      summary.bestStreak > routine.bestStreak
        ? TIERS.findIndex((t) => t > routine.bestStreak && t <= summary.bestStreak)
        : -1;
    if (crossedIndex !== -1 && !celebrated) {
      return (
        <MilestoneReached
          routine={routine}
          tier={TIERS[crossedIndex]}
          name={NAMES[crossedIndex]}
          nextTier={TIERS[crossedIndex + 1] ?? null}
          onContinue={() => setCelebrated(true)}
        />
      );
    }
    return <RoutineSummary routine={routine} summary={summary} onClose={() => navigate("/")} />;
  }

  const next = routine.habits[index + 1];
  const progress =
    current.type === "COUNTDOWN" && current.targetSec
      ? 1 - seconds / current.targetSec
      : current.type === "COUNTUP"
      ? Math.min(1, seconds / 300)
      : 0;

  return (
    <div className="page" style={{ position: "relative" }}>
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate("/")}>
          <IconBack />
        </button>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--muted)" }}>
          {routine.name}
        </div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ display: "flex", gap: 5, padding: "16px 20px 0" }}>
        {routine.habits.map((h, i) => (
          <div
            key={h.id}
            style={{
              flex: 1,
              height: 9,
              borderRadius: 5,
              background: i < index ? "var(--teal)" : i === index ? "var(--orange)" : "#F0E4CE",
              border: `1.5px solid ${i <= index ? "var(--ink)" : "var(--border-soft-2)"}`,
            }}
          />
        ))}
      </div>
      <div style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: "var(--muted)", marginTop: 7 }}>
        HABIT {index + 1} OF {routine.habits.length}
      </div>

      {current.type === "TICK" ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 60 }}>
          <div
            style={{
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "#CFF3EC",
              border: "3px solid #241E3D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconCheck width={64} height={64} color="#06B6A4" />
          </div>
        </div>
      ) : (
        <TimerRing
          progress={progress}
          label={formatTime(current.type === "COUNTDOWN" ? seconds : seconds)}
          sublabel={current.type === "COUNTDOWN" ? `of ${formatTime(current.targetSec)}` : "elapsed"}
        />
      )}

      <div style={{ textAlign: "center", marginTop: 18 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 27, fontWeight: 600 }}>{current.name}</div>
        <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 700, marginTop: 2 }}>
          +{current.xpValue} XP when you finish
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginTop: 30 }}>
        <button className="icon-btn" style={{ borderRadius: 13 }} onClick={goBack} disabled={index === 0}>
          <IconSkip style={{ transform: "scaleX(-1)" }} color="#241E3D" />
        </button>
        <button
          onClick={completeCurrent}
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            background: "var(--teal)",
            border: "3px solid var(--ink)",
            boxShadow: "6px 6px 0 var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconCheck width={34} height={34} color="#fff" />
        </button>
        {current.type !== "TICK" ? (
          <button className="icon-btn" style={{ borderRadius: 13 }} onClick={() => setRunning((r) => !r)}>
            <IconPause color="#241E3D" />
          </button>
        ) : (
          <button className="icon-btn" style={{ borderRadius: 13 }} onClick={skipCurrent}>
            <IconSkip style={{ transform: "scaleX(-1)" }} color="#241E3D" />
          </button>
        )}
      </div>

      {next && (
        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              background: "#fff",
              border: "2.5px solid var(--ink)",
              borderRadius: "18px 18px 0 0",
              padding: "14px 20px 30px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#F0E4CE",
                border: "2px solid var(--ink)",
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 10.5, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                Up next
              </div>
              <div style={{ fontWeight: 800, fontSize: 14.5 }}>{next.name}</div>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--orange)" }}>
              +{next.xpValue} XP
            </div>
          </div>
        </div>
      )}

      {noteHabit && (
        <CompleteNoteSheet
          habit={noteHabit}
          noteText={noteText}
          setNoteText={setNoteText}
          onSave={saveNoteAndAdvance}
          onSkip={() => {
            setNoteText("");
            saveNoteAndAdvance();
          }}
          saving={savingNote}
        />
      )}
    </div>
  );
}

function CompleteNoteSheet({ habit, noteText, setNoteText, onSave, onSkip, saving }) {
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(36,30,61,0.55)" }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          border: "2.5px solid var(--ink)",
          borderBottom: "none",
          borderRadius: "26px 26px 0 0",
          padding: "26px 22px 30px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: "var(--border-soft)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "var(--teal)",
              border: "2.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconCheck width={24} height={24} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>{habit.name} complete!</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--orange)", marginTop: 2 }}>
              +{habit.xpValue} XP earned
            </div>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div className="field-label">Add a note (optional)</div>
          <textarea
            className="text-input"
            style={{ minHeight: 76, resize: "vertical" }}
            placeholder="How did it go?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button className={`btn${saving ? " pressed" : ""}`} onClick={onSave} disabled={saving}>
            Save &amp; continue
          </button>
          <button
            onClick={onSkip}
            disabled={saving}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              padding: 6,
              cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            Skip note
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineWrapUp({ routine, logs, note, setNote, onDone, saving }) {
  const doneCount = routine.habits.filter((h) => logs[h.id]?.completedAt).length;
  return (
    <div className="page">
      <div style={{ textAlign: "center", padding: "40px 20px 0", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
        Routine complete
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>{routine.name}, done!</div>
        <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4, fontWeight: 600 }}>
          {doneCount} of {routine.habits.length} quests cleared
        </div>
      </div>

      <div style={{ padding: "22px 20px 0" }}>
        <div className="field-label">Add a note about today (optional)</div>
        <textarea
          className="text-input"
          style={{ minHeight: 90, resize: "vertical" }}
          placeholder="How did the whole routine feel?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div style={{ marginTop: "auto", padding: "16px 20px 26px" }}>
        <button className={`btn purple${saving ? " pressed" : ""}`} onClick={onDone} disabled={saving}>
          Done for today
        </button>
      </div>
    </div>
  );
}

function RoutineSummary({ routine, summary, onClose }) {
  return (
    <div className="page" style={{ background: routine.color }}>
      <div style={{ textAlign: "center", padding: "40px 20px 0", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
        Nice work
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "#fff" }}>{routine.name}</div>
      </div>

      <div style={{ display: "flex", gap: 10, padding: "22px 20px 0" }}>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--orange)" }}>+{summary.xpEarned}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>XP earned</div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <IconFlame />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700 }}>{summary.currentStreak}</div>
          </div>
          <div style={{ fontSize: 11, color: summary.streakAdvanced ? "var(--teal)" : "var(--muted)", fontWeight: 700 }}>
            {summary.streakAdvanced ? "streak" : "streak paused"}
          </div>
        </div>
        <div className="card card-pop" style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 700, color: "var(--purple)" }}>
            {summary.doneCount}/{summary.totalCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>cleared</div>
        </div>
      </div>

      {!summary.streakAdvanced && (
        <div style={{ margin: "18px 20px 0", padding: 12, background: "var(--red-bg)", border: "2px solid var(--red-border)", borderRadius: 12, fontSize: 13, color: "#7A2323", fontWeight: 600 }}>
          A required habit was skipped, so the streak didn't advance today.
        </div>
      )}

      {summary.quote && (
        <div
          style={{
            margin: "22px 20px 0",
            background: "#fff",
            border: "2.5px solid var(--ink)",
            borderRadius: 16,
            padding: "30px 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
            boxShadow: "3px 3px 0 var(--ink)",
          }}
        >
          <IconQuote color={routine.color} />
          <div style={{ fontSize: 15, fontStyle: "italic", fontWeight: 600, lineHeight: 1.5 }}>{summary.quote}</div>
        </div>
      )}

      <div style={{ marginTop: "auto", padding: "16px 20px 26px" }}>
        <button className="btn secondary" onClick={onClose}>Back to home</button>
      </div>
    </div>
  );
}

const CONFETTI = [
  { top: "8%", left: "14%", size: 10, color: "#FFB020", rotate: 12 },
  { top: "14%", left: "78%", size: 8, color: "#06B6A4", rotate: -18 },
  { top: "22%", left: "30%", size: 7, color: "#fff", rotate: 30 },
  { top: "10%", left: "55%", size: 9, color: "#FF6B35", rotate: -8 },
  { top: "28%", left: "85%", size: 6, color: "#fff", rotate: 20 },
  { top: "20%", left: "8%", size: 6, color: "#4C6EF5", rotate: -25 },
];

function MilestoneReached({ routine, tier, name, nextTier, onContinue }) {
  const ribbonColor = shade(routine.color, -35);
  return (
    <div
      className="page"
      style={{
        background: `linear-gradient(160deg, ${shade(routine.color, 18)} 0%, ${shade(routine.color, -18)} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {CONFETTI.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top,
            left: c.left,
            width: c.size,
            height: c.size,
            background: c.color,
            borderRadius: 3,
            transform: `rotate(${c.rotate}deg)`,
            opacity: 0.9,
          }}
        />
      ))}

      <div style={{ textAlign: "center", padding: "56px 20px 0", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.75)", textTransform: "uppercase", letterSpacing: 1 }}>
        Milestone reached
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
        <div style={{ position: "relative", width: 176, height: 176 }}>
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: "50%",
              width: 0,
              height: 0,
              borderLeft: "20px solid transparent",
              borderRight: "20px solid transparent",
              borderTop: `48px solid ${ribbonColor}`,
              transform: "translateX(-50%) rotate(10deg) translateX(-22px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 6,
              left: "50%",
              width: 0,
              height: 0,
              borderLeft: "20px solid transparent",
              borderRight: "20px solid transparent",
              borderTop: `48px solid ${ribbonColor}`,
              transform: "translateX(-50%) rotate(-10deg) translateX(22px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: "var(--amber)",
              border: "3px solid var(--ink)",
              boxShadow: "6px 6px 0 rgba(0,0,0,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ position: "absolute", inset: 12, borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.75)" }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 50, fontWeight: 700, color: "var(--ink)" }}>{tier}</div>
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 22, padding: "0 30px" }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "#fff" }}>You're on fire!</div>
        <div style={{ fontSize: 14.5, color: "rgba(255,255,255,0.9)", fontWeight: 600, marginTop: 10, lineHeight: 1.5 }}>
          {tier} days of {routine.name}, back to back. That's the <strong>{name}</strong> badge &mdash; earned.
        </div>
      </div>

      {nextTier && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 26 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: "10px 22px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: 1 }}>
              Next up
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#fff", marginTop: 2 }}>
              Day {nextTier} &middot; only {nextTier - tier} to go
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "auto", padding: "16px 20px 26px" }}>
        <button className="btn secondary" onClick={onContinue}>Keep going</button>
      </div>
    </div>
  );
}
