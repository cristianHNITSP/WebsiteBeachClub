    // src/components/ui/ExpandPanel.jsx
import React from "react";

const ExpandPanel = ({ open, children, maxHeight = 900, style, innerStyle }) => {
  return (
    <div
      style={{
        maxHeight: open ? maxHeight : 0,
        opacity: open ? 1 : 0,
        marginTop: open ? 12 : 0,
        overflow: "hidden",
        transform: open ? "translateY(0)" : "translateY(-8px)",
        transition: "all 0.25s ease",
        ...style,
      }}
    >
      {open && <div style={{ padding: 0, ...innerStyle }}>{children}</div>}
    </div>
  );
};

export default ExpandPanel;
