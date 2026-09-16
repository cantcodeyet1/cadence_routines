import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { HabitPicker, TYPES } from "../components/HabitPicker.jsx";
import { DraggableList } from "../components/DraggableList.jsx";
import { IconBack, IconPlus, IconTrash, IconQuote } from "../components/Icons.jsx";

const COLORS = ["#7C5CFC", "#4C6EF5", "#06B6A4", "#FF6B35", "#FFB020"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, matching getDay()'s 0=Sun

export function AddRoutine() {
  const navigate = useNavigate();
  const { routineId } = useParams();
  const isEdit = !!routineId;

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [quote, setQuote] = useState("");
  const [weekdays, setWeekdays] = useState(new Set([1, 2, 3, 4, 5]));
  const [habits, setHabits] = useState([]);
  const [showHabitPicker, setShowHabitPicker] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getRoutine(routineId)
      .then((r) => {
        setName(r.name);
        setColor(r.color);
        setQuote(r.quote || "");
        setWeekdays(new Set(r.weekdays));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [routineId, isEdit]);

  function toggleDay(v) {
    setWeekdays((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  }

  function addHabit(habit) {
    setHabits((prev) => [...prev, { ...habit, _key: `${Date.now()}-${prev.length}` }]);
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
      if (isEdit) {
        await api.updateRoutine(routineId, {
          name,
          color,
          quote: quote.trim() || null,
          weekdays: [...weekdays],
        });
        navigate(`/routines/${routineId}`);
      } else {
        await api.createRoutine({
          name,
          color,
          quote: quote.trim() || null,
          weekdays: [...weekdays],
          habits: habits.map((h) => (h.existingHabitId ? h : { ...h, colorTag: color })),
        });
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="center-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconBack />
        </button>
        <div className="title-lg">{isEdit ? "Edit Routine" : "New Routine"}</div>
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

        {!isEdit && (
          <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "20px 0 7px" }}>
              <div className="field-label" style={{ margin: 0 }}>Habits in this routine</div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{habits.length} added</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {habits.length > 0 && (
                <DraggableList
                  items={habits}
                  getKey={(h) => h._key}
                  onReorder={setHabits}
                  renderContent={(h) => (
                    <>
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
                    </>
                  )}
                  renderTrailing={(h) => (
                    <button
                      onClick={() => removeHabit(habits.indexOf(h))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}
                    >
                      <IconTrash />
                    </button>
                  )}
                />
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
          </>
        )}

        <div className="field-label" style={{ marginTop: 22 }}>A quote to close with (optional)</div>
        <div
          style={{
            background: "#fff",
            border: "2.5px solid var(--ink)",
            borderRadius: 15,
            padding: "14px 16px",
            display: "flex",
            gap: 10,
          }}
        >
          <IconQuote color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <textarea
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              resize: "vertical",
              minHeight: 60,
              fontFamily: "var(--font-body)",
              fontSize: 14.5,
              fontStyle: "italic",
              color: "var(--ink)",
              background: "transparent",
            }}
            placeholder="Shown at the end of every session"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
          />
        </div>

        {error && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 700, marginTop: 14 }}>{error}</div>}
      </div>

      <div style={{ padding: "14px 20px 26px" }}>
        <button className="btn indigo" onClick={submit} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create routine"}
        </button>
      </div>
    </div>
  );
}
