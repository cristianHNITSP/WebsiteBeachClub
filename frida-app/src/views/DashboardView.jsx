// frida-app/src/views/DashboardView.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  List,
  Space,
  Statistic,
  Tag,
  Typography,
  Tooltip,
  Badge,
  Tabs,
} from "antd";

import {
  DashboardOutlined,
  RiseOutlined,
  HomeOutlined,
  ApartmentOutlined,
  ThunderboltOutlined,
  ClusterOutlined,
  PieChartOutlined,
  ShoppingCartOutlined,
  StockOutlined,
} from "@ant-design/icons";

import { beachColors, neutrals } from "../theme/beachTheme";

const { Text, Title } = Typography;

// YYYY-MM-DD en America/Merida (sin dayjs timezone)
function todayMeridaStr() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Merida",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const round2 = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
};

const formatShortDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dt);
};

const formatCurrency = (n, { noDecimals = false } = {}) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0";
  return num.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: noDecimals ? 0 : 0,
    maximumFractionDigits: noDecimals ? 0 : 0,
  });
};

const weekdayLabels = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mié",
  thu: "Jue",
  fri: "Vie",
  sat: "Sáb",
  sun: "Dom",
};

const DashboardView = ({ isMobile }) => {
  const [loading, setLoading] = useState(true);

  // Flag para animación de entrada
  const [mounted, setMounted] = useState(false);

  // Tab actual: hotel / shop
  const [activeTab, setActiveTab] = useState("hotel");

  // Resumen real de HOY (reservas)
  const [hoy, setHoy] = useState({
    reservas: 0, // reservas activas hoy (overlap)
    checkins: 0, // previstas hoy (startDate==hoy y sin checkinAt)
    ocupacion: 0, // %
    ingresos: 0, // estimado del día (prorrateado)
  });

  // Barras de disponibilidad (reales)
  const [disp, setDisp] = useState({
    totalRooms: 0,
    occupied: 0,
    available: 0,
    unreservable: 0,
    trashed: 0,
  });

  // Promos reales (habitaciones con oferta)
  const [promos, setPromos] = useState([]);

  // Stats mensuales de ventas/ocupación + canales
  const [stats, setStats] = useState({
    months: [],
    channels: {
      totalReservations: 0,
      byChannel: [],
    },
  });

  /* ========== SHOP / POS ========== */

  const [shopSummary, setShopSummary] = useState({
    rangeLabel: "",
    rangeTotal: 0,
    rangeCount: 0,
    todayTotal: 0,
    todayCount: 0,
    avgTicket: 0,
    bySection: [],
    byPayment: [],
  });

  const [lowStock, setLowStock] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);

  const apiBase = useMemo(() => {
    return import.meta.env.VITE_RESERVAS_API_URL || "";
  }, []);

  const shopBase = useMemo(() => {
    // Si está vacío, pega contra /api/shop/... en el mismo host
    return import.meta.env.VITE_SHOP_API_URL || "";
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      setLoading(true);
      const hoyStr = todayMeridaStr();

      try {
        // 1) Reservas activas hoy (overlap)
        const reservasReq = axios.get(`${apiBase}/api/reservas`, {
          withCredentials: true,
          params: { from: hoyStr, to: hoyStr },
        });

        // 2) Disponibilidad por habitaciones
        const roomsAvailReq = axios.get(
          `${apiBase}/api/reservas/habitaciones`,
          {
            withCredentials: true,
            params: { startDate: hoyStr, endDate: hoyStr },
          }
        );

        // 3) Total habitaciones (todas) y papelera
        const totalAllReq = axios.get(
          `${apiBase}/api/habitaciones/gestor.admin`,
          {
            withCredentials: true,
            params: { papelera: "todas", page: 1, limit: 1 },
          }
        );

        const trashedReq = axios.get(
          `${apiBase}/api/habitaciones/gestor.admin`,
          {
            withCredentials: true,
            params: { papelera: "solo", page: 1, limit: 1 },
          }
        );

        // 4) Promos reales
        const promosReq = axios.get(
          `${apiBase}/api/habitaciones/recomendaciones`,
          {
            withCredentials: true,
            params: { limit: 4 },
          }
        );

        // 5) Stats mensuales (ventas / ocupación / canales / métricas extra)
        const statsReq = axios.get(
          `${apiBase}/api/reservas/stats/mensuales`,
          {
            withCredentials: true,
            params: { months: 6 },
          }
        );

        const [
          reservasRes,
          roomsAvailRes,
          totalAllRes,
          trashedRes,
          promosRes,
          statsRes,
        ] = await Promise.all([
          reservasReq,
          roomsAvailReq,
          totalAllReq,
          trashedReq,
          promosReq,
          statsReq,
        ]);

        if (!alive) return;

        const reservas = Array.isArray(reservasRes.data?.data)
          ? reservasRes.data.data
          : [];
        const habitaciones = Array.isArray(roomsAvailRes.data?.data)
          ? roomsAvailRes.data.data
          : [];

        const totalRoomsAll = Number(totalAllRes.data?.total ?? 0) || 0;
        const trashedCount = Number(trashedRes.data?.total ?? 0) || 0;

        // Reservas activas hoy
        const reservasActivasHoy = reservas.length;

        // Checkins previstos hoy: startDate==hoy y sin checkinAt
        const checkinsPrevistos = reservas.filter(
          (r) =>
            r?.startDate === hoyStr &&
            !r?.checkinAt &&
            !r?.checkoutAt &&
            !r?.isDeleted
        ).length;

        // Conteos de disponibilidad
        const occupied = habitaciones.filter(
          (x) => x?.blockedByBooking === true
        ).length;
        const available = habitaciones.filter(
          (x) => x?.available === true
        ).length;
        const unreservable = habitaciones.filter(
          (x) => x?.reservableByStatus === false
        ).length;

        const operables = occupied + available;
        const ocupacion =
          operables > 0 ? Math.round((occupied / operables) * 100) : 0;

        const ingresos = round2(
          reservas.reduce((acc, r) => {
            const days = Number(r?.billing?.days);
            const total = Number(r?.billing?.total);
            if (!Number.isFinite(days) || days <= 0) return acc;
            if (!Number.isFinite(total) || total < 0) return acc;
            return acc + total / days;
          }, 0)
        );

        setHoy({
          reservas: reservasActivasHoy,
          checkins: checkinsPrevistos,
          ocupacion,
          ingresos,
        });

        setDisp({
          totalRooms: totalRoomsAll,
          occupied,
          available,
          unreservable,
          trashed: trashedCount,
        });

        // Promos reales desde /habitaciones/recomendaciones
        const promosRaw = Array.isArray(promosRes.data?.items)
          ? promosRes.data.items
          : [];

        const mappedPromos = promosRaw.map((room) => {
          const discount = Number(room?.offer?.discountPercent ?? 0);
          const hasDiscount = Number.isFinite(discount) && discount > 0;
          const canalLabel = hasDiscount
            ? `Oferta especial · ${discount}%`
            : "Oferta especial";

          const fechaSrc = room.updatedAt || room.createdAt || null;

          return {
            id: String(room._id),
            nombre:
              room.title ||
              room.codigo ||
              `Habitación ${room.roomNumber || ""}`.trim(),
            canal: canalLabel,
            fecha: fechaSrc,
          };
        });

        mappedPromos.sort((a, b) => {
          if (!a.fecha || !b.fecha) return 0;
          return new Date(b.fecha) - new Date(a.fecha);
        });

        setPromos(mappedPromos);

        // Stats mensuales
        const statsData = statsRes.data?.data || statsRes.data || {};
        setStats({
          months: Array.isArray(statsData.months) ? statsData.months : [],
          channels:
            statsData.channels || { totalReservations: 0, byChannel: [] },
        });

        /* ======= SHOP / POS OPCIONAL ======= */
        try {
          const shopUrl = shopBase
            ? `${shopBase}/api/shop/dashboard`
            : `/api/shop/dashboard`;

          const shopRes = await axios.get(shopUrl, {
            withCredentials: true,
          });

          const shopData = shopRes.data || {};
          const salesSummary = shopData.salesSummary || {};

          setShopSummary({
            rangeLabel: shopData.rangeLabel || "",
            rangeTotal: Number(salesSummary.rangeTotal || 0),
            rangeCount: Number(salesSummary.rangeCount || 0),
            todayTotal: Number(salesSummary.todayTotal || 0),
            todayCount: Number(salesSummary.todayCount || 0),
            avgTicket: round2(salesSummary.avgTicket || 0),
            bySection: Array.isArray(salesSummary.bySection)
              ? salesSummary.bySection
              : [],
            byPayment: Array.isArray(salesSummary.byPayment)
              ? salesSummary.byPayment
              : [],
          });

          setLowStock(
            Array.isArray(shopData.lowStock) ? shopData.lowStock : []
          );
          setRecentMovements(
            Array.isArray(shopData.recentMovements)
              ? shopData.recentMovements
              : []
          );
        } catch (errShop) {
          // No tiramos el dashboard si shop falla
          console.warn(
            "[Dashboard] Shop dashboard no disponible:",
            errShop?.response?.status,
            errShop?.message
          );
        }
      } catch (e) {
        console.error("[Dashboard] Error cargando datos (core reservas):", e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [apiBase, shopBase]);

  /* ========== MÉTRICAS DERIVADAS (RESERVAS) ========== */

  const disponibilidad = useMemo(() => {
    const total = disp.totalRooms || 0;
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return [
      {
        label: "Ocupadas",
        porcentaje: pct(disp.occupied),
        color: beachColors.oceanBlue,
      },
      {
        label: "Disponibles",
        porcentaje: pct(disp.available),
        color: beachColors.teal,
      },
      {
        label: "No reservables",
        porcentaje: pct(disp.unreservable),
        color: beachColors.sunset,
      },
      { label: "Papelera", porcentaje: pct(disp.trashed), color: "#9ca3af" },
    ];
  }, [disp]);

  const totalRoomsRented = useMemo(
    () =>
      stats.months.reduce((acc, m) => acc + Number(m.roomsRented || 0), 0),
    [stats.months]
  );

  const totalRevenue = useMemo(
    () => stats.months.reduce((acc, m) => acc + Number(m.revenue || 0), 0),
    [stats.months]
  );

  const averageOccupancy = useMemo(() => {
    if (!stats.months.length) return 0;
    const sum = stats.months.reduce(
      (acc, m) => acc + Number(m.occupancyPct || 0),
      0
    );
    return Math.round(sum / stats.months.length);
  }, [stats.months]);

  const lastMonth = useMemo(
    () => (stats.months.length ? stats.months[stats.months.length - 1] : null),
    [stats.months]
  );

  const occupancyTrend = useMemo(() => {
    if (stats.months.length < 2) return null;
    const last = stats.months[stats.months.length - 1];
    const prev = stats.months[stats.months.length - 2];
    const delta =
      Number(last.occupancyPct || 0) - Number(prev.occupancyPct || 0);
    return round2(delta);
  }, [stats.months]);

  // ADR y RevPAR (globales para el periodo)
  const adrRevMetrics = useMemo(() => {
    let totalNights = 0;
    let totalRevenueLocal = 0;
    let totalAvailableRoomNights = 0;

    for (const m of stats.months) {
      const revenue = Number(m.revenue || 0);
      const nights = Number(m.nights || 0); // noches ocupadas
      const available = Number(m.availableRoomNights || 0); // hab disponibles * días

      if (Number.isFinite(revenue)) totalRevenueLocal += revenue;
      if (Number.isFinite(nights)) totalNights += nights;
      if (Number.isFinite(available)) totalAvailableRoomNights += available;
    }

    const adr =
      totalNights > 0 ? round2(totalRevenueLocal / totalNights) : 0;
    const revpar =
      totalAvailableRoomNights > 0
        ? round2(totalRevenueLocal / totalAvailableRoomNights)
        : 0;

    return { adr, revpar };
  }, [stats.months]);

  // Estancia promedio y lead time (ponderados por habitaciones rentadas)
  const stayMetrics = useMemo(() => {
    let totalRoomsWeighted = 0;
    let staySum = 0;
    let leadSum = 0;

    for (const m of stats.months) {
      const rooms = Number(m.roomsRented || 0);
      const stay = Number(m.avgStayNights || 0);
      const lead = Number(m.avgLeadTimeDays || 0);

      if (rooms > 0) {
        if (Number.isFinite(stay)) staySum += stay * rooms;
        if (Number.isFinite(lead)) leadSum += lead * rooms;
        totalRoomsWeighted += rooms;
      }
    }

    const avgStay =
      totalRoomsWeighted > 0 ? round2(staySum / totalRoomsWeighted) : 0;
    const avgLead =
      totalRoomsWeighted > 0 ? round2(leadSum / totalRoomsWeighted) : 0;

    return { avgStay, avgLead };
  }, [stats.months]);

  // Ocupación por día de la semana (promedio)
  const weekdaySummary = useMemo(() => {
    const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const acc = keys.map((k) => ({
      key: k,
      label: weekdayLabels[k],
      sum: 0,
      count: 0,
    }));

    for (const m of stats.months) {
      const b = m.weekdayBreakdown || {};
      keys.forEach((k, idx) => {
        const v = Number(b[k] ?? 0);
        if (Number.isFinite(v)) {
          acc[idx].sum += v;
          acc[idx].count += 1;
        }
      });
    }

    return acc.map((x) => ({
      key: x.key,
      label: x.label,
      value: x.count ? Math.round(x.sum / x.count) : 0,
    }));
  }, [stats.months]);

  // Ocupación y rooms por tipo de habitación (top 4)
  const roomTypeSummary = useMemo(() => {
    const agg = new Map();

    for (const m of stats.months) {
      const list = m.roomTypeBreakdown || [];
      for (const rt of list) {
        const key = rt.roomType || "Otro";
        const prev =
          agg.get(key) || {
            roomType: key,
            rooms: 0,
            occSum: 0,
            occCount: 0,
          };

        const rooms = Number(rt.roomsRented || 0);
        const occ = Number(rt.occupancyPct || 0);

        if (Number.isFinite(rooms)) prev.rooms += rooms;
        if (Number.isFinite(occ)) {
          prev.occSum += occ;
          prev.occCount += 1;
        }

        agg.set(key, prev);
      }
    }

    const arr = Array.from(agg.values()).map((x) => ({
      roomType: x.roomType,
      rooms: x.rooms,
      occupancy: x.occCount ? Math.round(x.occSum / x.occCount) : 0,
    }));

    arr.sort((a, b) => b.rooms - a.rooms);
    return arr.slice(0, 4);
  }, [stats.months]);

  // Canales: share y orden descendente
  const channelSummary = useMemo(() => {
    const arr = stats.channels?.byChannel || [];
    if (!arr.length) return [];

    const total = arr.reduce((acc, c) => acc + Number(c.count || 0), 0);

    const enriched = arr.map((ch) => {
      const count = Number(ch.count || 0);
      const revenue = Number(ch.revenue || 0);
      const share = total > 0 ? Math.round((count * 100) / total) : 0;
      return {
        ...ch,
        count,
        revenue,
        share,
      };
    });

    enriched.sort((a, b) => b.count - a.count);
    return enriched;
  }, [stats.channels]);

  const bestChannel = useMemo(() => {
    if (!channelSummary.length) return null;
    return channelSummary[0];
  }, [channelSummary]);

  const hasStats = stats.months && stats.months.length > 0;

  const { adr, revpar } = adrRevMetrics;
  const { avgStay, avgLead } = stayMetrics;

  /* ========== STYLES REUTILIZABLES ========== */

  const sectionRowAnim = (delayMs = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0px)" : "translateY(10px)",
    transition: `opacity 0.45s ease-out ${delayMs}ms, transform 0.45s ease-out ${delayMs}ms`,
  });

  const sectionCardStyle = {
    borderRadius: 18,
    background: "#ffffff",
    boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
  };

  const sectionBodyBase = {
    padding: isMobile ? 12 : 16,
  };

  /* ========== RENDER ========== */

  return (
    <div
      style={{
        minHeight: "100%",
        background: `radial-gradient(circle at top left, ${beachColors.turquoise}10, transparent 55%), radial-gradient(circle at bottom right, ${beachColors.sand}26, transparent 55%), #f8fafc`,
      }}
    >
      {/* Encabezado del dashboard */}
      <Row
        justify="space-between"
        align="middle"
        style={{
          marginBottom: 12,
          ...sectionRowAnim(0),
        }}
      >
        <Col>
          <Space align="center" size={10}>
            <Badge
              count={null}
              offset={[0, 0]}
              style={{
                background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                color: "#fff",
                boxShadow: "0 4px 12px rgba(15,23,42,0.25)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "radial-gradient(circle at 30% 10%, #ffffff, rgba(15,23,42,0.08))",
                }}
              >
                <DashboardOutlined style={{ color: beachColors.deepBlue }} />
              </div>
            </Badge>
            <div>
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: neutrals.textMain,
                  letterSpacing: 0.2,
                }}
              >
                Panel operativo · Beach Club
              </Title>
              <Text
                type="secondary"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Vista rápida de ocupación, reservas y ventas de tienda (shop).
              </Text>
            </div>
          </Space>
        </Col>

        <Col>
          <Space size={6} align="center">
            <Tooltip title="Fecha según zona horaria Mérida">
              <Tag
                icon={<HomeOutlined />}
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  borderColor: "transparent",
                  background: "rgba(15,23,42,0.04)",
                }}
              >
                Hoy: {todayMeridaStr()}
              </Tag>
            </Tooltip>
            <Tooltip title="Datos consolidados de los últimos meses (habitaciones)">
              <Tag
                icon={<RiseOutlined />}
                color={beachColors.turquoise}
                style={{
                  borderRadius: 999,
                  fontSize: 10,
                  color: "#064e3b",
                }}
              >
                {stats.months.length || 0} meses analizados
              </Tag>
            </Tooltip>
          </Space>
        </Col>
      </Row>

      {/* Tabs para separar hotel vs tienda */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ marginBottom: 8 }}
        items={[
          {
            key: "hotel",
            label: "Hotel / Reservas",
          },
          {
            key: "shop",
            label: "Tienda (POS)",
          },
        ]}
      />

      {/* ================== TAB HOTEL ================== */}
      {activeTab === "hotel" && (
        <>
          {/* FILA 1: Resumen de hoy + Rendimiento últimos meses */}
          <Row gutter={[16, 16]} style={sectionRowAnim(40)}>
            {/* Resumen de Hoy */}
            <Col xs={24} lg={15}>
              <Card
                hoverable
                bordered={false}
                style={{
                  borderRadius: 20,
                  background: `radial-gradient(circle at 0% 0%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(140deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                  boxShadow: "0 18px 44px rgba(15,23,42,0.3)",
                  overflow: "hidden",
                  position: "relative",
                }}
                bodyStyle={{
                  padding: isMobile ? 18 : 22,
                  paddingBottom: isMobile ? 18 : 24,
                }}
              >
                {/* Decoración suave en esquina */}
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    background:
                      "radial-gradient(circle at 80% 0%, rgba(248,250,252,0.16), transparent 60%)",
                  }}
                />

                <Space
                  direction="vertical"
                  size={10}
                  style={{
                    width: "100%",
                    color: "#fff",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <Text
                        style={{
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                          color: "rgba(255,255,255,0.82)",
                        }}
                      >
                        Resumen de hoy {loading ? "· cargando…" : ""}
                      </Text>
                      <Title
                        level={3}
                        style={{
                          margin: "4px 0 0 0",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: isMobile ? 20 : 24,
                        }}
                      >
                        Operación diaria
                      </Title>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "rgba(255,255,255,0.80)",
                        }}
                      >
                        Hotel Beach Club · estado en tiempo casi real
                      </Text>
                    </div>

                    <Space
                      direction="vertical"
                      size={4}
                      style={{ alignItems: "flex-end" }}
                    >
                      <Tag
                        color="rgba(15,23,42,0.26)"
                        style={{
                          borderRadius: 999,
                          border: "none",
                          color: "#e5e7eb",
                          fontSize: 10,
                          padding: "2px 10px",
                          backdropFilter: "blur(6px)",
                        }}
                        icon={<ApartmentOutlined />}
                      >
                        Habitaciones totales: {disp.totalRooms || 0}
                      </Tag>
                      <Tag
                        color="rgba(15,23,42,0.18)"
                        style={{
                          borderRadius: 999,
                          border: "none",
                          color: "#e5e7eb",
                          fontSize: 10,
                          padding: "2px 10px",
                          backdropFilter: "blur(6px)",
                        }}
                      >
                        Papelera: {disp.trashed || 0}
                      </Tag>
                    </Space>
                  </div>

                  <Row gutter={16} style={{ marginTop: 8 }}>
                    <Col xs={12} sm={12} md={12}>
                      <Statistic
                        title={
                          <Text style={{ color: "#e5e7eb", fontSize: 11 }}>
                            Reservas activas hoy
                          </Text>
                        }
                        value={hoy.reservas}
                        valueStyle={{
                          color: "#fff",
                          fontSize: isMobile ? 24 : 30,
                          fontWeight: 700,
                        }}
                      />
                    </Col>
                    <Col xs={12} sm={12} md={12}>
                      <Statistic
                        title={
                          <Text style={{ color: "#e5e7eb", fontSize: 11 }}>
                            Check-ins previstos hoy
                          </Text>
                        }
                        value={hoy.checkins}
                        valueStyle={{
                          color: "#fff",
                          fontSize: isMobile ? 24 : 30,
                          fontWeight: 700,
                        }}
                      />
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col xs={12} sm={12} md={12}>
                      <Statistic
                        title={
                          <Space size={4}>
                            <Text style={{ color: "#e5e7eb", fontSize: 10 }}>
                              Ocupación (hab. operables)
                            </Text>
                            <Tooltip title="Ocupación sobre habitaciones disponibles para vender (no cuenta papelera ni fuera de servicio).">
                              <ThunderboltOutlined
                                style={{
                                  color: beachColors.sand,
                                  fontSize: 12,
                                }}
                              />
                            </Tooltip>
                          </Space>
                        }
                        value={hoy.ocupacion}
                        suffix="%"
                        valueStyle={{
                          color: beachColors.sand,
                          fontSize: isMobile ? 18 : 20,
                          fontWeight: 600,
                        }}
                      />
                    </Col>
                    <Col xs={12} sm={12} md={12}>
                      <Statistic
                        title={
                          <Text style={{ color: "#e5e7eb", fontSize: 10 }}>
                            Ingreso estimado de hoy
                          </Text>
                        }
                        value={hoy.ingresos}
                        precision={2}
                        prefix="$"
                        valueStyle={{
                          color: "#fff",
                          fontSize: isMobile ? 18 : 20,
                          fontWeight: 500,
                        }}
                      />
                    </Col>
                  </Row>
                </Space>
              </Card>
            </Col>

            {/* Rendimiento últimos meses */}
            <Col xs={24} lg={9}>
              <Card
                hoverable
                bordered={false}
                title={
                  <Space>
                    <PieChartOutlined
                      style={{ color: beachColors.oceanBlue, fontSize: 16 }}
                    />
                    <Text
                      style={{
                        fontWeight: 600,
                        color: neutrals.textMain,
                        fontSize: 14,
                      }}
                    >
                      Rendimiento últimos meses
                    </Text>
                  </Space>
                }
                style={sectionCardStyle}
                bodyStyle={sectionBodyBase}
              >
                {!hasStats ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Aún no hay suficientes datos de reservas para mostrar
                    estadísticas mensuales.
                  </Text>
                ) : (
                  <Space
                    direction="vertical"
                    size={12}
                    style={{ width: "100%" }}
                  >
                    {/* KPIs compactos */}
                    <Row gutter={12}>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              Ocupación promedio
                            </Text>
                          }
                          value={averageOccupancy}
                          suffix="%"
                          valueStyle={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: neutrals.textMain,
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              Hab. rentadas ({stats.months.length} meses)
                            </Text>
                          }
                          value={totalRoomsRented}
                          valueStyle={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: neutrals.textMain,
                          }}
                        />
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              ADR promedio
                            </Text>
                          }
                          value={adr}
                          prefix="$"
                          valueStyle={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: beachColors.oceanBlue,
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              RevPAR promedio
                            </Text>
                          }
                          value={revpar}
                          prefix="$"
                          valueStyle={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: beachColors.teal,
                          }}
                        />
                      </Col>
                    </Row>

                    <Row gutter={12}>
                      <Col span={24}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              Ingresos acumulados
                            </Text>
                          }
                          value={formatCurrency(totalRevenue, {
                            noDecimals: true,
                          })}
                          valueStyle={{
                            fontSize: 18,
                            fontWeight: 600,
                            color: beachColors.oceanBlue,
                          }}
                        />
                      </Col>
                    </Row>

                    {/* Último mes + tendencia */}
                    {lastMonth && (
                      <div
                        style={{
                          marginTop: 4,
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(148,163,184,0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: neutrals.textMuted,
                          }}
                        >
                          <span>
                            Último mes ·{" "}
                            <strong style={{ color: neutrals.textMain }}>
                              {lastMonth.label || lastMonth.month}
                            </strong>
                          </span>
                          <span>
                            {lastMonth.occupancyPct ?? 0}% ·{" "}
                            {formatCurrency(lastMonth.revenue || 0, {
                              noDecimals: true,
                            })}
                          </span>
                        </div>
                        {occupancyTrend !== null && (
                          <div
                            style={{
                              marginTop: 2,
                              fontSize: 10,
                              color:
                                occupancyTrend >= 0 ? "#16a34a" : "#b91c1c",
                            }}
                          >
                            {occupancyTrend >= 0 ? "▲" : "▼"}{" "}
                            {Math.abs(occupancyTrend)} pts vs mes anterior
                          </div>
                        )}
                      </div>
                    )}
                  </Space>
                )}
              </Card>
            </Col>
          </Row>

          {/* FILA 2: Disponibilidad + Promos */}
          <Row
            gutter={[16, 16]}
            style={{ marginTop: 12, ...sectionRowAnim(80) }}
          >
            {/* Disponibilidad */}
            <Col xs={24} lg={15}>
              <Card
                hoverable
                bordered={false}
                title={
                  <Space size={8} wrap>
                    <ClusterOutlined
                      style={{ color: beachColors.oceanBlue, fontSize: 16 }}
                    />
                    <Text
                      style={{
                        fontWeight: 600,
                        color: neutrals.textMain,
                        fontSize: 14,
                      }}
                    >
                      Disponibilidad de habitaciones
                    </Text>
                    <Tag
                      color={beachColors.turquoise}
                      style={{
                        borderRadius: 999,
                        fontSize: 10,
                        color: "#064e3b",
                      }}
                    >
                      Ocupación actual: {hoy.ocupacion}%
                    </Tag>
                  </Space>
                }
                style={sectionCardStyle}
                bodyStyle={{
                  ...sectionBodyBase,
                  paddingTop: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: isMobile ? 16 : 24,
                    height: isMobile ? 120 : 140,
                  }}
                >
                  {disponibilidad.map((item) => (
                    <div
                      key={item.label}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          width: isMobile ? 22 : 30,
                          height:
                            ((item.porcentaje || 0) / 100) *
                            (isMobile ? 90 : 120),
                          borderRadius: 10,
                          background: `linear-gradient(180deg, ${item.color}, rgba(15,23,42,0.70))`,
                          boxShadow: "0 6px 14px rgba(15,23,42,0.20)",
                          transition: "height 0.35s ease-out",
                        }}
                      />
                      <Text
                        style={{ fontSize: 10, color: neutrals.textMuted }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={{ fontSize: 9, color: neutrals.textMuted }}
                      >
                        {item.porcentaje}%
                      </Text>
                    </div>
                  ))}
                </div>
              </Card>
            </Col>

            {/* Últimas promociones (reales desde habitaciones) */}
            <Col xs={24} lg={9}>
              <Card
                hoverable
                bordered={false}
                title={
                  <Space>
                    <RiseOutlined
                      style={{ color: beachColors.teal, fontSize: 16 }}
                    />
                    <Text
                      style={{
                        fontWeight: 600,
                        color: neutrals.textMain,
                        fontSize: 14,
                      }}
                    >
                      Últimas promociones
                    </Text>
                  </Space>
                }
                style={sectionCardStyle}
                bodyStyle={{
                  ...sectionBodyBase,
                  padding: isMobile ? 10 : 14,
                }}
              >
                {promos.length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Aún no hay promociones activas en habitaciones.
                  </Text>
                ) : (
                  <List
                    itemLayout="horizontal"
                    dataSource={promos}
                    split={false}
                    renderItem={(item, index) => (
                      <List.Item
                        style={{
                          padding: "6px 8px",
                          marginBottom: index === promos.length - 1 ? 0 : 4,
                          borderRadius: 10,
                          background:
                            index === 0
                              ? "rgba(46,196,182,0.06)"
                              : "transparent",
                        }}
                      >
                        <List.Item.Meta
                          title={
                            <Text
                              style={{
                                fontWeight: 500,
                                color: neutrals.textMain,
                                fontSize: 13,
                              }}
                            >
                              {item.nombre}
                            </Text>
                          }
                          description={
                            <Space size={10}>
                              <Text
                                type="secondary"
                                style={{ fontSize: 11 }}
                              >
                                {item.canal}
                              </Text>
                              <Text
                                type="secondary"
                                style={{ fontSize: 11 }}
                              >
                                {formatShortDate(item.fecha)}
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                )}
              </Card>
            </Col>
          </Row>

          {/* FILA 3: Comportamiento de estancias + Canales */}
          <Row
            gutter={[16, 16]}
            style={{
              marginTop: 12,
              marginBottom: 16,
              ...sectionRowAnim(120),
            }}
          >
            {/* Comportamiento de estancias */}
            <Col xs={24} lg={12}>
              <Card
                hoverable
                bordered={false}
                title={
                  <Space>
                    <HomeOutlined
                      style={{ color: beachColors.sunset, fontSize: 16 }}
                    />
                    <Text
                      style={{
                        fontWeight: 600,
                        color: neutrals.textMain,
                        fontSize: 14,
                      }}
                    >
                      Comportamiento de estancias
                    </Text>
                  </Space>
                }
                style={sectionCardStyle}
                bodyStyle={sectionBodyBase}
              >
                {!hasStats ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Aún no hay datos suficientes para mostrar patrones de
                    estancias.
                  </Text>
                ) : (
                  <Space
                    direction="vertical"
                    size={10}
                    style={{ width: "100%" }}
                  >
                    {/* Estancia y lead time */}
                    <Row gutter={12}>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              Estancia promedio
                            </Text>
                          }
                          value={avgStay}
                          suffix=" noches"
                          valueStyle={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: neutrals.textMain,
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title={
                            <Text
                              style={{
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              Anticipación promedio
                            </Text>
                          }
                          value={avgLead}
                          suffix=" días"
                          valueStyle={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: neutrals.textMain,
                          }}
                        />
                      </Col>
                    </Row>

                    {/* Ocupación por día de la semana */}
                    <div>
                      <Text
                        strong
                        style={{
                          fontSize: 11,
                          color: neutrals.textMain,
                        }}
                      >
                        Ocupación por día de la semana
                      </Text>
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          gap: 8,
                        }}
                      >
                        {weekdaySummary.map((d) => (
                          <div
                            key={d.key}
                            style={{
                              flex: 1,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <div
                              style={{
                                height: 40,
                                width: 8,
                                borderRadius: 999,
                                background: "#e5e7eb",
                                overflow: "hidden",
                                position: "relative",
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  bottom: 0,
                                  left: 0,
                                  right: 0,
                                  height: `${Math.min(100, d.value)}%`,
                                  background: `linear-gradient(180deg, ${beachColors.teal}, ${beachColors.oceanBlue})`,
                                  borderRadius: 999,
                                  transition: "height 0.3s ease-out",
                                }}
                              />
                            </div>
                            <Text
                              style={{
                                fontSize: 9,
                                color: neutrals.textMuted,
                              }}
                            >
                              {d.label}
                            </Text>
                            <Text
                              style={{
                                fontSize: 9,
                                color: neutrals.textMuted,
                              }}
                            >
                              {d.value}%
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ocupación por tipo de habitación */}
                    <div>
                      <Text
                        strong
                        style={{
                          fontSize: 11,
                          color: neutrals.textMain,
                        }}
                      >
                        Tipos de habitación más demandados
                      </Text>
                      <List
                        size="small"
                        dataSource={roomTypeSummary}
                        split={false}
                        style={{ marginTop: 6 }}
                        renderItem={(rt) => (
                          <List.Item
                            style={{
                              padding: "4px 0",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                            }}
                          >
                            <span style={{ color: neutrals.textMain }}>
                              {rt.roomType}
                            </span>
                            <Space size={8}>
                              <span style={{ color: neutrals.textMuted }}>
                                {rt.rooms} hab.
                              </span>
                              <span>{rt.occupancy}% occ.</span>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </div>
                  </Space>
                )}
              </Card>
            </Col>

            {/* Canales de reservación */}
            <Col xs={24} lg={12}>
              <Card
                hoverable
                bordered={false}
                title={
                  <Space>
                    <PieChartOutlined
                      style={{ color: beachColors.oceanBlue, fontSize: 16 }}
                    />
                    <Text
                      style={{
                        fontWeight: 600,
                        color: neutrals.textMain,
                        fontSize: 14,
                      }}
                    >
                      Canales de reservación
                    </Text>
                  </Space>
                }
                style={sectionCardStyle}
                bodyStyle={sectionBodyBase}
              >
                {!channelSummary.length ? (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Todavía no hay información de canales de reservación.
                  </Text>
                ) : (
                  <Space
                    direction="vertical"
                    size={10}
                    style={{ width: "100%" }}
                  >
                    {/* Canal líder */}
                    {bestChannel && (
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          background: "rgba(59,130,246,0.06)",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: neutrals.textMuted,
                          }}
                        >
                          Canal principal actual:{" "}
                          <strong style={{ color: neutrals.textMain }}>
                            {bestChannel.channel}
                          </strong>{" "}
                          ({bestChannel.share}% de las reservas)
                        </Text>
                      </div>
                    )}

                    {/* Chips rápidos */}
                    <Space size={8} wrap>
                      {channelSummary.map((ch) => (
                        <Tag
                          key={ch.channel}
                          color={
                            bestChannel &&
                            bestChannel.channel === ch.channel
                              ? beachColors.turquoise
                              : "rgba(148,163,184,0.12)"
                          }
                          style={{
                            borderRadius: 999,
                            fontSize: 10,
                            border: "none",
                            color:
                              bestChannel &&
                              bestChannel.channel === ch.channel
                                ? "#064e3b"
                                : neutrals.textMain,
                            padding: "2px 10px",
                          }}
                        >
                          {ch.channel}: {ch.count} reservas
                        </Tag>
                      ))}
                    </Space>

                    {/* Barra por canal */}
                    <div>
                      <Text
                        strong
                        style={{
                          fontSize: 11,
                          color: neutrals.textMain,
                        }}
                      >
                        Distribución por canal
                      </Text>
                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        {channelSummary.map((ch) => (
                          <div key={ch.channel}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 10,
                                color: neutrals.textMuted,
                              }}
                            >
                              <span>{ch.channel}</span>
                              <span>
                                {ch.share}% ·{" "}
                                {formatCurrency(ch.revenue || 0, {
                                  noDecimals: true,
                                })}
                              </span>
                            </div>
                            <div
                              style={{
                                position: "relative",
                                height: 6,
                                borderRadius: 999,
                                background: "#e5e7eb",
                                overflow: "hidden",
                                marginTop: 2,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: `${Math.min(100, ch.share)}%`,
                                  background: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                                  borderRadius: 999,
                                  transition: "width 0.35s ease-out",
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Space>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      {/* ================== TAB TIENDA / POS ================== */}
      {activeTab === "shop" && (
        <Row
          gutter={[16, 16]}
          style={{
            marginTop: 4,
            marginBottom: 16,
            ...sectionRowAnim(40),
          }}
        >
          {/* Resumen de ventas de shop */}
          <Col xs={24} lg={10}>
            <Card
              hoverable
              bordered={false}
              title={
                <Space>
                  <ShoppingCartOutlined
                    style={{ color: beachColors.oceanBlue, fontSize: 16 }}
                  />
                  <Text
                    style={{
                      fontWeight: 600,
                      color: neutrals.textMain,
                      fontSize: 14,
                    }}
                  >
                    Ventas de tienda (POS)
                  </Text>
                </Space>
              }
              style={sectionCardStyle}
              bodyStyle={sectionBodyBase}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: 10,
                            color: neutrals.textMuted,
                          }}
                        >
                          Ventas de hoy (shop)
                        </Text>
                      }
                      value={shopSummary.todayTotal}
                      prefix="$"
                      valueStyle={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: beachColors.oceanBlue,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: 10,
                            color: neutrals.textMuted,
                          }}
                        >
                          Tickets de hoy
                        </Text>
                      }
                      value={shopSummary.todayCount}
                      valueStyle={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: neutrals.textMain,
                      }}
                    />
                  </Col>
                </Row>

                <Row gutter={12}>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: 10,
                            color: neutrals.textMuted,
                          }}
                        >
                          Ventas últimos 7 días
                        </Text>
                      }
                      value={shopSummary.rangeTotal}
                      prefix="$"
                      valueStyle={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: beachColors.teal,
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={
                        <Text
                          style={{
                            fontSize: 10,
                            color: neutrals.textMuted,
                          }}
                        >
                          Ticket promedio
                        </Text>
                      }
                      value={shopSummary.avgTicket}
                      prefix="$"
                      valueStyle={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: neutrals.textMain,
                      }}
                    />
                  </Col>
                </Row>

                {shopSummary.rangeLabel && (
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 10,
                      marginTop: 4,
                    }}
                  >
                    Período analizado: {shopSummary.rangeLabel}
                  </Text>
                )}

                {/* Distribución por sección */}
                {shopSummary.bySection.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 11,
                        color: neutrals.textMain,
                      }}
                    >
                      Por sección
                    </Text>
                    <Space size={6} wrap style={{ marginTop: 4 }}>
                      {shopSummary.bySection.map((s) => (
                        <Tag
                          key={s.section}
                          style={{
                            borderRadius: 999,
                            border: "none",
                            fontSize: 10,
                            background: "rgba(148,163,184,0.14)",
                          }}
                        >
                          {s.section === "alcohol" ? "Alcohol" : "Normal"} ·{" "}
                          {formatCurrency(s.amount, { noDecimals: true })} ·{" "}
                          {s.count} tickets
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}

                {/* Distribución por método de pago */}
                {shopSummary.byPayment.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text
                      strong
                      style={{
                        fontSize: 11,
                        color: neutrals.textMain,
                      }}
                    >
                      Métodos de pago
                    </Text>
                    <Space size={6} wrap style={{ marginTop: 4 }}>
                      {shopSummary.byPayment.map((p) => (
                        <Tag
                          key={p.paymentMethod}
                          color="rgba(148,163,184,0.16)"
                          style={{
                            borderRadius: 999,
                            border: "none",
                            fontSize: 10,
                            color: neutrals.textMain,
                          }}
                        >
                          {p.paymentMethod} ·{" "}
                          {formatCurrency(p.amount, { noDecimals: true })} ·{" "}
                          {p.count} tickets
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </Space>
            </Card>
          </Col>

          {/* Stock crítico + movimientos de stock */}
          <Col xs={24} lg={14}>
            <Card
              hoverable
              bordered={false}
              title={
                <Space>
                  <StockOutlined
                    style={{ color: beachColors.sunset, fontSize: 16 }}
                  />
                  <Text
                    style={{
                      fontWeight: 600,
                      color: neutrals.textMain,
                      fontSize: 14,
                    }}
                  >
                    Stock y movimientos de tienda
                  </Text>
                </Space>
              }
              style={sectionCardStyle}
              bodyStyle={sectionBodyBase}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                {/* Stock crítico */}
                <div>
                  <Text
                    strong
                    style={{
                      fontSize: 11,
                      color: neutrals.textMain,
                    }}
                  >
                    Productos en stock crítico
                  </Text>
                  {lowStock.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      No hay productos en nivel crítico de stock.
                    </Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={lowStock}
                      split={false}
                      style={{ marginTop: 6 }}
                      renderItem={(p) => (
                        <List.Item
                          style={{
                            padding: "4px 0",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                          }}
                        >
                          <span style={{ color: neutrals.textMain }}>
                            {p.name}{" "}
                            <Text
                              type="secondary"
                              style={{ fontSize: 10 }}
                            >
                              · {p.site}
                            </Text>
                          </span>
                          <Space size={6}>
                            <Text
                              style={{
                                fontSize: 10,
                                color: "#b91c1c",
                              }}
                            >
                              {p.stock}/{p.minStock}
                            </Text>
                            <Tag
                              color="error"
                              style={{
                                borderRadius: 999,
                                fontSize: 9,
                                padding: "0 8px",
                              }}
                            >
                              Bajo stock
                            </Tag>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </div>

                {/* Movimientos recientes */}
                <div>
                  <Text
                    strong
                    style={{
                      fontSize: 11,
                      color: neutrals.textMain,
                    }}
                  >
                    Últimos movimientos de stock
                  </Text>
                  {recentMovements.length === 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Aún no hay movimientos registrados en este período.
                    </Text>
                  ) : (
                    <List
                      size="small"
                      dataSource={recentMovements}
                      split={false}
                      style={{ marginTop: 6 }}
                      renderItem={(m) => (
                        <List.Item
                          style={{
                            padding: "4px 2px",
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                          }}
                        >
                          <div>
                            <Text style={{ color: neutrals.textMain }}>
                              {m.productName}
                            </Text>
                            <Text
                              type="secondary"
                              style={{ fontSize: 10, marginLeft: 4 }}
                            >
                              · {m.site}
                            </Text>
                            {m.reason && (
                              <Text
                                type="secondary"
                                style={{
                                  fontSize: 10,
                                  display: "block",
                                }}
                              >
                                {m.reason}
                              </Text>
                            )}
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              minWidth: 80,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                color:
                                  m.delta >= 0 ? "#15803d" : "#b91c1c",
                              }}
                            >
                              {m.type === "sale"
                                ? "Venta"
                                : m.type === "restock"
                                ? "Entrada"
                                : "Ajuste"}
                              {" · "}
                              {m.delta > 0 ? "+" : ""}
                              {m.delta}
                            </Text>
                            <Text
                              type="secondary"
                              style={{
                                fontSize: 9,
                                display: "block",
                              }}
                            >
                              {formatShortDate(m.createdAt)}
                            </Text>
                          </div>
                        </List.Item>
                      )}
                    />
                  )}
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default DashboardView;
