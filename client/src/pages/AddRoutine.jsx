import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { IconBack, IconPlus, IconTrash, IconDrag, IconCheck } from "../components/Icons.jsx";

const COLORS = ["#7C5CFC", "#4C6EF5", "#06B6A4", "#FF6B35", "#FFB020"];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_VALUES = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun, matching getDay()'s 0=Sun

const TYPES = [
  { value: "TICK", label: "Tick" },
  { value: "COUNTDOWN", label: "Countdown" },
  { value: "COUNTUP", label: "Count up" },
];

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
          {habits.map((h, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "2px solid var(--ink)", borderRadius: 13, padding: "10px 12px" }}>
              <IconDrag color="var(--muted-2)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>
                  {h.name}
                  {h.existingHabitId && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--teal)", marginLeft: 6 }}>EXISTING</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 600 }}>
                  {TYPES.find((t) => t.value === h.type)?.label}
                  {h.type !== "TICK" && h.targetSec ? ` · ${Math.round(h.targetSec / 60)} min` : ""}
                </div>
              </div>
              <button onClick={() => removeHabit(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)" }}>
                <IconTrash />
              </button>
            </div>
          ))}

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

function HabitPicker({ alreadyAdded, onAdd, onCancel }) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const { data } = useCachedData("habits", () => api.getHabits());
  const addedIds = new Set(alreadyAdded.filter((h) => h.existingHabitId).map((h) => h.existingHabitId));

  const results = useMemo(() => {
    const all = data?.habits ?? [];
    const q = query.trim().toLowerCase();
    return all
      .filter((h) => !addedIds.has(h.id))
      .filter((h) => !q || h.name.toLowerCase().includes(q))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query]);

  if (creating) {
    return <InlineHabitForm onAdd={onAdd} onCancel={() => setCreating(false)} initialName={query} />;
  }

  return (
    <div style={{ border: "2px solid var(--ink)", borderRadius: 13, padding: 12, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
      <input
        className="text-input"
        placeholder="Search your habits..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />

      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
          {results.map((h) => (
            <button
              key={h.id}
              onClick={() =>
                onAdd({
                  existingHabitId: h.id,
                  name: h.name,
                  type: h.type,
                  targetSec: null,
                  xpValue: 10,
                  required: true,
                })
              }
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "var(--cream)",
                border: "1.5px solid var(--border-soft)",
                borderRadius: 10,
                padding: "9px 11px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700 }}>{h.name}</div>
              <IconPlus width={14} height={14} strokeWidth={2.6} color="var(--muted)" />
            </button>
          ))}
        </div>
      )}

      {query.trim() && results.length === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>No matching habits.</div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn secondary" style={{ padding: 10 }} onClick={onCancel}>Cancel</button>
        <button className="btn teal" style={{ padding: 10 }} onClick={() => setCreating(true)}>
          Create new{query.trim() ? ` "${query.trim()}"` : ""}
        </button>
      </div>
    </div>
  );
}

function InlineHabitForm({ onAdd, onCancel, initialName = "" }) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState("COUNTDOWN");
  const [minutes, setMinutes] = useState(5);
  const [required, setRequired] = useState(true);

  function add() {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      type,
      targetSec: type === "TICK" ? null : minutes * 60,
      xpValue: 10,
      required,
    });
  }

  return (
    <div style={{ border: "2px solid var(--ink)", borderRadius: 13, padding: 12, background: "#fff", display: "flex", flexDirection: "column", gap: 10 }}>
      <input className="text-input" placeholder="Habit name" value={name} onChange={(e) => setName(e.target.value)} />

      <div style={{ display: "flex", gap: 6 }}>
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setType(t.value)}
            className="day-chip"
            style={{ background: type === t.value ? "#FFE9C7" : "#fff", borderColor: type === t.value ? "var(--ink)" : "var(--border-soft)", color: "var(--ink)" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {type !== "TICK" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>Duration</span>
          <input
            type="number"
            min={1}
            className="text-input"
            style={{ width: 80 }}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>min</span>
        </div>
      )}

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--muted)" }}>
        <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
        Required for streak
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn secondary" style={{ padding: 10 }} onClick={onCancel}>Cancel</button>
        <button className="btn" style={{ padding: 10 }} onClick={add}>
          <IconCheck width={14} height={14} color="#fff" /> Add
        </button>
      </div>
    </div>
  );
}
