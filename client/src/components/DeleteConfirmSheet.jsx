import { IconTrash } from "./Icons.jsx";

// Bottom-sheet confirmation before a destructive delete - same shape as the
// habit-complete note sheet, so destructive actions still feel like part of
// the app rather than a jarring native confirm().
export function DeleteConfirmSheet({ title, subtitle, confirmLabel, onCancel, onConfirm, deleting }) {
  return (
    <div style={{ position: "fixed", inset: 0, maxWidth: 430, margin: "0 auto", zIndex: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(36,30,61,0.55)" }} onClick={deleting ? undefined : onCancel} />
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
              background: "var(--red)",
              border: "2.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconTrash width={22} height={22} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600, marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 22 }}>
          <button
            className={`btn${deleting ? " pressed" : ""}`}
            style={{ background: "var(--red)" }}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontFamily: "var(--font-display)",
              fontSize: 13,
              fontWeight: 600,
              padding: 6,
              cursor: deleting ? "default" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
