import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { IconClose, IconCheck, IconTimer, IconCountUp } from "../components/Icons.jsx";

const TYPES = [
  { value: "TICK", label: "Tick", Icon: IconCheck },
  { value: "COUNTDOWN", label: "Countdown", Icon: IconTimer },
  { value: "COUNTUP", label: "Count up", Icon: IconCountUp },
];

const COLORS = ["#7C5CFC", "#06B6A4", "#FF6B35", "#FFB020", "#4C6EF5"];

export function AddHabit() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [type, setType] = useState("COUNTDOWN");
  const [minutes, setMinutes] = useState(5);
  const [colorTag, setColorTag] = useState(COLORS[0]);
  const [required, setRequired] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (!name.trim()) {
      setError("Give the habit a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createHabit({
        name: name.trim(),
        type,
        targetSec: type === "TICK" ? null : minutes * 60,
        colorTag,
      });
      navigate("/habits");
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
          <IconClose />
        </button>
        <div className="title-lg">New Habit</div>
        <div style={{ width: 40 }} />
      </div>

      <div style={{ padding: "22px 20px 0", flex: 1 }}>
        <div className="field-label">Name</div>
        <input className="text-input" placeholder="e.g. Meditate" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="field-label" style={{ marginTop: 22 }}>How do you track it?</div>
        <div style={{ display: "flex", gap: 8 }}>
          {TYPES.map(({ value, label, Icon }) => {
            const active = type === value;
            return (
              <button
                key={value}
                onClick={() => setType(value)}
                style={{
                  flex: 1,
                  background: active ? "#FFE9C7" : "#fff",
                  border: active ? "2.5px solid var(--ink)" : "2px solid var(--border-soft)",
                  boxShadow: active ? "2px 2px 0 var(--ink)" : "none",
                  borderRadius: 13,
                  padding: "12px 8px",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <Icon color={active ? "var(--ink)" : "var(--muted)"} style={{ margin: "0 auto 6px", display: "block" }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? "var(--ink)" : "var(--muted)" }}>{label}</div>
              </button>
            );
          })}
        </div>

        {type !== "TICK" && (
          <>
            <div className="field-label" style={{ marginTop: 22 }}>Duration</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <button className="icon-btn" style={{ borderRadius: 13 }} onClick={() => setMinutes((m) => Math.max(1, m - 1))}>&minus;</button>
              <div style={{ flex: 1, textAlign: "center", background: "#fff", border: "2.5px solid var(--ink)", borderRadius: 13, padding: 12, fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600 }}>
                {String(minutes).padStart(2, "0")}:00
              </div>
              <button className="icon-btn" style={{ borderRadius: 13 }} onClick={() => setMinutes((m) => m + 1)}>+</button>
            </div>
          </>
        )}

        <div className="field-label" style={{ marginTop: 22 }}>Color tag</div>
        <div style={{ display: "flex", gap: 10 }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColorTag(c)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: c,
                border: colorTag === c ? "2.5px solid var(--ink)" : "2px solid var(--border-soft)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24, background: "#fff", border: "2px solid var(--border-soft)", borderRadius: 14, padding: "13px 15px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Required for streak</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Missing it breaks the routine's streak</div>
          </div>
          <div className={`switch${required ? " on" : ""}`} onClick={() => setRequired((r) => !r)}>
            <div className="knob" />
          </div>
        </div>

        {error && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 700, marginTop: 14 }}>{error}</div>}
      </div>

      <div style={{ padding: "16px 20px 26px" }}>
        <button className="btn" onClick={submit} disabled={saving}>
          {saving ? "Adding..." : "Add habit"}
        </button>
      </div>
    </div>
  );
}
