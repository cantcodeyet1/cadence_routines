// progress: 0..1 fraction of the ring to fill (clockwise from the top)
export function TimerRing({ progress, label, sublabel, color = "#06B6A4" }) {
  const r = 98;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, progress)));

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
      <div style={{ position: "relative", width: 280, height: 280 }}>
        <svg width="280" height="280" viewBox="0 0 280 280" style={{ position: "absolute", inset: 0 }}>
          <circle cx="140" cy="140" r="126" fill="#CFF3EC" stroke="#241E3D" strokeWidth="3" />
        </svg>
        <div style={{ position: "relative", width: 232, height: 232, margin: "24px auto" }}>
          <svg width="232" height="232" viewBox="0 0 232 232">
            <circle cx="116" cy="116" r={r} fill="#fff" stroke="#241E3D" strokeWidth="3" />
            <circle
              cx="116"
              cy="116"
              r={r}
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              transform="rotate(-90 116 116)"
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--muted)" }}>{sublabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
