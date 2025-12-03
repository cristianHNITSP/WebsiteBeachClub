import { useMediaQuery } from "react-responsive";
import { useState, useEffect } from "react";
import { wsManager } from "./api/websocket-manager";
import { habitacionesAPI } from "./api/habitaciones";

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

const treeData = [
  {
    title: (
      <Flex align="center" gap={8}>
        <HomeOutlined style={{ color: beachColors.turquoise }} />
        <b>Tipo de alojamiento</b>
      </Flex>
    ),
    key: "1",
    children: ["Habitación", "Suite", "Cabaña", "Villa"].map((t, i) => ({
      title: t,
      key: `1-${i + 1}`,
    })),
  },
  {
    title: (
      <Flex align="center" gap={8}>
        <GiftOutlined style={{ color: beachColors.coral }} />
        <b>Servicios</b>
      </Flex>
    ),
    key: "2",
    children: ["WiFi", "Piscina", "Estacionamiento", "Spa", "Pet Friendly"].map((t, i) => ({
      title: t,
      key: `2-${i + 1}`,
    })),
  },
  {
    title: (
      <Flex align="center" gap={8}>
        <CompassOutlined style={{ color: beachColors.sunset }} />
        <b>Ubicación</b>
      </Flex>
    ),
    key: "3",
    children: ["Playa", "Centro", "Montaña", "Selva"].map((t, i) => ({
      title: t,
      key: `3-${i + 1}`,
    })),
  },
];

const recommendedDestinations = [
  {
    name: "Tulum",
    desc: "Playas de ensueño, cenotes y gastronomía local.",
    img: "https://lp-cms-production.imgix.net/2024-08/PlayaRuinasTulum.jpg?auto=format,compress&q=72&fit=crop&w=1200",
  },
];

