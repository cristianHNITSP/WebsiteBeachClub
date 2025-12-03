// src/views/DashboardView.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  Card,
  Row,
  Col,
  List,
  Space,
  Statistic,
  Tag,
  Badge,
  Tooltip,
  Typography,
} from "antd";
import {
  ThunderboltOutlined,
  CheckCircleTwoTone,
  WarningTwoTone,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";
import { initSocket } from "../api/websockets/index"; // <-- ajusta path si tu archivo está en otra ruta

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

// Promos (no hay endpoint en lo que pegaste, así que quedan estáticas)
const promos = [
  { nombre: "Hotel Beach Club #25", canal: "Email", fecha: "20/04/2025" },
  { nombre: "Pool Weekend Promo", canal: "WhatsApp", fecha: "18/04/2025" },
  { nombre: "Family Spring Offer", canal: "Facebook Ads", fecha: "10/04/2025" },
];

const DashboardView = ({ isMobile }) => {
  const [loading, setLoading] = useState(true);

  // Resumen real
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

  // Notificaciones (Socket.IO)
  const [notificaciones, setNotificaciones] = useState([
    { tipo: "success", texto: "Conectando a tiempo real…" },
  ]);

  const socketRef = useRef(null);

  const apiBase = useMemo(() => {
    // Si tienes un env, úsalo. Si no, queda relativo (sirve con proxy/gateway).
    return import.meta.env.VITE_RESERVAS_API_URL || "";
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

        // 2) Disponibilidad por habitaciones (incluye available/blockedByBooking/reservableByStatus)
        const roomsAvailReq = axios.get(`${apiBase}/api/reservas/habitaciones`, {
          withCredentials: true,
          params: { startDate: hoyStr, endDate: hoyStr },
        });

        // 3) Total habitaciones (incluyendo papelera) y total papelera — usando SOLO tu /gestor.admin
        const totalAllReq = axios.get(`${apiBase}/api/habitaciones/gestor.admin`, {
          withCredentials: true,
          params: { papelera: "todas", page: 1, limit: 1 },
        });

        const trashedReq = axios.get(`${apiBase}/api/habitaciones/gestor.admin`, {
          withCredentials: true,
          params: { papelera: "solo", page: 1, limit: 1 },
        });

        const [reservasRes, roomsAvailRes, totalAllRes, trashedRes] =
          await Promise.all([reservasReq, roomsAvailReq, totalAllReq, trashedReq]);

        if (!alive) return;

        const reservas = Array.isArray(reservasRes.data?.data) ? reservasRes.data.data : [];
        const habitaciones = Array.isArray(roomsAvailRes.data?.data) ? roomsAvailRes.data.data : [];

        const totalRoomsAll = Number(totalAllRes.data?.total ?? 0) || 0;
        const trashedCount = Number(trashedRes.data?.total ?? 0) || 0;

        // Reservas activas hoy
        const reservasActivasHoy = reservas.length;

        // Checkins previstos hoy: startDate==hoy y sin checkinAt
        const checkinsPrevistos = reservas.filter(
          (r) => r?.startDate === hoyStr && !r?.checkinAt && !r?.checkoutAt && !r?.isDeleted
        ).length;

        // Conteos de disponibilidad (solo NO papelera porque /reservas/habitaciones filtra isDeleted:false)
        const occupied = habitaciones.filter((x) => x?.blockedByBooking === true).length;
        const available = habitaciones.filter((x) => x?.available === true).length;
        const unreservable = habitaciones.filter((x) => x?.reservableByStatus === false).length;

        // Ocupación % (sobre habitaciones "operables": ocupadas+disponibles)
        const operables = occupied + available;
        const ocupacion = operables > 0 ? Math.round((occupied / operables) * 100) : 0;

        // Ingresos estimados HOY:
        // prorrateo del total entre días (billing.total / billing.days) solo de reservas activas hoy
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
      } catch (e) {
        console.error("[Dashboard] Error cargando datos:", e);
        if (!alive) return;

        setNotificaciones((prev) => [
          { tipo: "warning", texto: "No se pudo cargar el resumen (revisa permisos / sesión)." },
          ...prev.filter((x) => x.texto !== "Conectando a tiempo real…"),
        ]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      alive = false;
    };
  }, [apiBase]);

  // Socket.IO: escuchamos solo eventos que YA emites en habitaciones.routes.js
  useEffect(() => {
    const s = initSocket();
    socketRef.current = s;

    const push = (tipo, texto) => {
      setNotificaciones((prev) => {
        const next = [{ tipo, texto }, ...prev.filter((x) => x.texto !== "Conectando a tiempo real…")];
        return next.slice(0, 6);
      });
    };

    const onConnect = () => push("success", "Tiempo real conectado.");
    const onDisconnect = () => push("warning", "Tiempo real desconectado.");

    const onRoomCreated = (room) => push("success", `Habitación creada · ${room?.title || room?.codigo || "Nueva"}`);
    const onRoomUpdated = (room) => push("success", `Habitación actualizada · ${room?.title || room?.codigo || "—"}`);
    const onRoomTrashed = (payload) => push("warning", `Habitación enviada a papelera · ${payload?._id || "—"}`);
    const onRoomRestored = (room) => push("success", `Habitación restaurada · ${room?.title || room?.codigo || "—"}`);
    const onRoomDeleted = (payload) => push("warning", `Habitación eliminada permanente · ${payload?._id || "—"}`);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    s.on("habitaciones:created", onRoomCreated);
    s.on("habitaciones:updated", onRoomUpdated);
    s.on("habitaciones:trashed", onRoomTrashed);
    s.on("habitaciones:restored", onRoomRestored);
    s.on("habitaciones:deleted_permanent", onRoomDeleted);

    return () => {
      try {
        s.off("connect", onConnect);
        s.off("disconnect", onDisconnect);

        s.off("habitaciones:created", onRoomCreated);
        s.off("habitaciones:updated", onRoomUpdated);
        s.off("habitaciones:trashed", onRoomTrashed);
        s.off("habitaciones:restored", onRoomRestored);
        s.off("habitaciones:deleted_permanent", onRoomDeleted);
      } catch (_) {
        // ignore
      }
    };
  }, []);

  const disponibilidad = useMemo(() => {
    const total = disp.totalRooms || 0;
    const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

    return [
      { label: "Ocupadas", porcentaje: pct(disp.occupied), color: beachColors.oceanBlue },
      { label: "Disponibles", porcentaje: pct(disp.available), color: beachColors.teal },
      { label: "No reservables", porcentaje: pct(disp.unreservable), color: beachColors.sunset },
      { label: "Papelera", porcentaje: pct(disp.trashed), color: "#9ca3af" },
    ];
  }, [disp]);

  return (
    <>
      {/* Resumen + Promos */}
      <Row gutter={[16, 16]}>
        {/* Resumen de Hoy */}
        <Col xs={24} md={10}>
          <Card
            hoverable
            bordered={false}
            style={{
              borderRadius: 16,
              background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
              boxShadow: "0 12px 26px rgba(15,23,42,0.20)",
            }}
            bodyStyle={{ padding: isMobile ? 16 : 20 }}
          >
            <Space direction="vertical" size={8} style={{ width: "100%", color: "#fff" }}>
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
                  margin: 0,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: isMobile ? 20 : 24,
                }}
              >
                Hotel Beach Club
              </Title>

              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: "#e5e7eb", fontSize: 11 }}>Reservas activas hoy</Text>}
                    value={hoy.reservas}
                    valueStyle={{
                      color: "#fff",
                      fontSize: isMobile ? 24 : 30,
                      fontWeight: 700,
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: "#e5e7eb", fontSize: 11 }}>Check-ins previstos hoy</Text>}
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
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: "#e5e7eb", fontSize: 10 }}>Ocupación (operables)</Text>}
                    value={hoy.ocupacion}
                    suffix="%"
                    valueStyle={{
                      color: beachColors.sand,
                      fontSize: isMobile ? 16 : 20,
                      fontWeight: 600,
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<Text style={{ color: "#e5e7eb", fontSize: 10 }}>Ingreso estimado hoy</Text>}
                    prefix="$"
                    value={hoy.ingresos}
                    precision={2}
                    valueStyle={{
                      color: "#fff",
                      fontSize: isMobile ? 16 : 18,
                      fontWeight: 500,
                    }}
                  />
                </Col>
              </Row>

              <Space size={8} wrap style={{ marginTop: 4 }}>
                <Tag color="rgba(255,255,255,0.18)" style={{ border: "none", color: "#fff", borderRadius: 999, fontSize: 11 }}>
                  Total habitaciones: {disp.totalRooms || 0}
                </Tag>
                <Tag color="rgba(255,255,255,0.18)" style={{ border: "none", color: "#fff", borderRadius: 999, fontSize: 11 }}>
                  Papelera: {disp.trashed || 0}
                </Tag>
              </Space>
            </Space>
          </Card>
        </Col>

        {/* Últimas promociones */}
        <Col xs={24} md={14}>
          <Card
            hoverable
            bordered={false}
            title={
              <Text style={{ fontWeight: 600, color: neutrals.textMain, fontSize: 15 }}>
                Últimas promociones enviadas
              </Text>
            }
            extra={
              <Text style={{ padding: 0, fontSize: 12, color: beachColors.oceanBlue, cursor: "pointer" }}>
                Ver historial
              </Text>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.08)",
            }}
            bodyStyle={{ padding: isMobile ? 8 : 10 }}
          >
            <List
              itemLayout="horizontal"
              dataSource={promos}
              split={false}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    padding: "6px 8px",
                    marginBottom: 2,
                    borderRadius: 10,
                    background: index === 0 ? "rgba(46,196,182,0.04)" : "transparent",
                  }}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontWeight: 500, color: neutrals.textMain, fontSize: 13 }}>{item.nombre}</Text>}
                    description={
                      <Space size={10}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.canal}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>{item.fecha}</Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Disponibilidad + Notificaciones */}
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {/* Disponibilidad */}
        <Col xs={24} md={14}>
          <Card
            hoverable
            bordered={false}
            title={
              <Space size={8} wrap>
                <Text style={{ fontWeight: 600, color: neutrals.textMain, fontSize: 15 }}>
                  Disponibilidad de habitaciones
                </Text>
                <Tag
                  color={beachColors.turquoise}
                  style={{ borderRadius: 999, fontSize: 10, color: "#064e3b" }}
                >
                  Ocupación {hoy.ocupacion}%
                </Tag>
              </Space>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
            bodyStyle={{ padding: isMobile ? 12 : 16, paddingTop: 10 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: isMobile ? 14 : 24,
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
                      width: isMobile ? 22 : 32,
                      height: (item.porcentaje / 100) * (isMobile ? 90 : 120),
                      borderRadius: 10,
                      background: item.color,
                    }}
                  />
                  <Text style={{ fontSize: 10, color: neutrals.textMuted }}>{item.label}</Text>
                  <Text style={{ fontSize: 9, color: neutrals.textMuted }}>{item.porcentaje}%</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* Notificaciones (Socket.IO) */}
        <Col xs={24} md={10}>
          <Card
            hoverable
            bordered={false}
            title={
              <Space size={8} wrap>
                <Text style={{ fontWeight: 600, color: neutrals.textMain, fontSize: 15 }}>
                  Notificaciones en tiempo real
                </Text>
                <Badge
                  color={beachColors.teal}
                  text={
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: beachColors.teal,
                        textTransform: "uppercase",
                      }}
                    >
                      Live
                    </span>
                  }
                />
              </Space>
            }
            extra={
              <Tooltip title="Actualizado por Socket.IO (habitaciones: created/updated/trashed/restored)">
                <ThunderboltOutlined style={{ color: beachColors.sunset, fontSize: 16 }} />
              </Tooltip>
            }
            style={{
              borderRadius: 16,
              background: "#fff",
              boxShadow: "0 8px 18px rgba(15,23,42,0.06)",
            }}
            bodyStyle={{ padding: isMobile ? 8 : 10 }}
          >
            <List
              size="small"
              dataSource={notificaciones}
              split={false}
              renderItem={(n, index) => (
                <List.Item
                  style={{
                    padding: "6px 6px",
                    marginBottom: index === notificaciones.length - 1 ? 0 : 4,
                    borderRadius: 8,
                    background:
                      n.tipo === "warning"
                        ? "rgba(245,158,11,0.06)"
                        : "rgba(14,165,233,0.03)",
                  }}
                >
                  <Space align="start" size={10}>
                    {n.tipo === "warning" ? (
                      <WarningTwoTone twoToneColor={beachColors.sunset} />
                    ) : (
                      <CheckCircleTwoTone twoToneColor={beachColors.teal} />
                    )}
                    <Text
                      style={{
                        fontSize: 11,
                        color: n.tipo === "warning" ? neutrals.textMain : neutrals.textMuted,
                      }}
                    >
                      {n.texto}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardView;
