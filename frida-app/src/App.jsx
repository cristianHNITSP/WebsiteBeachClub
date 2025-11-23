// src/App.jsx
import axios from "axios";
import { useMediaQuery } from "react-responsive";
import { useState, useEffect, useRef } from "react";

import {
  ConfigProvider,
  Button,
  Card,
  Flex,
  Input,
  Space,
  Splitter,
  Typography,
  Carousel,
  Tree,
  Select,
  message,
  FloatButton,
  DatePicker,
  Drawer,
  Tag,
  Skeleton,
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
  StarFilled,
  HeartOutlined,
  CustomerServiceOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";

import RoomCards from "./components/RoomCards.jsx";
import Recommendcards from "./components/RecommendCards.jsx";
import BuscadorMovil from "./components/BuscadorMovil.jsx";
import ChatSoporte from "./components/ChatSoporte.jsx";
import { beachColors } from "./theme/beachTheme";

const { Title, Text } = Typography;
const { Option } = Select;

const backgroundColor = "#f8fafc";
const borderColor = "#e2e8f0";

const carruselImages = [
  {
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200",
    title: "Escápate frente al mar",
    subtitle: "Alojamientos seleccionados para disfrutar como en casa.",
  },
  {
    img: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200",
    title: "Cabañas con encanto",
    subtitle: "Naturaleza, diseño y comodidad en un solo lugar.",
  },
  {
    img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200",
    title: "Experiencias inolvidables",
    subtitle: "Reserva directo con quienes te atienden de verdad.",
  },
];

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
      // aquí podrías luego mapear filtros reales
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

function App() {
  const [openBuscadorMovil, setOpenBuscadorMovil] = useState(false);
  const [openFiltrosMovil, setOpenFiltrosMovil] = useState(false);
  const [openChat, setOpenChat] = useState(false);

  const isMobile = useMediaQuery({ maxWidth: 1024 });

  // HABITACIONES / API
  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(true);
  const [error, setError] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  // HERO
  const [loadingHero, setLoadingHero] = useState(true);

  // SSE reservado (si lo activas de nuevo)
  const [sseConnected] = useState(false);
  const [reconnectAttempts] = useState(0);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  const MAX_RECONNECT_ATTEMPTS = 8;
  const INITIAL_RECONNECT_DELAY = 1000;
  const MAX_RECONNECT_DELAY = 30000;

  // Cargar habitaciones
  const cargarHabitaciones = async (showToast = false) => {
    try {
      setLoadingHabitaciones(true);
      setError(null);

      const response = await axios.get("/api/habitaciones");
      const data = response.data || [];

      if (Array.isArray(data) && data.length > 0) {
        setHabitaciones(data);
        setLoadingHabitaciones(false);
        if (showToast) {
          messageApi.success("Habitaciones sincronizadas correctamente.");
        }
      } else {
        setHabitaciones([]);
        setLoadingHabitaciones(true);
        if (showToast) {
          messageApi.warning(
            "No se recibieron habitaciones. Esperando datos del sistema..."
          );
        }
      }
    } catch (err) {
      console.error("Error al cargar las habitaciones:", err);
      setHabitaciones([]);
      setError(err);
      setLoadingHabitaciones(true);
      if (showToast) {
        messageApi.error(
          "No se pudo sincronizar. Revisa la conexión o inténtalo de nuevo."
        );
      }
    }
  };

  useEffect(() => {
    cargarHabitaciones(false);
  }, []);


    /*
    
      const actualizarHabitaciones = useCallback((evento) => {
        console.log("📥 Evento SSE procesado:", evento);
    
        setHabitaciones(prev => {
          const { type, habitacion } = evento;
    
          // 🆔 OBTENER ID DE FORMA SEGURA
          const habitacionId = habitacion?.id || habitacion?._id;
          if (!habitacionId) {
            console.error("❌ Evento sin ID válido:", evento);
            return prev;
          }
    
          switch (type) {
            case 'CREATED':
              // 🔍 VERIFICAR DUPLICADOS
              const existe = prev.some(h =>
                h.id === habitacionId || h._id === habitacionId
              );
              if (existe) {
                console.log("⚠️ Habitación ya existe, actualizando:", habitacionId);
                return prev.map(h =>
                  (h.id === habitacionId || h._id === habitacionId) ? habitacion : h
                );
              }
              console.log("🆕 Nueva habitación creada:", habitacionId);
              return [...prev, habitacion];
    
            case 'UPDATED':
              console.log("🔄 Habitación actualizada:", habitacionId);
              return prev.map(h =>
                (h.id === habitacionId || h._id === habitacionId) ? habitacion : h
              );
    
            case 'DELETED':
              console.log("🗑️ Habitación eliminada:", habitacionId);
              return prev.filter(h =>
                (h.id !== habitacionId) && (h._id !== habitacionId)
              );
    
            default:
              console.warn("❓ Tipo de evento no reconocido:", type);
              return prev;
          }
        });
      }, []);
    
      const conectarSSE = useCallback(() => {
        try {
          // Limpieza de conexiones existentes
          if (eventSourceRef.current) {
            console.log("🔌 Cerrando conexión SSE anterior");
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
    
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
    
          console.log(`🔗 Intento de conexión SSE #${reconnectAttempts + 1}`);
    
          // 🎯 CREAR NUEVA CONEXIÓN SSE
          eventSourceRef.current = new EventSource('/api/events/habitaciones');
    
          // ✅ CONEXIÓN EXITOSA
          eventSourceRef.current.onopen = () => {
            console.log("✅ Conexión SSE establecida");
            setSseConnected(true);
            setReconnectAttempts(0); // Resetear contador al conectar
            setError(null);
    
            // Mostrar mensaje de éxito solo en la primera conexión
            if (reconnectAttempts === 0) {
              messageApi.success({
                content: "Conectado en tiempo real",
                duration: 2,
              });
            } else {
              messageApi.success({
                content: `Conexión restaurada después de ${reconnectAttempts} intentos`,
                duration: 2,
              });
            }
          };
    
          // 📨 MANEJAR MENSAJES GENÉRICOS
          eventSourceRef.current.onmessage = (event) => {
            try {
              const eventData = JSON.parse(event.data);
              console.log("📨 Mensaje SSE recibido:", eventData);
              actualizarHabitaciones(eventData);
            } catch (parseError) {
              console.error("❌ Error parseando mensaje SSE:", parseError);
            }
          };
    
          // 🎯 MANEJAR EVENTOS ESPECÍFICOS
          const manejarEvento = (eventType) => (event) => {
            try {
              const eventData = JSON.parse(event.data);
              console.log(`🎯 Evento ${eventType} recibido:`, eventData);
              actualizarHabitaciones({ ...eventData, type: eventType.toUpperCase() });
            } catch (parseError) {
              console.error(`❌ Error parseando evento ${eventType}:`, parseError);
            }
          };
    
          eventSourceRef.current.addEventListener('created', manejarEvento('CREATED'));
          eventSourceRef.current.addEventListener('updated', manejarEvento('UPDATED'));
          eventSourceRef.current.addEventListener('deleted', manejarEvento('DELETED'));
    
          // ❌ MANEJAR ERRORES CON RECONEXIÓN INTELIGENTE
          eventSourceRef.current.onerror = (error) => {
            console.error("❌ Error en conexión SSE:", error);
            setSseConnected(false);
    
            const nextAttempt = reconnectAttempts + 1;
    
            // 🚨 VERIFICAR SI SUPERAMOS EL LÍMITE DE INTENTOS
            if (nextAttempt > MAX_RECONNECT_ATTEMPTS) {
              console.error("🚫 Máximo de intentos de reconexión alcanzado");
              setError(new Error("No se pudo establecer conexión en tiempo real"));
              messageApi.warning({
                content: "Modo sin conexión en tiempo real. Los cambios pueden no ser inmediatos.",
                duration: 5,
              });
              return;
            }
    
            // 🎰 CALCULAR DELAY CON BACKOFF EXPONENCIAL
            const delay = Math.min(
              INITIAL_RECONNECT_DELAY * Math.pow(1.8, nextAttempt), // Crecimiento exponencial
              MAX_RECONNECT_DELAY // No superar el máximo
            );
    
            console.log(`🔄 Reintento #${nextAttempt} en ${delay / 1000} segundos...`);
    
            // Mostrar mensaje informativo al usuario
            if (nextAttempt <= 3) {
              messageApi.info({
                content: `Reconectando... Intento ${nextAttempt}/${MAX_RECONNECT_ATTEMPTS}`,
                duration: 3,
              });
            }
    
            // ⏰ PROGRAMAR RECONEXIÓN
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 Ejecutando reconexión #${nextAttempt}`);
              setReconnectAttempts(nextAttempt);
              conectarSSE();
            }, delay);
          };
    
        } catch (sseError) {
          console.error("❌ Error crítico al crear EventSource:", sseError);
          setSseConnected(false);
    
          // 🆘 RECONEXIÓN INMEDIATA PARA ERRORES CRÍTICOS
          const nextAttempt = reconnectAttempts + 1;
          if (nextAttempt <= MAX_RECONNECT_ATTEMPTS) {
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(nextAttempt);
              conectarSSE();
            }, 2000);
          }
        }
      }, [actualizarHabitaciones, reconnectAttempts, messageApi]);
    
    
      useEffect(() => {
        console.log("🚀 Iniciando conexión SSE...");
        conectarSSE();
    
        // 🧹 CLEANUP: Limpiar todo al desmontar el componente
        return () => {
          console.log("🧹 Limpiando recursos SSE");
          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          setSseConnected(false);
          setReconnectAttempts(0);
        };
      }, [conectarSSE]);
    
    */


  useEffect(() => {
    if (error) {
      messageApi.open({
        type: "error",
        content:
          "Error al cargar las habitaciones. Por favor, intenta de nuevo más tarde.",
      });
    }
  }, [error, messageApi]);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingHero(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const headerStyle = {
    padding: "10px 16px",
    background: `linear-gradient(120deg, ${beachColors.teal}, ${beachColors.oceanBlue})`,
    boxShadow: "0 4px 18px rgba(15,23,42,0.26)",
    position: "sticky",
    top: 0,
    zIndex: 100,
    borderBottom: `2px solid ${beachColors.turquoise}`,
  };

  const carouselSlide = (slide) => ({
    height: "320px",
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    padding: 24,
    color: "#ffffff",
    backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.82), rgba(15,23,42,0.08)), url(${slide.img})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 14px 40px rgba(15,23,42,0.35)",
  });

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
    Array.isArray(habitaciones) && habitaciones.length > 0
      ? habitaciones
      : [];

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
              <Space size={8}>
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
                tooltip="Chat"
                icon={<CustomerServiceOutlined />}
                onClick={() => setOpenChat(true)}
              />
              <FloatButton
                tooltip="Favoritos"
                icon={<HeartOutlined />}
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
                {/* Hero */}
                <Carousel
                  autoplay
                  dots
                  style={{ width: "100%" }}
                  autoplaySpeed={5500}
                >
                  {carruselImages.map((slide, i) => (
                    <div key={i}>
                      {loadingHero ? (
                        <Card
                          style={{
                            height: 320,
                            background: "#e5e7eb",
                          }}
                        >
                          <Skeleton active paragraph={false} />
                        </Card>
                      ) : (
                        <div style={carouselSlide(slide)}>
                          <div>
                            <Tag
                              color={beachColors.turquoise}
                              style={{
                                borderRadius: 999,
                                fontSize: 10,
                                color: "#065f46",
                                marginBottom: 4,
                              }}
                            >
                              Reservas directas · Mejor atención
                            </Tag>
                            <Title
                              level={3}
                              style={{
                                margin: 0,
                                color: "#ffffff",
                                fontWeight: 600,
                              }}
                            >
                              {slide.title}
                            </Title>
                            <Text
                              style={{
                                fontSize: 12,
                                color: "rgba(241,245,249,0.9)",
                              }}
                            >
                              {slide.subtitle}
                            </Text>
                            <Flex gap={8} style={{ marginTop: 10 }}>
                              <StarFilled
                                style={{
                                  color: beachColors.sunset,
                                  fontSize: 14,
                                }}
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: "#e5e7eb",
                                }}
                              >
                                Opiniones reales, sin intermediarios.
                              </Text>
                            </Flex>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </Carousel>

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
                    <Tag
                      color={beachColors.sand}
                      style={{
                        borderRadius: 999,
                        fontSize: 9,
                        color: beachColors.deepBlue,
                      }}
                    >
                      Selección curada
                    </Tag>
                  </Flex>

                  <Space size={6} align="center">
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => cargarHabitaciones(true)}
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
                            <HeartOutlined
                              style={{ color: beachColors.coral }}
                            />
                          }
                        >
                          Favoritos
                        </Button>
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
                    loading={loadingHero}
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
                      <Text
                        strong
                        style={{ fontSize: 13, color: "#0f172a" }}
                      >
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
              © {new Date().getFullYear()} Beach Club · Plataforma de
              reservas desarrollada a la medida.
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
          onClose={() => setOpenChat(false)}
          isMobile={isMobile}
        />
      </div>
    </ConfigProvider>
  );
}

export default App;
