import { useRef, useState } from "react";
import { IconDrag } from "./Icons.jsx";

// Press-and-drag reordering (mouse + touch via Pointer Events). Dragging the
// handle re-sorts the live array as soon as the pointer crosses into a
// neighboring row's half. `onReorder` fires on every live shift (for
// optimistic display); `onDragEnd` fires once, with the settled order, so
// the caller can persist it without spamming the server mid-drag.
export function DraggableList({ items, getKey, onReorder, onDragEnd, renderContent, renderTrailing }) {
  const [dragIndex, setDragIndex] = useState(null);
  const rowRefs = useRef([]);
  const dragState = useRef({ startY: 0, index: 0, rowHeight: 60 });
  const latestOrder = useRef(items);
  latestOrder.current = items;

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

    const nextIndex = Math.max(0, Math.min(items.length - 1, index + shift));
    if (nextIndex === index) return;

    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    onReorder(next);
    dragState.current = { startY: e.clientY, index: nextIndex, rowHeight };
    setDragIndex(nextIndex);
  }

  function onPointerUp() {
    setDragIndex(null);
    onDragEnd?.(latestOrder.current);
  }

  return (
    <>
      {items.map((item, i) => (
        <div
          key={getKey(item)}
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
            zIndex: dragIndex === i ? 2 : "auto",
          }}
        >
          <div style={{ width: 16, fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, color: "var(--muted-2)", flexShrink: 0 }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>{renderContent(item, i)}</div>
          {renderTrailing && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{renderTrailing(item, i)}</div>}
        </div>
      ))}
    </>
  );
}