function App({ currentUser }) {
  const [openBuscadorMovil, setOpenBuscadorMovil] = useState(false);
  const [openFiltrosMovil, setOpenFiltrosMovil] = useState(false);
  const [openChat, setOpenChat] = useState(false);

  const isMobile = useMediaQuery({ maxWidth: 1024 });

  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(true);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Habitación activa (solo para contexto del chat)
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);

  // 🔌 WebSocket - Conexión centralizada
  useEffect(() => {
    // Conectar al servicio de reservas
    const socket = wsManager.connect("reservas");

    // Listeners de habitaciones
    wsManager.on("reservas", "habitaciones:init", (data) => {
      if (Array.isArray(data)) {
        setHabitaciones(data);
        setLoadingHabitaciones(false);
      }
    });

    wsManager.on("reservas", "habitaciones:created", (room) => {
      if (!room || !room._id) return;
      setHabitaciones((prev) => {
        const exists = prev.some((h) => h._id === room._id);
        if (exists) return prev;
        return [room, ...prev];
      });
    });

    wsManager.on("reservas", "habitaciones:updated", (room) => {
      if (!room || !room._id) return;
      setHabitaciones((prev) => prev.map((h) => (h._id === room._id ? { ...h, ...room } : h)));
    });

    wsManager.on("reservas", "habitaciones:deleted", (payload) => {
      const deleteId = payload?._id || payload?.id;
      if (!deleteId) return;
      setHabitaciones((prev) => prev.filter((h) => h._id !== deleteId));
    });

    wsManager.on("reservas", "habitaciones:error", (payload) => {
      console.error("WS habitaciones:error", payload);
      messageApi.error(payload?.message || "Ocurrió un error en tiempo real.");
    });

    wsManager.on("reservas", "habitaciones:trashed", (payload) => {
      const id = payload?._id || payload?.id;
      if (!id) return;
      setHabitaciones((prev) => prev.filter((h) => h._id !== id));
    });

    wsManager.on("reservas", "habitaciones:deleted_permanent", (payload) => {
      const id = payload?._id || payload?.id;
      if (!id) return;
      setHabitaciones((prev) => prev.filter((h) => h._id !== id));
    });

    return () => {
      wsManager.off("reservas", "habitaciones:init");
      wsManager.off("reservas", "habitaciones:created");
      wsManager.off("reservas", "habitaciones:updated");
      wsManager.off("reservas", "habitaciones:deleted");
      wsManager.off("reservas", "habitaciones:error");
      wsManager.off("reservas", "habitaciones:trashed");
      wsManager.off("reservas", "habitaciones:deleted_permanent");
    };
  }, [messageApi]);

  // HTTP paginado - Usar API centralizada
  const cargarHabitaciones = async (page = 1, showToast = false) => {
    try {
      setLoadingHabitaciones(true);
      setError(null);

      const limit = pagination.limit || 5;

      const payload = await habitacionesAPI.fetchPublicHabitaciones(page, limit);

      const items = Array.isArray(payload.items) ? payload.items : [];

      setHabitaciones(items);
      setPagination({
        page: payload.page || page,
        limit: payload.limit || limit,
        total: payload.total || items.length,
        totalPages: payload.totalPages || 1,
        hasMore: !!payload.hasMore,
      });

      setLoadingHabitaciones(false);

      if (showToast) {
        messageApi.success("Habitaciones sincronizadas correctamente.");
      }
    } catch (err) {
      console.error("Error al cargar las habitaciones:", err);
      setHabitaciones([]);
      setError(err);
      setLoadingHabitaciones(false);
      setPagination((prev) => ({ ...prev, total: 0, totalPages: 0, hasMore: false }));

      if (showToast) {
        messageApi.error("No se pudo sincronizar. Revisa la conexión.");
      }
    }
  };

  useEffect(() => {
    cargarHabitaciones(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      messageApi.open({
        type: "error",
        content: "Error al cargar las habitaciones. Intenta más tarde.",
      });
    }
  }, [error, messageApi]);

  const handleChangePageHabitaciones = (page) => {
    cargarHabitaciones(page, false);
  };

  // ✅ NUEVO: “Solicitar reserva” solo abre chat (no toca backend)
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

  // ✅ Cierre de chat con habitación: ahora solo limpia UI
  const handleChatClosedForReserva = async () => {
    setHabitacionSeleccionada(null);
    setOpenChat(false);
  };

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

  const cardsToShow = Array.isArray(habitaciones) ? habitaciones : [];

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
                  minWidth: 520,
                  padding: "10px 14px",
                  borderRadius: 18,
                  background: "rgba(15,23,42,0.18)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 4px 12px rgba(15,23,42,0.35)",
                }}
              >
                <Input
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
                  style={{ width: 230, borderRadius: 10, height: 40 }}
                  format="DD/MM/YYYY"
                  defaultValue={[dayjs(), dayjs().add(2, "day")]}
                />
                <Select defaultValue="2 adultos" style={{ width: 150, borderRadius: 10, height: 40 }}>
                  <Option value="1">1 adulto</Option>
                  <Option value="2">2 adultos</Option>
                  <Option value="3">3 adultos</Option>
                  <Option value="4">Familia</Option>
                </Select>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
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
                  href="/panel.web/login.panel.web"
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
          <BuscadorMovil beachColors={beachColors} open={openBuscadorMovil} onclose={() => setOpenBuscadorMovil(false)} />

          <Drawer
            title="Filtrar tu estancia"
            placement="right"
            width={280}
            open={openFiltrosMovil}
            onClose={() => setOpenFiltrosMovil(false)}
          >
            <Flex vertical gap={16}>
              <Tree checkable defaultExpandAll treeData={treeData} />
              <div>
                <Text strong>Precio por noche</Text>
                <div
                  style={{
                    background: beachColors.turquoise,
                    height: 4,
                    borderRadius: 999,
                    marginTop: 10,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: -6,
                      left: "18%",
                      right: "22%",
                      height: 16,
                      background: beachColors.deepBlue,
                      borderRadius: 999,
                    }}
                  />
                </div>
                <Flex justify="space-between" style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 11 }}>$800</Text>
                  <Text style={{ fontSize: 11 }}>$3,200</Text>
                </Flex>
              </div>
              <Button
                type="primary"
                block
                icon={<FilterOutlined />}
                style={{ borderRadius: 10, background: beachColors.teal, borderColor: beachColors.teal }}
                onClick={() => setOpenFiltrosMovil(false)}
              >
                Aplicar filtros
              </Button>
            </Flex>
          </Drawer>

          {isMobile && (
            <FloatButton.Group shape="circle" style={{ right: 18, bottom: 90 }} icon={<CommentOutlined />}>
              <FloatButton icon={<CustomerServiceOutlined />} onClick={() => setOpenChat(true)} />
            </FloatButton.Group>
          )}

          <Splitter layout={isMobile ? "vertical" : "horizontal"} style={{ height: isMobile ? "auto" : "calc(100vh - 160px)", border: "none" }}>
            {!isMobile && (
              <Splitter.Panel defaultSize="20%" min="18%" max="22%" style={panelStyles.left}>
                <Flex vertical style={{ padding: 14, gap: 16 }}>
                  <Flex align="center" gap={8}>
                    <FilterOutlined style={{ color: beachColors.deepBlue }} />
                    <Title level={4} style={{ margin: 0, color: beachColors.deepBlue, fontSize: 16 }}>
                      Filtros
                    </Title>
                  </Flex>
                  <Tree checkable defaultExpandAll treeData={treeData} style={{ fontSize: 12 }} />
                  <div>
                    <Text strong>Precio por noche</Text>
                    <div style={{ background: "#e5e7eb", height: 4, borderRadius: 999, marginTop: 10, position: "relative" }}>
                      <div style={{ position: "absolute", top: -6, left: "20%", right: "23%", height: 16, background: beachColors.teal, borderRadius: 999 }} />
                    </div>
                    <Flex justify="space-between" style={{ marginTop: 6, fontSize: 11 }}>
                      <span>$800</span>
                      <span>$3,200</span>
                    </Flex>
                  </div>
                </Flex>
              </Splitter.Panel>
            )}

            <Splitter.Panel defaultSize={isMobile ? "100%" : "55%"} min={isMobile ? "100%" : "50%"} style={panelStyles.center}>
              <Flex vertical gap={18} style={{ maxWidth: 900, margin: "0 auto" }}>
                <HeroCarousel currentUser={currentUser} />

                <Flex justify="space-between" align="center" wrap gap={8} style={{ marginTop: 4 }}>
                  <Flex gap={6} align="center">
                    <Title level={4} style={{ margin: 0, fontSize: 18, color: "#0f172a", fontWeight: 600 }}>
                      Alojamientos disponibles
                    </Title>
                  </Flex>

                  <Space size={6} align="center">
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => cargarHabitaciones(pagination.page, true)}
                      style={{ borderRadius: 999, fontSize: 10 }}
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

                <RoomCards
                  beachColors={beachColors}
                  cardsData={cardsToShow}
                  loading={loadingHabitaciones}
                  onReservaExpress={handleReservaExpress}
                  onInfoWhatsapp={handleInfoWhatsapp}
                  pagination={pagination}
                  onPageChange={handleChangePageHabitaciones}
                />
              </Flex>
            </Splitter.Panel>

            {!isMobile && (
              <Splitter.Panel defaultSize="25%" min="20%" max="32%" style={panelStyles.right}>
                <Flex vertical gap={12}>
                  <Recommendcards recommendedDestinations={recommendedDestinations} beachColors={beachColors} loading={false} />
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
