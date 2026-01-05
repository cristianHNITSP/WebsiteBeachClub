// src/components/NotchBar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Flex, Space, Tooltip, Grid } from "antd";
import {
  SearchOutlined,
  HomeOutlined,
  StarFilled,
  UserOutlined,
} from "@ant-design/icons";

import { beachColors, neutrals } from "../theme/beachTheme";

const items = [
  { key: "home", label: "Inicio", icon: <HomeOutlined /> },
  { key: "search", label: "Reservar", icon: <SearchOutlined /> },
  { key: "detail", label: "Detalle", icon: <StarFilled /> },
  { key: "account", label: "Cuenta", icon: <UserOutlined /> },
];

const TOKENS = {
  hostH: 68,

  // “notch” (zona accesible cuando está cerrado)
  notchW: 148,
  notchWMobile: 128,
  zoneH: 28,

  // bar real
  barH: 58,
  barHMobile: 54,
  revealY: 10,
  maxW: 620,
  sidePad: 24,
  sidePadMobile: 16,
  barPadX: 10,

  pillR: 999,
  pillH: 36,
  pillHMobile: 34,
  pillPadX: 12,
  gap: 10,
  gapMobile: 8,

  handleLineW: 54,
  handleLineH: 4,
};

const NotchBar = ({ view, setView }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // md+ = desktop
  const showLabel = !isMobile; // mobile: solo iconos

  const [open, setOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);

  const handleRef = useRef(null);
  const barRef = useRef(null);

  const C = useMemo(() => {
    const bg = neutrals?.bg;
    const ocean = beachColors?.oceanBlue;
    const turq = beachColors?.turquoise;
    const deep = beachColors?.deepBlue;
    const coral = beachColors?.coral;

    return {
      bg,
      ocean,
      turq,
      deep,
      coral,

      handleBg: "rgba(255, 255, 255, .78)",
      handleBorder: "rgba(148, 163, 184, .45)",
      handleShadow: "0 10px 26px rgba(15, 23, 42, .10)",

      barBg:
        "linear-gradient(180deg, rgba(255,255,255,.86) 0%, rgba(255,255,255,.74) 100%)",
      barBorder: "rgba(148, 163, 184, .52)",
      barShadow: "0 22px 50px rgba(15, 23, 42, .14)",

      pillText: "rgba(15, 23, 42, .72)",
      pillBorder: "rgba(226, 232, 240, .95)",
      pillBg: "rgba(255, 255, 255, .72)",

      pillHoverBorder: "rgba(14, 165, 233, .55)",
      pillHoverBg: "rgba(255, 255, 255, .92)",
      pillHoverShadow: "0 16px 30px rgba(15, 23, 42, .10)",

      pillActiveBg:
        "linear-gradient(135deg, rgba(14,165,233,.18) 0%, rgba(45,212,191,.14) 60%, rgba(255,255,255,.55) 100%)",
      pillActiveBorder: "rgba(14, 165, 233, .62)",
      pillActiveShadow: "0 18px 38px rgba(14, 165, 233, .14)",
      pillActiveText: deep,
    };
  }, []);

  const S = useMemo(() => {
    const ease = "cubic-bezier(.2,.8,.2,1)";
    const notchW = isMobile ? TOKENS.notchWMobile : TOKENS.notchW;
    const barH = isMobile ? TOKENS.barHMobile : TOKENS.barH;
    const sidePad = isMobile ? TOKENS.sidePadMobile : TOKENS.sidePad;

    return {
      host: {
        position: "fixed",
        left: 0,
        right: 0,
        top: 0,
        height: TOKENS.hostH,
        zIndex: 9999,
        pointerEvents: "none",
      },

      // Esta es LA ÚNICA zona accesible cuando está cerrado
      notchZone: {
        pointerEvents: "auto",
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 0,
        width: notchW,
        height: TOKENS.zoneH,
        cursor: "pointer",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
      },

      handle: (isOpen) => ({
        marginTop: 0,
        width: "100%",
        height: 22,
        borderRadius: TOKENS.pillR,
        background: C.handleBg,
        border: `1px solid ${C.handleBorder}`,
        boxShadow: C.handleShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isOpen ? 0.2 : 1,
        transition: `opacity .18s ${ease}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }),

      handleLine: {
        width: TOKENS.handleLineW,
        height: TOKENS.handleLineH,
        borderRadius: TOKENS.pillR,
        background: `linear-gradient(90deg, ${C.coral}, ${C.ocean})`,
        boxShadow: "0 10px 18px rgba(14,165,233,.18)",
      },

      // IMPORTANTE: cuando NO está abierto => pointerEvents NONE (no “toma” clicks fuera)
      barShell: (isOpen) => ({
        pointerEvents: isOpen ? "auto" : "none",
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 0,
        width: `min(${TOKENS.maxW}px, calc(100vw - ${sidePad}px))`,
        height: barH,
      }),

      bar: (isOpen) => ({
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: barH,
        borderRadius: TOKENS.pillR,
        background: C.barBg,
        border: `1px solid ${C.barBorder}`,
        boxShadow: C.barShadow,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        transform: isOpen
          ? `translateY(${TOKENS.revealY}px)`
          : `translateY(-${barH}px)`,
        transition: `transform .18s ${ease}`,
        willChange: "transform",
        display: "flex",
        alignItems: "center",
        paddingInline: TOKENS.barPadX,
      }),

      barGlow: {
        position: "absolute",
        inset: 0,
        borderRadius: TOKENS.pillR,
        pointerEvents: "none",
        background:
          "radial-gradient(circle at 18% 30%, rgba(14,165,233,.12), rgba(255,255,255,0) 55%)",
      },

      barTopLine: {
        position: "absolute",
        left: 14,
        right: 14,
        top: 7,
        height: 1,
        borderRadius: TOKENS.pillR,
        pointerEvents: "none",
        background: "rgba(255,255,255,.55)",
      },

      box: { width: "100%" },

      pillBase: {
        height: isMobile ? TOKENS.pillHMobile : TOKENS.pillH,
        borderRadius: TOKENS.pillR,
        paddingInline: TOKENS.pillPadX,
        border: `1px solid ${C.pillBorder}`,
        background: C.pillBg,
        color: C.pillText,
        fontWeight: 800,
        transition:
          "transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease, color .12s ease",
        display: "inline-flex",
        alignItems: "center",
      },

      pillHover: {
        transform: "translateY(-1px)",
        boxShadow: C.pillHoverShadow,
        borderColor: C.pillHoverBorder,
        background: C.pillHoverBg,
      },

      pillActive: {
        borderColor: C.pillActiveBorder,
        boxShadow: C.pillActiveShadow,
        background: C.pillActiveBg,
        color: C.pillActiveText,
      },

      pillPressed: {
        transform: "translateY(0px) scale(.99)",
      },

      label: {
        lineHeight: 1,
        fontSize: 13,
        letterSpacing: 0.1,
      },

      iconWrap: {
        display: "grid",
        placeItems: "center",
        width: 18,
      },
    };
  }, [C, isMobile]);

  // Mobile: cerrar al tocar fuera
  useEffect(() => {
    if (!open || !isMobile) return;

    const onDown = (e) => {
      const t = e.target;
      const inHandle = handleRef.current?.contains(t);
      const inBar = barRef.current?.contains(t);
      if (!inHandle && !inBar) setOpen(false);
    };

    window.addEventListener("pointerdown", onDown, { capture: true });
    return () => window.removeEventListener("pointerdown", onDown, { capture: true });
  }, [open, isMobile]);

  const openDesktop = () => {
    if (isMobile) return;
    setOpen(true);
  };

  const closeDesktop = () => {
    if (isMobile) return;
    setOpen(false);
    setHoverKey(null);
    setPressedKey(null);
  };

  const toggleMobile = () => {
    if (!isMobile) return;
    setOpen((v) => !v);
  };

  return (
    <div style={S.host} aria-label="Top reveal navigation">
      {/*SOLO notch clickable cuando está cerrado */}
      <div
        ref={handleRef}
        style={S.notchZone}
        onMouseEnter={openDesktop}
        onClick={toggleMobile}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <div style={S.handle(open)}>
          <div style={S.handleLine} />
        </div>
      </div>

      {/*Bar solo “existe” para eventos cuando open = true */}
      <div
        ref={barRef}
        style={S.barShell(open)}
        onMouseLeave={closeDesktop}
        onMouseEnter={openDesktop}
      >
        <div style={S.bar(open)}>
          <div style={S.barGlow} />
          <div style={S.barTopLine} />

          <Flex
            style={S.box}
            justify="center"
            align="center"
            gap={isMobile ? TOKENS.gapMobile : TOKENS.gap}
          >
            {items.map((it) => {
              const isActive = view === it.key;
              const isHover = hoverKey === it.key;
              const isPressed = pressedKey === it.key;

              const style = {
                ...S.pillBase,
                ...(isHover ? S.pillHover : null),
                ...(isActive ? S.pillActive : null),
                ...(isPressed ? S.pillPressed : null),
              };

              const content = (
                <Space size={8} align="center">
                  <span style={S.iconWrap}>{it.icon}</span>
                  {showLabel ? <span style={S.label}>{it.label}</span> : null}
                </Space>
              );

              return (
                <Tooltip key={it.key} title={it.label} placement="bottom">
                  <Button
                    type="text"
                    onClick={() => {
                      setView(it.key);
                      if (isMobile) setOpen(false);
                    }}
                    onMouseEnter={() => setHoverKey(it.key)}
                    onMouseLeave={() => setHoverKey(null)}
                    onMouseDown={() => setPressedKey(it.key)}
                    onMouseUp={() => setPressedKey(null)}
                    style={style}
                  >
                    {content}
                  </Button>
                </Tooltip>
              );
            })}
          </Flex>
        </div>
      </div>
    </div>
  );
};

export default NotchBar;
