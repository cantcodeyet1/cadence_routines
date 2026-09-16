import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { HabitPicker, TYPES } from "../components/HabitPicker.jsx";
import { IconBack, IconPlus, IconTrash, IconDrag } from "../components/Icons.jsx";

const COLORS = ["#7C5CFC", "#4C6EF5", "#06B6A4", "#FF6B35", "#FFB020"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, matching getDay()'s 0=Sun

export function AddRoutine() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [quote, setQuote] = useState("");
  const [weekdays, setWeekdays] = useState(new Set([1, 2, 3, 4, 5]));
  const [habits, setHabits] = useState([]);
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function toggleDay(v) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  function addHabit(habit) {
    setHabits((prev) => [...prev, habit]);
    setShowHabitPicker(false);
  }

  function removeHabit(i) {
    setHabits((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!name.trim() || weekdays.size === 0) {
      setError("Give it a name and at least one day.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createRoutine({
        name,
        color,
        quote: quote.trim() || null,
        weekdays: [...weekdays],
        habits: habits.map((h) => (h.existingHabitId ? h : { ...h, colorTag: color })),
      });
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <div className="title-lg">New Routine</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: "20px 20px 0", flex: 1 }}>
        <div className="field-label">Name</div>
        <input
          className="text-input"
          placeholder="e.g. Evening Wind-down"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="field-label" style={{ marginTop: 18 }}>Color</div>
        <div style={{ display: "flex", gap: 9 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: c,
                border: color === c ? "2.5px solid var(--ink)" : "2px solid var(--border-soft)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <div className="field-label" style={{ marginTop: 18 }}>Which days?</div>
        <div style={{ display: "flex", gap: 6 }}>
          {DAY_LETTERS.map((letter, i) => {
            const v = DAY_VALUES[i];
            const active = weekdays.has(v);
            return (
              <button key={i} className={`day-chip${active ? " active" : ""}`} onClick={() => toggleDay(v)} style={{ background: active ? color : undefined }}>
                {letter}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 7px" }}>
          <div className="field-label" style={{ margin: 0 }}>Habits in this routine</div>
          <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{habits.length} added</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {habits.length > 0 && (
            <DraggableHabitList habits={habits} setHabits={setHabits} onRemove={removeHabit} />
          )}

          {showHabitPicker ? (
            <HabitPicker alreadyAdded={habits} onAdd={addHabit} onCancel={() => setShowHabitPicker(false)} />
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
        </div>

        <div className="field-label" style={{ marginTop: 22 }}>A quote to close with (optional)</div>
        <textarea
          className="text-input"
          style={{ minHeight: 64, resize: "vertical" }}
          placeholder="Shown at the end of every session"
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
        />

        {error && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 700, marginTop: 14 }}>{error}</div>}
      </div>

      <div style={{ padding: "14px 20px 26px" }}>
        <button className="btn indigo" onClick={submit} disabled={saving}>
          {saving ? "Creating..." : "Create routine"}
        </button>
      </div>
    </div>
  );
}

// Press-and-drag reordering (mouse + touch via Pointer Events). Dragging the
// handle re-sorts the live array as soon as the pointer crosses into a
// neighboring row's half, rather than waiting for drop.
export function DraggableHabitList({ habits, setHabits, onRemove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const rowRefs = useRef([]);
  const dragState = useRef({ startY: 0, index: 0, rowHeight: 60 });

  function onPointerDown(e, index) {
    e.preventDefault();
    const row = rowRefs.current[index];
    const rowHeight = (row?.offsetHeight ?? 60) + 8; // + gap
    dragState.current = { startY: e.clientY, index, rowHeight };
    setDragIndex(index);
    e.target.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (dragIndex === null) return;
    const { startY, index, rowHeight } = dragState.current;
    const delta = e.clientY - startY;
    const shift = Math.round(delta / rowHeight);
    if (shift === 0) return;

    const nextIndex = Math.max(0, Math.min(habits.length - 1, index + shift));
    if (nextIndex === index) return;

    setHabits((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(nextIndex, 0, moved);
      return next;
    });
    dragState.current = { startY: e.clientY, index: nextIndex, rowHeight };
    setDragIndex(nextIndex);
  }

  function onPointerUp() {
    setDragIndex(null);
  }

  return (
    <>
      {habits.map((h, i) => (
        <div
          key={h._key ?? i}
          ref={(el) => (rowRefs.current[i] = el)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: `2px solid ${dragIndex === i ? "var(--orange)" : "var(--ink)"}`,
            borderRadius: 13,
            padding: "10px 12px",
            boxShadow: dragIndex === i ? "3px 3px 0 var(--ink)" : "none",
            position: "relative",
            zIndex: dragIndex === i ? 2 : 1,
            touchAction: "none",
          }}
        >
          <div style={{ width: 18, fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 700, color: "var(--muted-2)", flexShrink: 0 }}>
            {i + 1}
          </div>
          <div
            onPointerDown={(e) => onPointerDown(e, i)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: "grab", display: "flex", touchAction: "none" }}
          >
            <IconDrag color="var(--muted-2)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              {h.name}
              {h.existingHabitId && (
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--teal)", marginLeft: 6 }}>EXISTING</span>
              )}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
              {TYPES.find((t) => t.value === h.type)?.label}
              {h.type === "COUNTDOWN" && h.targetSec ? ` · ${Math.round(h.targetSec / 60)} min` : ""}
            </div>
          </div>
          <button onClick={() => onRemove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}>
            <IconTrash />
          </button>
        </div>
      ))}
    </>
  );
}
