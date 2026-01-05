// src/components/NotchBar.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Flex, Space, Tooltip, Grid, theme } from "antd";
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
  // Si tu Navbar mide ~58, esto hace que “encaje” mejor visualmente
  hostH: 60,

  // notch accesible cuando está cerrado (sube un poco y se siente “ranura”)
  notchW: 176,
  notchWMobile: 148,
  zoneH: 44,

  // bar real
  barH: 58,
  barHMobile: 56,

  // cuánto baja cuando se revela (más “natural” que 10)
  revealY: 8,

  maxW: 640,
  sidePad: 24,
  sidePadMobile: 14,
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
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const showLabel = !isMobile;

  const [open, setOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);

  const handleRef = useRef(null);
  const barRef = useRef(null);

  const C = useMemo(() => {
    const ocean = beachColors?.oceanBlue;
    const turq = beachColors?.turquoise;
    const deep = beachColors?.deepBlue;
    const coral = beachColors?.coral;

    const isDarkish = true; // tu UI usa mucho gradient arriba, esto queda bien

    return {
      ocean,
      turq,
      deep,
      coral,

      // “Dock/ranura” del notch (lo que lo hace verse integrado)
      slotBg: isDarkish
        ? "linear-gradient(180deg, rgba(255,255,255,.14) 0%, rgba(255,255,255,.06) 100%)"
        : token.colorBgContainer,
      slotBorder: isDarkish ? "rgba(255,255,255,.20)" : token.colorBorderSecondary,
      slotInset: isDarkish
        ? "inset 0 1px 0 rgba(255,255,255,.22), inset 0 -10px 20px rgba(0,0,0,.08)"
        : "inset 0 1px 0 rgba(255,255,255,.65)",

      handleBg: isDarkish
        ? "linear-gradient(180deg, rgba(255,255,255,.20) 0%, rgba(255,255,255,.10) 100%)"
        : "rgba(255,255,255,.90)",
      handleBorder: isDarkish ? "rgba(255,255,255,.24)" : token.colorBorderSecondary,
      handleShadow: isDarkish
        ? "0 16px 38px rgba(15, 23, 42, .22)"
        : "0 14px 34px rgba(15,23,42,.12)",

      barBg: isDarkish
        ? "linear-gradient(180deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,.12) 100%)"
        : "linear-gradient(180deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.86) 100%)",
      barBorder: isDarkish ? "rgba(255,255,255,.22)" : token.colorBorderSecondary,
      barShadow: isDarkish
        ? "0 26px 70px rgba(15, 23, 42, .26)"
        : "0 22px 55px rgba(15, 23, 42, .14)",
      barInset:
        "inset 0 1px 0 rgba(255,255,255,.24), inset 0 -18px 30px rgba(0,0,0,.06)",

      pillText: isDarkish ? "rgba(255,255,255,.88)" : "rgba(15, 23, 42, .72)",
      pillBorder: isDarkish ? "rgba(255,255,255,.18)" : "rgba(226, 232, 240, .95)",
      pillBg: isDarkish ? "rgba(255,255,255,.10)" : "rgba(255, 255, 255, .72)",

      pillHoverBorder: isDarkish ? "rgba(45,212,191,.40)" : "rgba(14, 165, 233, .55)",
      pillHoverBg: isDarkish ? "rgba(255,255,255,.16)" : "rgba(255, 255, 255, .92)",
      pillHoverShadow: isDarkish
        ? "0 18px 40px rgba(15, 23, 42, .18)"
        : "0 16px 30px rgba(15, 23, 42, .10)",

      pillActiveBg: isDarkish
        ? "linear-gradient(135deg, rgba(45,212,191,.18) 0%, rgba(14,165,233,.18) 55%, rgba(255,255,255,.12) 100%)"
        : "linear-gradient(135deg, rgba(14,165,233,.18) 0%, rgba(45,212,191,.14) 60%, rgba(255,255,255,.55) 100%)",
      pillActiveBorder: isDarkish ? "rgba(45,212,191,.48)" : "rgba(14, 165, 233, .62)",
      pillActiveShadow: isDarkish
        ? "0 20px 46px rgba(45,212,191,.16)"
        : "0 18px 38px rgba(14, 165, 233, .14)",
      pillActiveText: isDarkish ? "rgba(255,255,255,.96)" : deep,
    };
  }, [token]);

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

      notchZone: {
        pointerEvents: "auto",
        position: "absolute",
        left: "50%",
        transform: "translateX(-50%)",
        top: 6,
        width: notchW,
        height: TOKENS.zoneH,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },

      // ranura visual para que parezca “parte del navbar”
      slot: {
        position: "absolute",
        inset: 0,
        borderRadius: TOKENS.pillR,
        background: C.slotBg,
        border: `1px solid ${C.slotBorder}`,
        boxShadow: C.slotInset,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      },

      handle: (isOpen) => ({
        position: "relative",
        width: "calc(100% - 8px)",
        height: isMobile ? 34 : 36,
        borderRadius: TOKENS.pillR,
        background: C.handleBg,
        border: `1px solid ${C.handleBorder}`,
        boxShadow: C.handleShadow,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: isOpen ? 0.35 : 1,
        transform: isOpen ? "scale(.98)" : "scale(1)",
        transition: `opacity .18s ${ease}, transform .18s ${ease}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }),

      // highlight superior (quita “plano” instant)
      handleHighlight: {
        position: "absolute",
        left: 10,
        right: 10,
        top: 6,
        height: 1,
        borderRadius: 999,
        background: "rgba(255,255,255,.30)",
        pointerEvents: "none",
      },

      handleLine: {
        width: TOKENS.handleLineW,
        height: TOKENS.handleLineH,
        borderRadius: TOKENS.pillR,
        background: `linear-gradient(90deg, ${C.coral}, ${C.ocean})`,
        boxShadow: "0 12px 22px rgba(14,165,233,.22)",
      },

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
        boxShadow: `${C.barShadow}, ${C.barInset}`,
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        transform: isOpen ? `translateY(${TOKENS.revealY}px)` : `translateY(-${barH + 10}px)`,
        transition: `transform .20s ${ease}`,
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
          "radial-gradient(circle at 18% 30%, rgba(45,212,191,.14), rgba(255,255,255,0) 52%), radial-gradient(circle at 82% 40%, rgba(14,165,233,.12), rgba(255,255,255,0) 55%)",
      },

      barTopLine: {
        position: "absolute",
        left: 16,
        right: 16,
        top: 8,
        height: 1,
        borderRadius: TOKENS.pillR,
        pointerEvents: "none",
        background: "rgba(255,255,255,.22)",
      },

      box: { width: "100%" },

      pillBase: {
        height: isMobile ? TOKENS.pillHMobile : TOKENS.pillH,
        borderRadius: TOKENS.pillR,
        paddingInline: TOKENS.pillPadX,
        border: `1px solid ${C.pillBorder}`,
        background: C.pillBg,
        color: C.pillText,
        fontWeight: 900,
        letterSpacing: 0.1,
        transition:
          "transform .12s ease, box-shadow .12s ease, border-color .12s ease, background .12s ease, color .12s ease",
        display: "inline-flex",
        alignItems: "center",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      },

      pillHover: {
        transform: "translateY(-1px)",
        boxShadow: C.pillHoverShadow,
        borderColor: C.pillHoverBorder,
        background: C.pillHoverBg,
      },

      // AQUÍ ESTABA LO “PLANO”: ahora sí aplica fondo activo
      pillActive: {
        background: C.pillActiveBg,
        borderColor: C.pillActiveBorder,
        boxShadow: C.pillActiveShadow,
        color: C.pillActiveText,
      },

      pillPressed: {
        transform: "translateY(0px) scale(.99)",
      },

      label: {
        lineHeight: 1,
        fontSize: 13,
      },

      iconWrap: {
        display: "grid",
        placeItems: "center",
        width: 18,
      },
    };
  }, [C, isMobile]);

  useEffect(() => {
    if (!open || !isMobile) return;

    const onDown = (e) => {
      const t = e.target;
      const inHandle = handleRef.current?.contains(t);
      const inBar = barRef.current?.contains(t);
      if (!inHandle && !inBar) setOpen(false);
    };

    window.addEventListener("pointerdown", onDown, { capture: true });
    return () =>
      window.removeEventListener("pointerdown", onDown, { capture: true });
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
      <div
        ref={handleRef}
        style={S.notchZone}
        onMouseEnter={openDesktop}
        onClick={toggleMobile}
        role="button"
        tabIndex={0}
        aria-expanded={open}
      >
        <div style={S.slot} aria-hidden />
        <div style={S.handle(open)}>
          <div style={S.handleHighlight} aria-hidden />
          <div style={S.handleLine} />
        </div>
      </div>

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
