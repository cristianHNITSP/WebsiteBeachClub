import { useMediaQuery } from "react-responsive";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initSocket, disconnectSocket } from "@api/websockets";

import {
  ConfigProvider,
  Button,
  Card,
  Flex,
  Input,
  Space,
  Splitter,
  Typography,
  Tree,
  Select,
  message,
  FloatButton,
  DatePicker,
  Drawer,
  Tag,
  Empty,
  Spin,
  Tooltip,
} from "antd";

import {
  SearchOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  GiftOutlined,
  CompassOutlined,
  FilterOutlined,
  MenuOutlined,
  CommentOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import RoomCards from "./components/website/RoomCards.jsx";
import Recommendcards from "./components/website/RecommendCards.jsx";
import BuscadorMovil from "./components/website/BuscadorMovil.jsx";
import ChatSoporte from "./components/website/ChatSoporte.jsx";
import HeroCarousel from "./components/website/HeroCarousel.jsx";
import { beachColors } from "./theme/beachTheme";

const { Title, Text } = Typography;
const { Option } = Select;

const backgroundColor = "#f8fafc";
const borderColor = "#e2e8f0";

const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || "http://localhost:4002";

/** ================= helpers ================= */
const toArrayCheckedKeys = (checkedKeys) => {
  if (Array.isArray(checkedKeys)) return checkedKeys;
  if (checkedKeys && Array.isArray(checkedKeys.checked)) return checkedKeys.checked;
  return [];
};

const normalizeStr = (s) => String(s || "").trim().toLowerCase();
const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

const roomMatchesFilters = (room, filters) => {
  const q = normalizeStr(filters.q);
  const roomTypes = Array.isArray(filters.roomTypes) ? filters.roomTypes : [];
  const amenities = Array.isArray(filters.amenities) ? filters.amenities : [];
  const locations = Array.isArray(filters.locations) ? filters.locations : [];

  if (q) {
    const haystack = [
      room?.codigo,
      room?.title,
      room?.roomType,
      room?.location,
      room?.hotelCode,
      room?.roomNumber,
    ]
      .map((x) => normalizeStr(x))
      .join(" | ");
    if (!haystack.includes(q)) return false;
  }

  if (roomTypes.length) {
    const rt = normalizeStr(room?.roomType);
    const ok = roomTypes.some((t) => normalizeStr(t) === rt);
    if (!ok) return false;
  }

  if (amenities.length) {
    const have = new Set((room?.amenities || []).map((a) => normalizeStr(a)));
    const ok = amenities.every((a) => have.has(normalizeStr(a)));
    if (!ok) return false;
  }

  if (locations.length) {
    const loc = normalizeStr(room?.location);
    const ok = locations.some((x) => loc.includes(normalizeStr(x)));
    if (!ok) return false;
  }

  const hasDates = isYmd(filters.startDate) && isYmd(filters.endDate);
  if (hasDates && filters.onlyAvailable === true) {
    if (room?.available !== true) return false;
  }

  return true;
};

function App({ currentUser }) {
  const [openBuscadorMovil, setOpenBuscadorMovil] = useState(false);
  const [openFiltrosMovil, setOpenFiltrosMovil] = useState(false);
  const [openChat, setOpenChat] = useState(false);

  const isMobile = useMediaQuery({ maxWidth: 1024 });
  const [messageApi, contextHolder] = message.useMessage();

  /** ================= socket ================= */
  const socketRef = useRef(null);

  /** ================= data ================= */
  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(true);
  const [error, setError] = useState(null);

  /** ================= filtros (FUENTE de verdad) ================= */
  const [filters, setFilters] = useState({
    q: "",
    roomTypes: [],
    amenities: [],
    locations: [],
    startDate: null, // "YYYY-MM-DD"
    endDate: null, // "YYYY-MM-DD"
    guests: "2",
    onlyAvailable: true,
  });

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const [checkedKeys, setCheckedKeys] = useState([]);

  /** ================= header controls ================= */
  const [searchText, setSearchText] = useState("");
  const [dates, setDates] = useState(null); // ✅ null = sin rango
  const [guests, setGuests] = useState("2");

  /** ================= paginado local ================= */
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  /** ================= selection ================= */
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);

  /** ================= TREE dinámico (sale de habitaciones) ================= */
  const treeData = useMemo(() => {
    const rooms = Array.isArray(habitaciones) ? habitaciones : [];

    const uniq = (arr) =>
      [...new Set(arr.filter(Boolean).map((x) => String(x).trim()).filter(Boolean))].sort();

    const roomTypes = uniq(rooms.map((r) => r?.roomType));
    const amenities = uniq(
      rooms.flatMap((r) => (Array.isArray(r?.amenities) ? r.amenities : []))
    );
    const locations = uniq(rooms.map((r) => r?.location));

    return [
      {
        title: (
          <Flex align="center" gap={8}>
            <HomeOutlined style={{ color: beachColors.turquoise }} />
            <b>Tipo de alojamiento</b>
          </Flex>
        ),
        key: "group:type",
        children: roomTypes.length
          ? roomTypes.map((t) => ({ title: t, key: `t:${t}` }))
          : [{ title: <Text type="secondary">Sin datos</Text>, key: "t:__empty", disabled: true }],
      },
      {
        title: (
          <Flex align="center" gap={8}>
            <GiftOutlined style={{ color: beachColors.coral }} />
            <b>Servicios</b>
          </Flex>
        ),
        key: "group:amenities",
        children: amenities.length
          ? amenities.map((a) => ({ title: a, key: `a:${a}` }))
          : [{ title: <Text type="secondary">Sin datos</Text>, key: "a:__empty", disabled: true }],
      },
      {
        title: (
          <Flex align="center" gap={8}>
            <CompassOutlined style={{ color: beachColors.sunset }} />
            <b>Ubicación</b>
          </Flex>
        ),
        key: "group:location",
        children: locations.length
          ? locations.map((l) => ({ title: l, key: `l:${l}` }))
          : [{ title: <Text type="secondary">Sin datos</Text>, key: "l:__empty", disabled: true }],
      },
    ];
  }, [habitaciones]);

  /** ================= emitir query por WS ================= */
  const emitQuery = useCallback(
    (opts = {}) => {
      const socket = socketRef.current;
      if (!socket) return;

      const f = filtersRef.current;
      const hasDates = isYmd(f.startDate) && isYmd(f.endDate);

      const payload = {
        q: f.q || "",
        roomType: (f.roomTypes || []).join(","),
        amenities: (f.amenities || []).join(","),
        locationTag: (f.locations || []).join(","),
        startDate: hasDates ? f.startDate : null,
        endDate: hasDates ? f.endDate : null,
        guests: f.guests || "2",
        onlyAvailable: hasDates ? !!f.onlyAvailable : false,
      };

      if (opts.showToast) {
        messageApi.open({
          type: "loading",
          content: "Aplicando filtros…",
          key: "roomsSync",
          duration: 0,
        });
      }

      setLoadingHabitaciones(true);
      setError(null);

      socket.emit("habitaciones:query", payload);
    },
    [messageApi]
  );

  /** ================= conectar socket UNA sola vez ================= */
  useEffect(() => {
    const socket = initSocket(WS_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("✅ WS conectado:", socket.id);
      emitQuery({ showToast: false }); // ✅ carga inicial desde WS (no axios)
    });

    socket.on("disconnect", () => {
      console.log("🔌 WS desconectado");
    });

    const handleResult = (data) => {
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setHabitaciones(items);
      setLoadingHabitaciones(false);

      messageApi.open({
        type: "success",
        content: `Listo ✅ ${items.length} habitaciones sincronizadas`,
        key: "roomsSync",
        duration: 2,
      });
    };

    socket.on("habitaciones:init", handleResult);
    socket.on("habitaciones:result", handleResult);

    socket.on("habitaciones:created", (room) => {
      if (!room || !room._id) return;
      const f = filtersRef.current;
      if (!roomMatchesFilters(room, f)) return;

      setHabitaciones((prev) => {
        const exists = prev.some((h) => h._id === room._id);
        if (exists) return prev;
        return [room, ...prev];
      });
    });

    socket.on("habitaciones:updated", (room) => {
      if (!room || !room._id) return;
      const f = filtersRef.current;

      setHabitaciones((prev) => {
        const exists = prev.some((h) => h._id === room._id);

        if (exists && !roomMatchesFilters(room, f)) {
          return prev.filter((h) => h._id !== room._id);
        }
        if (!exists && roomMatchesFilters(room, f)) {
          return [room, ...prev];
        }
        return prev.map((h) => (h._id === room._id ? { ...h, ...room } : h));
      });
    });

    socket.on("habitaciones:deleted", (payload) => {
      const deleteId = payload?._id || payload?.id;
      if (!deleteId) return;
      setHabitaciones((prev) => prev.filter((h) => h._id !== deleteId));
    });

    socket.on("habitaciones:error", (payload) => {
      console.error("WS habitaciones:error", payload);
      setError(payload || { message: "Ocurrió un error en tiempo real." });
      setLoadingHabitaciones(false);
      messageApi.open({
        type: "error",
        content: payload?.message || "Ocurrió un error en tiempo real.",
        key: "roomsSync",
        duration: 3,
      });
    });

    return () => {
      try {
        disconnectSocket();
      } finally {
        socketRef.current = null;
      }
    };
  }, [emitQuery, messageApi]);

  /** ================= debounce: cuando cambien filtros => re-query WS ================= */
  useEffect(() => {
    const t = setTimeout(() => {
      emitQuery({ showToast: false });
    }, 250);
    return () => clearTimeout(t);
  }, [filters, emitQuery]);

  /** ================= aplicar filtros desde Tree (keys dinámicos) ================= */
  const applyTreeCheckedKeys = (keys) => {
    const arr = toArrayCheckedKeys(keys).filter((k) => !String(k).endsWith("__empty"));
    setCheckedKeys(arr);

    const roomTypes = arr
      .filter((k) => String(k).startsWith("t:"))
      .map((k) => String(k).slice(2))
      .filter(Boolean);

    const amenities = arr
      .filter((k) => String(k).startsWith("a:"))
      .map((k) => String(k).slice(2))
      .filter(Boolean);

    const locations = arr
      .filter((k) => String(k).startsWith("l:"))
      .map((k) => String(k).slice(2))
      .filter(Boolean);

    setPagination((p) => ({ ...p, page: 1 }));
    setFilters((prev) => ({ ...prev, roomTypes, amenities, locations }));
  };

  /** ✅ limpiar DE VERDAD (tree + header + filtros) */
  const clearFilters = () => {
    setCheckedKeys([]);
    setSearchText("");
    setDates(null);
    setGuests("2");

    setPagination((p) => ({ ...p, page: 1 }));

    setFilters({
      q: "",
      roomTypes: [],
      amenities: [],
      locations: [],
      startDate: null,
      endDate: null,
      guests: "2",
      onlyAvailable: true,
    });

    messageApi.success("Filtros limpiados.");
  };

  /** ================= buscar (desktop / móvil) ================= */
  const runSearch = (payload) => {
    const q = String(payload?.q ?? "").trim();
    const startDate = payload?.startDate || null;
    const endDate = payload?.endDate || null;
    const g = String(payload?.guests || "2");

    // ✅ sincroniza también el header (para que no “se quede pegado” visualmente)
    setSearchText(q);
    setGuests(g);

    const hasRange = isYmd(startDate) && isYmd(endDate);
    setDates(
      hasRange ? [dayjs(startDate, "YYYY-MM-DD"), dayjs(endDate, "YYYY-MM-DD")] : null
    );

    setPagination((p) => ({ ...p, page: 1 }));

    setFilters((prev) => ({
      ...prev,
      q,
      startDate: isYmd(startDate) ? startDate : null,
      endDate: isYmd(endDate) ? endDate : null,
      guests: g,
      onlyAvailable: true,
    }));

    messageApi.open({
      type: "success",
      icon: <CheckCircleOutlined />,
      content: "Búsqueda aplicada ✅",
      duration: 1.6,
    });
  };

  const handleSearchClick = () => {
    runSearch({
      q: searchText,
      startDate: dates?.[0]?.format("YYYY-MM-DD") || null,
      endDate: dates?.[1]?.format("YYYY-MM-DD") || null,
      guests,
    });
  };

  /** ================= cards filtradas + paginado local ================= */
  const filteredCards = useMemo(() => {
    const arr = Array.isArray(habitaciones) ? habitaciones : [];
    return arr.filter((r) => roomMatchesFilters(r, filters));
  }, [habitaciones, filters]);

  useEffect(() => {
    const total = filteredCards.length;
    const limit = pagination.limit || 6;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    setPagination((p) => ({
      ...p,
      page: Math.min(p.page, totalPages),
      total,
      totalPages,
      hasMore: p.page < totalPages,
    }));
  }, [filteredCards, pagination.limit]);

  const cardsToShow = useMemo(() => {
    const { page, limit } = pagination;
    const start = (page - 1) * (limit || 6);
    const end = start + (limit || 6);
    return filteredCards.slice(start, end);
  }, [filteredCards, pagination]);

  const handleChangePageHabitaciones = (page) => {
    setPagination((p) => ({ ...p, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ================= reserva/chat ================= */
  const handleReservaExpress = async (room) => {
    setHabitacionSeleccionada(room);
    setOpenChat(true);
    messageApi.info("Listo ✅ Abriendo chat para solicitar tu reserva.");
  };

  const handleInfoWhatsapp = (room) => {
    setHabitacionSeleccionada(room);

    const numero = "9993676541";
    const texto = `Hola, me interesa la habitación ${room.codigo || ""} - ${room.title || ""} en ${
      room.location || "su propiedad"
    }. ¿Podrían darme más información?`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleChatClosedForReserva = async () => {
    setHabitacionSeleccionada(null);
    setOpenChat(false);
  };

  /** ================= styles ================= */
  const headerStyle = {
    padding: "10px 16px",
    background: `linear-gradient(120deg, ${beachColors.teal}, ${beachColors.oceanBlue})`,
    boxShadow: "0 4px 18px rgba(15,23,42,0.26)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    borderBottom: `2px solid ${beachColors.turquoise}`,
  };

  const panelStyles = {
    left: { background: "#f1f5f9", borderRight: `1px solid ${borderColor}` },
    center: { background: "#ffffff", padding: 16 },
    right: { background: "#f8fafc", borderLeft: `1px solid ${borderColor}`, padding: 12 },
  };

  const hasDateFilter = isYmd(filters.startDate) && isYmd(filters.endDate);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: beachColors.oceanBlue,
          colorLink: beachColors.oceanBlue,
          borderRadius: 10,
          fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
        },
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${backgroundColor}, ${beachColors.sand}18 40%, ${beachColors.turquoise}0A)`,
        }}
      >
        {contextHolder}

        {/* HEADER */}
        <header style={headerStyle}>
          <Flex justify="space-between" align="center" gap={16} style={{ maxWidth: 1400, margin: "0 auto" }}>
            <Flex align="center" gap={10}>
              <img
                src="/beachclub.svg"
                alt="logo"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  boxShadow: "0 2px 6px rgba(15,23,42,0.35)",
                }}
              />
              <div style={{ lineHeight: 1.1 }}>
                <Title level={4} style={{ margin: 0, color: "#ffffff", fontWeight: 700, letterSpacing: 0.3 }}>
                  Hoteles Frida
                </Title>
                <Text style={{ fontSize: 10, color: "rgba(241,245,249,0.9)" }}>
                  Reservas directas con un solo clic
                </Text>
              </div>
            </Flex>

            {!isMobile && (
              <Flex
                align="center"
                gap={10}
                style={{
                  flex: 1,
                  justifyContent: "center",
                  minWidth: 560,
                  padding: "10px 14px",
                  borderRadius: 18,
                  background: "rgba(15,23,42,0.18)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.35)",
                }}
              >
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onPressEnter={handleSearchClick}
                  allowClear
                  placeholder="Destino, ciudad o alojamiento"
                  prefix={<EnvironmentOutlined style={{ color: beachColors.turquoise }} />}
                  style={{
                    flex: 1,
                    borderRadius: 10,
                    border: "none",
                    height: 40,
                    background: "rgba(255,255,255,0.98)",
                  }}
                />

                <DatePicker.RangePicker
                  value={dates}
                  onChange={(v) => setDates(v)}
                  style={{ width: 250, borderRadius: 10, height: 40 }}
                  format="DD/MM/YYYY"
                  allowClear
                />

                <Select value={guests} onChange={setGuests} style={{ width: 150, borderRadius: 10, height: 40 }}>
                  <Option value="1">1 adulto</Option>
                  <Option value="2">2 adultos</Option>
                  <Option value="3">3 adultos</Option>
                  <Option value="4">Familia</Option>
                </Select>

                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearchClick}
                  style={{
                    borderRadius: 12,
                    fontWeight: 600,
                    paddingInline: 18,
                    height: 40,
                    background: `linear-gradient(90deg, ${beachColors.turquoise}, ${beachColors.oceanBlue})`,
                    boxShadow: "0 6px 16px rgba(14,165,233,0.45)",
                    border: "none",
                  }}
                >
                  Buscar
                </Button>

                <Button
                  icon={<ReloadOutlined />}
                  onClick={clearFilters}
                  style={{ borderRadius: 12, height: 40 }}
                >
                  Limpiar
                </Button>
              </Flex>
            )}

            {!isMobile && (
              <Space size={10}>
                <Button
                  type="text"
                  icon={<CustomerServiceOutlined />}
                  style={{ color: "#e5e7eb", fontSize: 12 }}
                  onClick={() => setOpenChat(true)}
                >
                  Ayuda
                </Button>
                <Button
                  ghost
                  href="/hotelesfrida.app/panel.web/login.panel.web"
                  style={{
                    borderRadius: 999,
                    borderColor: "#ffffff",
                    color: "#ffffff",
                    fontSize: 12,
                    paddingInline: 16,
                  }}
                >
                  Acceso staff
                </Button>
              </Space>
            )}

            {isMobile && (
              <Space size={8} align="center">
                <Button type="text" icon={<SearchOutlined style={{ color: "#ffffff" }} />} onClick={() => setOpenBuscadorMovil(true)} />
                <Button type="text" icon={<MenuOutlined style={{ color: "#ffffff" }} />} onClick={() => setOpenFiltrosMovil(true)} />
                <Button
                  size="small"
                  href="/panel.web/login.panel.web"
                  style={{
                    borderRadius: 999,
                    paddingInline: 12,
                    height: 30,
                    fontSize: 11,
                    background: "rgba(15,23,42,0.65)",
                    color: "#ffffff",
                    border: "1px solid rgba(248,250,252,0.45)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Staff
                </Button>
              </Space>
            )}
          </Flex>
        </header>

        {/* MAIN */}
        <main style={{ minHeight: "calc(100vh - 160px)" }}>
          <BuscadorMovil
            beachColors={beachColors}
            open={openBuscadorMovil}
            onclose={() => setOpenBuscadorMovil(false)}
            initialQuery={filters.q}
            initialDates={{
              startDate: filters.startDate ? dayjs(filters.startDate, "YYYY-MM-DD") : null,
              endDate: filters.endDate ? dayjs(filters.endDate, "YYYY-MM-DD") : null,
            }}
            initialGuests={filters.guests}
            onClear={() => {
              clearFilters();
              setOpenBuscadorMovil(false);
            }}
            onSearch={(payload) => {
              runSearch(payload);
              setOpenBuscadorMovil(false);
            }}
          />

          {/* Drawer filtros mobile */}
          <Drawer
            title="Filtrar tu estancia"
            placement="right"
            width={310}
            open={openFiltrosMovil}
            onClose={() => setOpenFiltrosMovil(false)}
          >
            <Flex vertical gap={14}>
              <Tree
                checkable
                defaultExpandAll
                treeData={treeData}
                checkedKeys={checkedKeys}
                onCheck={(keys) => applyTreeCheckedKeys(keys)}
              />

              <Card size="small" style={{ borderRadius: 12 }}>
                <Flex vertical gap={8}>
                  <Flex align="center" gap={8}>
                    <CalendarOutlined style={{ color: beachColors.oceanBlue }} />
                    <Text strong>Disponibilidad</Text>
                  </Flex>

                  <Text style={{ fontSize: 11, color: "#64748b" }}>
                    Este filtro funciona cuando el backend WS envía <b>available</b> según fechas.
                  </Text>

                  <Flex wrap gap={6}>
                    <Tag color={hasDateFilter ? "green" : "default"}>
                      {hasDateFilter ? `${filters.startDate} → ${filters.endDate}` : "Sin rango"}
                    </Tag>
                    <Tag color="blue">{filters.guests} huésped(es)</Tag>
                    {hasDateFilter && filters.onlyAvailable ? <Tag color="green">Solo disponibles</Tag> : null}
                  </Flex>
                </Flex>
              </Card>

              <Flex gap={8}>
                <Button block onClick={clearFilters} style={{ borderRadius: 10 }}>
                  Limpiar
                </Button>
                <Button
                  type="primary"
                  block
                  icon={<FilterOutlined />}
                  style={{ borderRadius: 10, background: beachColors.teal, borderColor: beachColors.teal }}
                  onClick={() => {
                    emitQuery({ showToast: true });
                    setOpenFiltrosMovil(false);
                  }}
                >
                  Aplicar
                </Button>
              </Flex>

              <div style={{ marginTop: 4 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tip: al marcar filtros, se actualiza automáticamente.
                </Text>
              </div>
            </Flex>
          </Drawer>

          {isMobile && (
            <FloatButton.Group shape="circle" style={{ right: 18, bottom: 90 }} icon={<CommentOutlined />}>
              <FloatButton icon={<CustomerServiceOutlined />} onClick={() => setOpenChat(true)} />
            </FloatButton.Group>
          )}

          <Splitter
            layout={isMobile ? "vertical" : "horizontal"}
            style={{ height: isMobile ? "auto" : "calc(100vh - 160px)", border: "none" }}
          >
            {!isMobile && (
              <Splitter.Panel defaultSize="20%" min="18%" max="24%" style={panelStyles.left}>
                <Flex vertical style={{ padding: 14, gap: 14 }}>
                  <Flex align="center" gap={8}>
                    <FilterOutlined style={{ color: beachColors.deepBlue }} />
                    <Title level={4} style={{ margin: 0, color: beachColors.deepBlue, fontSize: 16 }}>
                      Filtros
                    </Title>
                  </Flex>

                  <Tree
                    checkable
                    defaultExpandAll
                    treeData={treeData}
                    checkedKeys={checkedKeys}
                    onCheck={(keys) => applyTreeCheckedKeys(keys)}
                    style={{ fontSize: 12 }}
                  />

                  <Card size="small" style={{ borderRadius: 12 }}>
                    <Flex vertical gap={8}>
                      <Flex align="center" gap={8}>
                        <CalendarOutlined style={{ color: beachColors.oceanBlue }} />
                        <Text strong>Disponibilidad (fechas)</Text>
                      </Flex>
                      <Text style={{ fontSize: 11, color: "#64748b" }}>
                        Se usa cuando el WS te manda <b>available</b> según el rango.
                      </Text>
                      <Flex wrap gap={6}>
                        <Tag color={hasDateFilter ? "green" : "default"}>
                          {hasDateFilter ? `${filters.startDate} → ${filters.endDate}` : "Sin rango"}
                        </Tag>
                        <Tag color="blue">{filters.guests} huésped(es)</Tag>
                        {hasDateFilter && filters.onlyAvailable ? <Tag color="green">Solo disponibles</Tag> : null}
                      </Flex>
                    </Flex>
                  </Card>

                  <Flex gap={8}>
                    <Button onClick={clearFilters} style={{ borderRadius: 10 }}>
                      Limpiar
                    </Button>
                    <Button
                      type="primary"
                      icon={<FilterOutlined />}
                      style={{ borderRadius: 10, background: beachColors.teal, borderColor: beachColors.teal }}
                      onClick={() => emitQuery({ showToast: true })}
                      loading={loadingHabitaciones}
                    >
                      Aplicar
                    </Button>
                  </Flex>

                  <Card size="small" style={{ borderRadius: 12, background: "#ffffff" }}>
                    <Flex vertical gap={6}>
                      <Text strong style={{ fontSize: 12 }}>
                        Activos:
                      </Text>
                      <Flex wrap gap={6}>
                        {filters.q ? <Tag color={beachColors.turquoise}>Buscar: {filters.q}</Tag> : null}
                        {filters.roomTypes.map((t) => (
                          <Tag key={t} color={beachColors.sand} style={{ color: beachColors.deepBlue }}>
                            {t}
                          </Tag>
                        ))}
                        {filters.amenities.map((a) => (
                          <Tag key={a} color={beachColors.coral}>
                            {a}
                          </Tag>
                        ))}
                        {filters.locations.map((l) => (
                          <Tag key={l} color={beachColors.turquoise} style={{ color: "#064e3b" }}>
                            {l}
                          </Tag>
                        ))}
                        {hasDateFilter ? (
                          <Tag color="green">
                            {filters.startDate} → {filters.endDate}
                          </Tag>
                        ) : null}

                        {!filters.q &&
                        !filters.roomTypes.length &&
                        !filters.amenities.length &&
                        !filters.locations.length &&
                        !hasDateFilter ? (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Sin filtros
                          </Text>
                        ) : null}
                      </Flex>
                    </Flex>
                  </Card>
                </Flex>
              </Splitter.Panel>
            )}

            <Splitter.Panel defaultSize={isMobile ? "100%" : "55%"} min={isMobile ? "100%" : "50%"} style={panelStyles.center}>
              <Flex vertical gap={18} style={{ maxWidth: 900, margin: "0 auto" }}>
                <HeroCarousel currentUser={currentUser} />

                <Flex justify="space-between" align="center" wrap gap={8} style={{ marginTop: 4 }}>
                  <Flex gap={10} align="center">
                    <Title level={4} style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 600 }}>
                      Alojamientos disponibles
                    </Title>

                    <Tooltip title="Resultados después de aplicar filtros">
                      <Tag color={filteredCards.length ? "blue" : "default"} style={{ borderRadius: 999 }}>
                        {filteredCards.length} resultado(s)
                      </Tag>
                    </Tooltip>

                    {hasDateFilter && (
                      <Tag color={filters.onlyAvailable ? "green" : "default"} style={{ borderRadius: 999 }}>
                        {filters.onlyAvailable ? "Solo disponibles" : "Incluye ocupadas"}
                      </Tag>
                    )}
                  </Flex>

                  <Space size={6} align="center">
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => emitQuery({ showToast: true })}
                      style={{ borderRadius: 999, fontSize: 10 }}
                      loading={loadingHabitaciones}
                    >
                      Re-sincronizar
                    </Button>

                    {!isMobile && (
                      <Button
                        size="small"
                        type="text"
                        icon={<CommentOutlined style={{ color: beachColors.teal }} />}
                        onClick={() => setOpenChat(true)}
                      >
                        Asistencia
                      </Button>
                    )}
                  </Space>
                </Flex>

                {error ? (
                  <Card style={{ borderRadius: 14 }}>
                    <Text type="danger">Error al cargar habitaciones: {error?.message || "desconocido"}</Text>
                  </Card>
                ) : null}

                {loadingHabitaciones ? (
                  <Card style={{ borderRadius: 14 }}>
                    <Flex align="center" gap={10}>
                      <Spin />
                      <Text>Sincronizando habitaciones…</Text>
                    </Flex>
                  </Card>
                ) : filteredCards.length === 0 ? (
                  <Card style={{ borderRadius: 14 }}>
                    <Empty
                      description={
                        <Flex vertical gap={6}>
                          <Text strong>No hay resultados con esos filtros</Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Prueba limpiar filtros o ajustar fechas / servicios.
                          </Text>
                        </Flex>
                      }
                    />
                    <Flex justify="center" gap={10} style={{ marginTop: 10 }}>
                      <Button onClick={clearFilters} style={{ borderRadius: 999 }}>
                        Limpiar filtros
                      </Button>
                      <Button type="primary" onClick={() => emitQuery({ showToast: true })} style={{ borderRadius: 999 }}>
                        Reintentar
                      </Button>
                    </Flex>
                  </Card>
                ) : (
                  <RoomCards
                    beachColors={beachColors}
                    cardsData={cardsToShow}
                    loading={loadingHabitaciones}
                    onReservaExpress={handleReservaExpress}
                    onInfoWhatsapp={handleInfoWhatsapp}
                    pagination={pagination}
                    onPageChange={handleChangePageHabitaciones}
                  />
                )}
              </Flex>
            </Splitter.Panel>

            {!isMobile && (
              <Splitter.Panel defaultSize="25%" min="20%" max="32%" style={panelStyles.right}>
                <Flex vertical gap={12}>
                  <Recommendcards recommendedDestinations={[]} beachColors={beachColors} loading={false} />

                  <Card bordered={false} style={{ borderRadius: 14, background: "#ffffff", boxShadow: "0 6px 18px rgba(148,163,253,0.16)" }}>
                    <Flex vertical gap={6}>
                      <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                        ¿Por qué reservar aquí?
                      </Text>
                      <Text style={{ fontSize: 11, color: "#6b7280" }}>
                        Información directa, trato cercano y alojamientos seleccionados especialmente para tus huéspedes.
                      </Text>
                      <Flex gap={6} wrap>
                        <Tag color={beachColors.teal} style={{ borderRadius: 999, fontSize: 9, color: "#064e3b" }}>
                          Atención personalizada
                        </Tag>
                        <Tag color={beachColors.turquoise} style={{ borderRadius: 999, fontSize: 9, color: "#065f46" }}>
                          Reservas seguras
                        </Tag>
                        <Tag color={beachColors.sand} style={{ borderRadius: 999, fontSize: 9, color: beachColors.deepBlue }}>
                          Experiencias únicas
                        </Tag>
                      </Flex>
                    </Flex>
                  </Card>

                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 14,
                      background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                      color: "#ffffff",
                    }}
                  >
                    <Flex vertical gap={6}>
                      <Flex align="center" gap={8}>
                        <CustomerServiceOutlined />
                        <Text style={{ fontSize: 12, color: "#eff6ff" }}>¿Necesitas ayuda con tu reserva?</Text>
                      </Flex>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => setOpenChat(true)}
                        style={{
                          marginTop: 4,
                          alignSelf: "flex-start",
                          background: "#ffffff",
                          color: beachColors.deepBlue,
                          borderRadius: 999,
                          fontSize: 11,
                          paddingInline: 14,
                        }}
                      >
                        Hablar con el equipo
                      </Button>
                    </Flex>
                  </Card>
                </Flex>
              </Splitter.Panel>
            )}
          </Splitter>
        </main>

        {/* FOOTER */}
        <footer
          style={{
            textAlign: "center",
            padding: 22,
            background: `linear-gradient(135deg, ${beachColors.deepBlue}, ${beachColors.oceanBlue})`,
            color: "white",
          }}
        >
          <Flex vertical justify="center" align="center" gap={10} style={{ maxWidth: 900, margin: "0 auto" }}>
            <Text style={{ color: "white", fontSize: 12 }}>
              © {new Date().getFullYear()} Hoteles Frida · Plataforma de reservas desarrollada a la medida.
            </Text>
            <Flex gap={10} wrap justify="center">
              {[{ nombre: "Términos", path: "#" }, { nombre: "Privacidad", path: "#" }, { nombre: "Contacto", path: "#" }, { nombre: "Nosotros", path: "#" }].map(
                (link, i) => (
                  <a key={i} href={link.path} style={{ color: "white", fontSize: 11 }}>
                    {link.nombre}
                  </a>
                )
              )}
            </Flex>
          </Flex>
        </footer>

        {/* CHAT */}
        <ChatSoporte
          open={openChat}
          onClose={() => setOpenChat(false)}
          isMobile={isMobile}
          habitacionSeleccionada={habitacionSeleccionada}
          onFinalizarReserva={handleChatClosedForReserva}
        />
      </div>
    </ConfigProvider>
  );
}

export default App;
