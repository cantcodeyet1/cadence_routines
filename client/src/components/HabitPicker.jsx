import { useMemo, useState } from "react";
import { api } from "../api.js";
import { useCachedData } from "../lib/cache.js";
import { IconPlus, IconCheck } from "./Icons.jsx";

export const TYPES = [
  { value: "TICK", label: "Tick" },
  { value: "COUNTDOWN", label: "Countdown" },
  { value: "COUNTUP", label: "Count up" },
];

// Search-first habit picker: search existing habits, or fall back to
// creating a new one inline. `onAdd` receives either
// { existingHabitId, name, type, ... } or a freshly-authored habit shape.
export function HabitPicker({ alreadyAdded, onAdd, onCancel }) {
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
      targetSec: type === "COUNTDOWN" ? minutes * 60 : null,
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

      {type === "COUNTDOWN" && (
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
