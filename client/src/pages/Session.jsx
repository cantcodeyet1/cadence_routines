import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { toDateKey } from "../lib/week.js";
import { TimerRing } from "../components/TimerRing.jsx";
import { IconBack, IconCheck, IconSkip, IconPause, IconFlame } from "../components/Icons.jsx";

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
  const [routineNote, setRoutineNote] = useState("");
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
    const result = await api.completeSession(sessionId, routineNote.trim() || null);
    setSummary(result);
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
      />
    );
  }

  if (summary) {
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
            <IconSkip color="#241E3D" />
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
        />
      )}
    </div>
  );
}

function CompleteNoteSheet({ habit, noteText, setNoteText, onSave, onSkip }) {
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
          <button className="btn" onClick={onSave}>Save &amp; continue</button>
          <button
            onClick={onSkip}
            style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600, padding: 6, cursor: "pointer" }}
          >
            Skip note
          </button>
        </div>
      </div>
    </div>
  );
}

function RoutineWrapUp({ routine, logs, note, setNote, onDone }) {
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
        <button className="btn purple" onClick={onDone}>Done for today</button>
      </div>
    </div>
  );
}

function RoutineSummary({ routine, summary, onClose }) {
  return (
    <div className="page">
      <div style={{ textAlign: "center", padding: "40px 20px 0", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
        Nice work
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>{routine.name}</div>
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
        <div style={{ margin: "22px 20px 0", textAlign: "center", padding: "0 12px" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.5 }}>
            &ldquo;{summary.quote}&rdquo;
          </div>
        </div>
      )}

      <div style={{ marginTop: "auto", padding: "16px 20px 26px" }}>
        <button className="btn purple" onClick={onClose}>Back to home</button>
      </div>
    </div>
  );
}
