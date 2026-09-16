import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { invalidate } from "../lib/cache.js";
import { currentWeek, toDateKey } from "../lib/week.js";
import { DeleteConfirmSheet } from "../components/DeleteConfirmSheet.jsx";
import { IconClose, IconCheck, IconTimer, IconCountUp, IconTrash } from "../components/Icons.jsx";

const TYPES = [
  { value: "TICK", label: "Tick", Icon: IconCheck },
  { value: "COUNTDOWN", label: "Countdown", Icon: IconTimer },
  { value: "COUNTUP", label: "Count up", Icon: IconCountUp },
];

const COLORS = ["#7C5CFC", "#06B6A4", "#FF6B35", "#FFB020", "#4C6EF5"];

export function AddHabit() {
  const navigate = useNavigate();
  const { habitId } = useParams();
  const isEdit = !!habitId;

  const [name, setName] = useState("");
  const [type, setType] = useState("COUNTDOWN");
  const [minutes, setMinutes] = useState(5);
  const [colorTag, setColorTag] = useState(COLORS[0]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [routineIds, setRoutineIds] = useState([]); // routines this habit is in, for cache invalidation on delete
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getHabit(habitId)
      .then((h) => {
        setName(h.name);
        setType(h.type);
        if (h.targetSec) setMinutes(Math.max(1, Math.round(h.targetSec / 60)));
        setColorTag(h.colorTag);
        setRoutineIds(h.routines.map((r) => r.id));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [habitId, isEdit]);

  async function submit() {
    if (!name.trim()) {
      setError("Give the habit a name.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      type,
      targetSec: type === "COUNTDOWN" ? minutes * 60 : null,
      colorTag,
    };
    try {
      if (isEdit) {
        await api.updateHabit(habitId, payload);
        navigate(`/habits/${habitId}`);
      } else {
        await api.createHabit(payload);
        navigate("/habits");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteHabit() {
    setDeleting(true);
    try {
      await api.deleteHabit(habitId);
      const today = toDateKey(new Date());
      invalidate([
        "habits",
        "routines:all",
        ...currentWeek().map((d) => `routines:${d.key}`),
        ...routineIds.flatMap((id) => [`routine:${id}:${today}`, `routine-history:${id}`]),
      ]);
      navigate("/habits");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  if (loading) return <div className="center-loading">Loading...</div>;

  return (
    <div className="page">
      <div className="top-bar" style={{ justifyContent: "space-between" }}>
        <button className="icon-btn" onClick={() => navigate(-1)}>
          <IconClose />
        </button>
        <div className="title-lg">{isEdit ? "Edit Habit" : "New Habit"}</div>
        {isEdit ? (
          <button className="icon-btn" aria-label="Delete habit" onClick={() => setConfirmingDelete(true)}>
            <IconTrash color="var(--red)" />
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
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

        {type === "COUNTDOWN" && (
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

        {error && <div style={{ color: "var(--red)", fontSize: 13, fontWeight: 700, marginTop: 14 }}>{error}</div>}
      </div>

      <div style={{ padding: "16px 20px 26px" }}>
        <button className={`btn${saving ? " pressed" : ""}`} onClick={submit} disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Save changes" : "Add habit"}
        </button>
      </div>

      {confirmingDelete && (
        <DeleteConfirmSheet
          title={`Delete ${name || "this habit"}?`}
          subtitle={
            routineIds.length > 0
              ? `This removes it from ${routineIds.length} routine${routineIds.length === 1 ? "" : "s"} and its logged history for good.`
              : "This removes its logged history for good."
          }
          confirmLabel="Delete habit"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={deleteHabit}
          deleting={deleting}
        />
      )}
    </div>
  );
}
