// src/App.jsx
import axios from "axios";
import { useMediaQuery } from "react-responsive";
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

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

// 🌐 URL del servidor de reservas con WebSocket (puedes moverlo a .env de Vite)
const WS_URL = import.meta.env.VITE_RESERVAS_WS_URL || "http://localhost:4002";

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
    children: ["WiFi", "Piscina", "Estacionamiento", "Spa", "Pet Friendly"].map(
      (t, i) => ({
        title: t,
        key: `2-${i + 1}`,
      })
    ),
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

  // HABITACIONES / API + tiempo real
  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(true);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  // límite de habitaciones por paginación
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 0,
    hasMore: false,
  });

  // Habitación activa (para el chat / reserva express)
  const [habitacionSeleccionada, setHabitacionSeleccionada] = useState(null);

  // 🔌 WebSocket: suscripción en tiempo real a habitaciones
  useEffect(() => {
    const socket = io(WS_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    socket.on("connect", () => {
      console.log("✅ Conectado a WebSocket reservas-service:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("🔌 Desconectado de WebSocket reservas-service");
    });

    // Listado inicial que envía el backend al conectar (normalmente primeras 5)
    socket.on("habitaciones:init", (data) => {
      if (Array.isArray(data)) {
        setHabitaciones(data);
        setLoadingHabitaciones(false);
      }
    });

    // Nueva habitación creada
    socket.on("habitaciones:created", (room) => {
      if (!room || !room._id) return;
      setHabitaciones((prev) => {
        const exists = prev.some((h) => h._id === room._id);
        if (exists) return prev;
        return [...prev, room];
      });
    });

    // Actualización de una habitación (estado, datos, etc.)
    socket.on("habitaciones:updated", (room) => {
      if (!room || !room._id) return;
      setHabitaciones((prev) =>
        prev.map((h) => (h._id === room._id ? { ...h, ...room } : h))
      );
    });

    // Eliminación de habitación
    socket.on("habitaciones:deleted", (payload) => {
      const deleteId = payload?._id || payload?.id;
      if (!deleteId) return;
      setHabitaciones((prev) => prev.filter((h) => h._id !== deleteId));
    });

    // Error desde el servidor de WS
    socket.on("habitaciones:error", (payload) => {
      console.error("WS habitaciones:error", payload);
      messageApi.error(
        payload?.message ||
          "Ocurrió un error en las actualizaciones en tiempo real."
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [messageApi]);

  // Cargar habitaciones vía HTTP (paginado desde el backend)
  const cargarHabitaciones = async (page = 1, showToast = false) => {
    try {
      setLoadingHabitaciones(true);
      setError(null);

      const limit = pagination.limit || 5;

      const response = await axios.get("/api/habitaciones/public", {
        params: { page, limit },
      });

      const payload = response.data || {};
      const items = Array.isArray(payload.items)
        ? payload.items
        : Array.isArray(payload)
        ? payload
        : [];

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
        if (items.length > 0) {
          messageApi.success("Habitaciones sincronizadas correctamente.");
        } else {
          messageApi.warning(
            "No se recibieron habitaciones. Esperando datos del sistema..."
          );
        }
      }
    } catch (err) {
      console.error("Error al cargar las habitaciones:", err);
      setHabitaciones([]);
      setError(err);
      setLoadingHabitaciones(false);
      setPagination((prev) => ({
        ...prev,
        total: 0,
        totalPages: 0,
        hasMore: false,
      }));
      if (showToast) {
        messageApi.error(
          "No se pudo sincronizar. Revisa la conexión o inténtalo de nuevo."
        );
      }
    }
  };

  // Primer carga vía HTTP (por si el WS tarda o falla)
  useEffect(() => {
    cargarHabitaciones(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (error) {
      messageApi.open({
        type: "error",
        content:
          "Error al cargar las habitaciones. Por favor, intenta de nuevo más tarde.",
      });
    }
  }, [error, messageApi]);

  // handler para cambiar de página en la paginación
  const handleChangePageHabitaciones = (page) => {
    cargarHabitaciones(page, false);
  };

  // 🔹 Reserva express: cambia estado a "EN ESPERA" (3) en backend (público) + abre chat
  const handleReservaExpress = async (room) => {
    try {
      messageApi.open({
        key: `reserva-express-${room._id}`,
        type: "loading",
        content: "Iniciando reserva express...",
        duration: 0,
      });

      // 👉 ruta pública que usa req.clientIpHash y pone estadoDeReserva = 3
      const res = await axios.post(
        `/api/habitaciones/${room._id}/reserva-express`
      );

      const updatedRoom = res?.data?.room || res?.data || room;

      setHabitacionSeleccionada(updatedRoom);
      setOpenChat(true);

      messageApi.open({
        key: `reserva-express-${room._id}`,
        type: "success",
        content:
          "Hemos iniciado una reserva express para esta habitación. Nuestro equipo te atenderá en el chat.",
        duration: 3,
      });
      // El estado visual se actualizará por Socket.IO (habitaciones:updated)
    } catch (err) {
      console.error("Error al iniciar reserva express:", err);
      const backendMsg =
        err?.response?.data?.message ||
        "No se pudo iniciar la reserva express. Intenta de nuevo.";
      messageApi.open({
        key: `reserva-express-${room._id}`,
        type: "error",
        content: backendMsg,
        duration: 3,
      });

      // Re-sync por si quedó algo raro
      cargarHabitaciones(pagination.page, false);
    }
  };

  // 🔹 Info por WhatsApp (no toca estado ni IP)
  const handleInfoWhatsapp = (room) => {
    setHabitacionSeleccionada(room);

    const numero = "9993676541"; // <--- Cambia a tu número real de WhatsApp
    const texto = `Hola, me interesa la habitación ${room.codigo || ""} - ${
      room.title || ""
    } en ${room.location || "su propiedad"}. ¿Podrían darme más información?`;

    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // 🔹 Cierre de chat de reserva express:
  //    - POST /reserva-express/cancel → libera y borra hash IP en backend
  const handleChatClosedForReserva = async () => {
    if (!habitacionSeleccionada) {
      setOpenChat(false);
      return;
    }

    const roomId = habitacionSeleccionada._id;

    try {
      await axios.post(
        `/api/habitaciones/${roomId}/reserva-express/cancel`
      );

      messageApi.success(
        "Se liberó la habitación. Está disponible nuevamente para reservar."
      );
      // El cambio nos llegará por `habitaciones:updated` vía socket
    } catch (err) {
      console.error("Error al liberar habitación:", err);
      messageApi.error(
        err?.response?.data?.message ||
          "No se pudo actualizar el estado de la habitación. Inténtalo de nuevo."
      );
    } finally {
      setHabitacionSeleccionada(null);
      setOpenChat(false);
      // Pequeño sync extra por si el socket se pierde
      cargarHabitaciones(pagination.page, false);
    }
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
    left: {
      background: "#f1f5f9",
      borderRight: `1px solid ${borderColor}`,
    },
    center: {
      background: "#ffffff",
      padding: 16,
    },
    right: {
      background: "#f8fafc",
      borderLeft: `1px solid ${borderColor}`,
      padding: 12,
    },
  };

  const cardsToShow =
    Array.isArray(habitaciones) && habitaciones.length > 0 ? habitaciones : [];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: beachColors.oceanBlue,
          colorLink: beachColors.oceanBlue,
          borderRadius: 10,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, system-ui, "SF Pro Text", sans-serif',
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
          <Flex
            justify="space-between"
            align="center"
            gap={16}
            style={{ maxWidth: 1400, margin: "0 auto" }}
          >
            {/* Branding */}
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
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: 0.3,
                  }}
                >
                  Beach Club
                </Title>
                <Text
                  style={{
                    fontSize: 10,
                    color: "rgba(241,245,249,0.9)",
                  }}
                >
                  Reservas directas con un solo clic
                </Text>
              </div>
            </Flex>

            {/* Buscador Desktop */}
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
                  prefix={
                    <EnvironmentOutlined
                      style={{ color: beachColors.turquoise }}
                    />
                  }
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
                <Select
                  defaultValue="2 adultos"
                  style={{ width: 150, borderRadius: 10, height: 40 }}
                >
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

            {/* Acciones derecha Desktop */}
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

            {/* Mobile: botones */}
            {isMobile && (
              <Space size={8} align="center">
                <Button
                  type="text"
                  icon={<SearchOutlined style={{ color: "#ffffff" }} />}
                  onClick={() => setOpenBuscadorMovil(true)}
                />

                <Button
                  type="text"
                  icon={<MenuOutlined style={{ color: "#ffffff" }} />}
                  onClick={() => setOpenFiltrosMovil(true)}
                />

                {/* Botón Acceso staff en móvil */}
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
          {/* Buscador móvil */}
          <BuscadorMovil
            beachColors={beachColors}
            open={openBuscadorMovil}
            onclose={() => setOpenBuscadorMovil(false)}
          />

          {/* Drawer filtros móvil */}
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
                style={{
                  borderRadius: 10,
                  background: beachColors.teal,
                  borderColor: beachColors.teal,
                }}
                onClick={() => setOpenFiltrosMovil(false)}
              >
                Aplicar filtros
              </Button>
            </Flex>
          </Drawer>

          {/* Float buttons móvil + chat */}
          {isMobile && (
            <FloatButton.Group
              shape="circle"
              style={{ right: 18, bottom: 90 }}
              icon={<CommentOutlined />}
            >
              <FloatButton
                icon={<CustomerServiceOutlined />}
                onClick={() => setOpenChat(true)}
              />
            </FloatButton.Group>
          )}

          {/* Layout principal */}
          <Splitter
            layout={isMobile ? "vertical" : "horizontal"}
            style={{
              height: isMobile ? "auto" : "calc(100vh - 160px)",
              border: "none",
            }}
          >
            {/* Panel Izquierdo: Filtros (desktop) */}
            {!isMobile && (
              <Splitter.Panel
                defaultSize="20%"
                min="18%"
                max="22%"
                style={panelStyles.left}
              >
                <Flex vertical style={{ padding: 14, gap: 16 }}>
                  <Flex align="center" gap={8}>
                    <FilterOutlined style={{ color: beachColors.deepBlue }} />
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        color: beachColors.deepBlue,
                        fontSize: 16,
                      }}
                    >
                      Filtros
                    </Title>
                  </Flex>
                  <Tree
                    checkable
                    defaultExpandAll
                    treeData={treeData}
                    style={{ fontSize: 12 }}
                  />
                  <div>
                    <Text strong>Precio por noche</Text>
                    <div
                      style={{
                        background: "#e5e7eb",
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
                          left: "20%",
                          right: "23%",
                          height: 16,
                          background: beachColors.teal,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <Flex
                      justify="space-between"
                      style={{ marginTop: 6, fontSize: 11 }}
                    >
                      <span>$800</span>
                      <span>$3,200</span>
                    </Flex>
                  </div>
                </Flex>
              </Splitter.Panel>
            )}

            {/* Panel Central */}
            <Splitter.Panel
              defaultSize={isMobile ? "100%" : "55%"}
              min={isMobile ? "100%" : "50%"}
              style={panelStyles.center}
            >
              <Flex
                vertical
                gap={18}
                style={{ maxWidth: 900, margin: "0 auto" }}
              >
                {/* Hero (carrusel desacoplado) */}
                <HeroCarousel currentUser={currentUser} />

                {/* Header resultados + Re-sincronizar */}
                <Flex
                  justify="space-between"
                  align="center"
                  wrap
                  gap={8}
                  style={{ marginTop: 4 }}
                >
                  <Flex gap={6} align="center">
                    <Title
                      level={4}
                      style={{
                        margin: 0,
                        fontSize: 18,
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                    >
                      Alojamientos disponibles
                    </Title>
                  </Flex>

                  <Space size={6} align="center">
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => cargarHabitaciones(pagination.page, true)}
                      style={{
                        borderRadius: 999,
                        fontSize: 10,
                      }}
                    >
                      Re-sincronizar
                    </Button>
                    {!isMobile && (
                      <>
                        <Button
                          size="small"
                          type="text"
                          icon={
                            <CommentOutlined
                              style={{ color: beachColors.teal }}
                            />
                          }
                          onClick={() => setOpenChat(true)}
                        >
                          Asistencia
                        </Button>
                      </>
                    )}
                  </Space>
                </Flex>

                {/* Cards habitaciones */}
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

            {/* Panel Derecho (desktop) */}
            {!isMobile && (
              <Splitter.Panel
                defaultSize="25%"
                min="20%"
                max="32%"
                style={panelStyles.right}
              >
                <Flex vertical gap={12}>
                  <Recommendcards
                    recommendedDestinations={recommendedDestinations}
                    beachColors={beachColors}
                    loading={false}
                  />
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 14,
                      background: "#ffffff",
                      boxShadow: "0 6px 18px rgba(148,163,253,0.16)",
                    }}
                  >
                    <Flex vertical gap={6}>
                      <Text strong style={{ fontSize: 13, color: "#0f172a" }}>
                        ¿Por qué reservar aquí?
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                        }}
                      >
                        Información directa, trato cercano y alojamientos
                        seleccionados especialmente para tus huéspedes.
                      </Text>
                      <Flex gap={6} wrap>
                        <Tag
                          color={beachColors.teal}
                          style={{
                            borderRadius: 999,
                            fontSize: 9,
                            color: "#064e3b",
                          }}
                        >
                          Atención personalizada
                        </Tag>
                        <Tag
                          color={beachColors.turquoise}
                          style={{
                            borderRadius: 999,
                            fontSize: 9,
                            color: "#065f46",
                          }}
                        >
                          Reservas seguras
                        </Tag>
                        <Tag
                          color={beachColors.sand}
                          style={{
                            borderRadius: 999,
                            fontSize: 9,
                            color: beachColors.deepBlue,
                          }}
                        >
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
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#eff6ff",
                          }}
                        >
                          ¿Necesitas ayuda con tu reserva?
                        </Text>
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
          <Flex
            vertical
            justify="center"
            align="center"
            gap={10}
            style={{ maxWidth: 900, margin: "0 auto" }}
          >
            <Text
              style={{
                color: "white",
                fontSize: 12,
              }}
            >
              © {new Date().getFullYear()} Beach Club · Plataforma de reservas
              desarrollada a la medida.
            </Text>
            <Flex gap={10} wrap justify="center">
              {[
                { nombre: "Términos", path: "#" },
                { nombre: "Privacidad", path: "#" },
                { nombre: "Contacto", path: "#" },
                { nombre: "Nosotros", path: "#" },
              ].map((link, i) => (
                <a
                  key={i}
                  href={link.path}
                  style={{
                    color: "white",
                    fontSize: 11,
                  }}
                >
                  {link.nombre}
                </a>
              ))}
            </Flex>
          </Flex>
        </footer>

        {/* CHAT (componente desacoplado) */}
        <ChatSoporte
          open={openChat}
          onClose={() => setOpenChat(false)} // caso 2: chat abierto desde "Ayuda", sin cambiar estado
          isMobile={isMobile}
          habitacionSeleccionada={habitacionSeleccionada}
          onFinalizarReserva={handleChatClosedForReserva} // solo se usa si hay habitacionSeleccionada
        />
      </div>
    </ConfigProvider>
  );
}

export default App;
