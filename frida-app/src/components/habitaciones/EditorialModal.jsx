// src/components/habitaciones/EditorialModal.jsx
// Custom modals — no Ant Design Modal/Drawer.
// Two variants: SlidePanel (right→left) and CenteredModal (gallery).
import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { DS } from "../website/glassStyles";

/* ═══════════════════════════════════════════════════════════════
   BACKDROP — shared backdrop with blur
   ═══════════════════════════════════════════════════════════════ */
const Backdrop = ({ open, onClick, zIndex = 900 }) => (
  <div
    onClick={onClick}
    style={{
      position: "fixed",
      inset: 0,
      zIndex,
      background: "rgba(0,0,0,0.22)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      opacity: open ? 1 : 0,
      pointerEvents: open ? "auto" : "none",
      transition: "opacity 0.35s cubic-bezier(0.4,0,0.2,1)",
    }}
  />
);

/* ═══════════════════════════════════════════════════════════════
   SLIDE PANEL — enters from right, exits to right
   ═══════════════════════════════════════════════════════════════ */
export const SlidePanel = ({
  open,
  onClose,
  width = 560,
  children,
  zIndex = 910,
}) => {
  const panelRef = useRef(null);

  // ESC to close
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape" && open) onClose?.();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const resolvedWidth = typeof width === "number" ? `${width}px` : width;

  return createPortal(
    <>
      <Backdrop open={open} onClick={onClose} zIndex={zIndex - 1} />
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: resolvedWidth,
          maxWidth: "100vw",
          zIndex,
          background: "#ffffff",
          boxShadow: open
            ? "-20px 0 60px rgba(23,28,33,0.10)"
            : "none",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition:
            "transform 0.4s cubic-bezier(0.4,0,0.2,1), box-shadow 0.4s ease",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {children}
      </div>
    </>,
    document.body
  );
};

/* ═══════════════════════════════════════════════════════════════
   CENTERED MODAL — classic centered overlay (for gallery, etc.)
   ═══════════════════════════════════════════════════════════════ */
export const CenteredModal = ({
  open,
  onClose,
  maxWidth = 820,
  children,
  zIndex = 920,
}) => {
  const handleKey = useCallback(
    (e) => {
      if (e.key === "Escape" && open) onClose?.();
    },
    [open, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  return createPortal(
    <>
      <Backdrop open={open} onClick={onClose} zIndex={zIndex - 1} />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth,
            maxHeight: "90vh",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 32px 80px rgba(23,28,33,0.16)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            opacity: open ? 1 : 0,
            transform: open ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
            transition:
              "opacity 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};
