// src/App.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/es";

import {
  ConfigProvider,
  Layout,
  Menu,
  Typography,
  Button,
  Input,
  DatePicker,
  Select,
  Drawer,
  Card,
  Tag,
  Rate,
  Space,
  Row,
  Col,
  Divider,
  Slider,
  Checkbox,
  Badge,
  Tooltip,
  Modal,
  Steps,
  Form,
  InputNumber,
  Result,
  List,
  Avatar,
  Empty,
  message,
  notification,
  Switch,
  theme as antdTheme,
  FloatButton,
  Pagination,
} from "antd";

import {
  HomeOutlined,
  SearchOutlined,
  CompassOutlined,
  FilterOutlined,
  CalendarOutlined,
  TeamOutlined,
  HeartOutlined,
  HeartFilled,
  EnvironmentOutlined,
  StarFilled,
  SafetyCertificateOutlined,
  WifiOutlined,
  CoffeeOutlined,
  CarOutlined,
  FireOutlined,
  SkinOutlined,
  CreditCardOutlined,
  UserOutlined,
  MoonOutlined,
  SunOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import { beachColors, neutrals } from "./theme/beachTheme";

dayjs.locale("es");
const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const money = (n) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const uid = () => `res_${Date.now()}_${Math.random().toString(16).slice(2)}`;

const AMENITIES = [
  { key: "wifi", label: "Wi-Fi", icon: <WifiOutlined /> },
  { key: "breakfast", label: "Desayuno", icon: <CoffeeOutlined /> },
  { key: "parking", label: "Estacionamiento", icon: <CarOutlined /> },
  { key: "pool", label: "Alberca", icon: <FireOutlined /> },
  { key: "spa", label: "Spa", icon: <SkinOutlined /> },
];

const MOCK_HOTELS = [
  {
    id: "h_1",
    name: "Frida Beach Club Resort",
    city: "Progreso",
    state: "Yucatán",
    rating: 4.7,
    reviews: 812,
    price: 1890,
    tags: ["Frente al mar", "Premium"],
    amenities: ["wifi", "breakfast", "pool", "parking"],
    accent: beachColors.turquoise,
    distanceKm: 0.3,
  },
  {
    id: "h_2",
    name: "Casa Coral Boutique",
    city: "Mérida",
    state: "Yucatán",
    rating: 4.5,
    reviews: 403,
    price: 1290,
    tags: ["Boutique", "Centro"],
    amenities: ["wifi", "breakfast", "spa"],
    accent: beachColors.coral,
    distanceKm: 2.1,
  },
  {
    id: "h_3",
    name: "Oasis Turquesa Suites",
    city: "Telchac",
    state: "Yucatán",
    rating: 4.3,
    reviews: 218,
    price: 990,
    tags: ["Familiar", "Alberca"],
    amenities: ["wifi", "pool", "parking"],
    accent: beachColors.teal,
    distanceKm: 0.9,
  },
  {
    id: "h_4",
    name: "Sunset Dunes Hotel",
    city: "Valladolid",
    state: "Yucatán",
    rating: 4.2,
    reviews: 154,
    price: 890,
    tags: ["Tranquilo", "Cercano a cenotes"],
    amenities: ["wifi", "parking"],
    accent: beachColors.sunset,
    distanceKm: 1.8,
  },
  {
    id: "h_5",
    name: "Deep Blue Executive",
    city: "Cancún",
    state: "Quintana Roo",
    rating: 4.6,
    reviews: 1204,
    price: 2190,
    tags: ["Business", "Vista al mar"],
    amenities: ["wifi", "breakfast", "parking", "spa"],
    accent: beachColors.deepBlue,
    distanceKm: 0.6,
  },
  {
    id: "h_6",
    name: "Arena & Mar Eco Stay",
    city: "Holbox",
    state: "Quintana Roo",
    rating: 4.4,
    reviews: 339,
    price: 1490,
    tags: ["Eco", "Experiencia"],
    amenities: ["wifi", "breakfast", "pool"],
    accent: beachColors.oceanBlue,
    distanceKm: 0.4,
  },
];

function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [key, state]);

  return [state, setState];
}

function HotelThumb({ accent }) {
  return (
    <div
      style={{
        width: "100%",
        height: 160,
        borderRadius: 16,
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(135deg, ${accent} 0%, ${beachColors.oceanBlue} 55%, ${beachColors.sand} 120%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.40), transparent 55%), radial-gradient(circle at 90% 60%, rgba(255,255,255,0.28), transparent 60%)",
        }}
      />
      <div style={{ position: "absolute", left: 14, bottom: 12 }}>
        <Tag
          icon={<SafetyCertificateOutlined />}
          style={{
            borderRadius: 999,
            padding: "4px 10px",
            background: "rgba(255,255,255,0.85)",
            border: "1px solid rgba(255,255,255,0.65)",
            color: neutrals.textMain,
            fontWeight: 700,
          }}
        >
          Verified Stay
        </Tag>
      </div>
    </div>
  );
}

function AmenityChips({ amenities }) {
  const items = AMENITIES.filter((a) => amenities?.includes(a.key)).slice(0, 4);
  return (
    <Space size={6} wrap>
      {items.map((a) => (
        <Tag
          key={a.key}
          icon={a.icon}
          style={{
            borderRadius: 999,
            background: "rgba(14,165,233,0.10)",
            border: "1px solid rgba(14,165,233,0.16)",
          }}
        >
          {a.label}
        </Tag>
      ))}
      {amenities?.length > 4 ? (
        <Tag style={{ borderRadius: 999, background: "rgba(0,0,0,0.03)" }}>+{amenities.length - 4}</Tag>
      ) : null}
    </Space>
  );
}

function nightsFromRange(range) {
  if (!range?.[0] || !range?.[1]) return 0;
  const n = dayjs(range[1]).diff(dayjs(range[0]), "day");
  return Math.max(1, n);
}

function App() {
  const [activeView, setActiveView] = useState("explore");
  const [darkMode, setDarkMode] = useLocalStorageState("beach_darkMode", false);

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Search / filters
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Cualquiera");
  const [range, setRange] = useState(null);
  const [guests, setGuests] = useState(2);

  const [priceRange, setPriceRange] = useState([700, 2600]);
  const [minRating, setMinRating] = useState(0);
  const [amenities, setAmenities] = useState(["wifi"]);

  // Favs
  const [favorites, setFavorites] = useLocalStorageState("beach_favs", []);
  const isFav = (hotelId) => favorites.includes(hotelId);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 6;

  // Booking
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [bookingForm] = Form.useForm();

  // Reservations
  const [reservations, setReservations] = useLocalStorageState("beach_reservations", []);

  const nights = useMemo(() => nightsFromRange(range), [range]);

  const cityOptions = useMemo(() => {
    const uniq = Array.from(new Set(MOCK_HOTELS.map((h) => h.city))).sort();
    return ["Cualquiera", ...uniq];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const [pmin, pmax] = priceRange;

    return MOCK_HOTELS.filter((h) => {
      if (city !== "Cualquiera" && h.city !== city) return false;
      if (q && !(h.name.toLowerCase().includes(q) || h.city.toLowerCase().includes(q) || h.state.toLowerCase().includes(q)))
        return false;
      if (h.price < pmin || h.price > pmax) return false;
      if (minRating > 0 && h.rating < minRating) return false;
      if (amenities?.length) {
        for (const a of amenities) {
          if (!h.amenities.includes(a)) return false;
        }
      }
      return true;
    });
  }, [query, city, priceRange, minRating, amenities]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [query, city, priceRange, minRating, amenities]);

  const themeConfig = useMemo(() => {
    const base = {
      token: {
        colorPrimary: beachColors.teal,
        colorInfo: beachColors.oceanBlue,
        colorSuccess: beachColors.turquoise,
        colorWarning: beachColors.sunset,
        colorError: beachColors.coral,
        colorTextBase: darkMode ? "rgba(255,255,255,0.92)" : neutrals.textMain,
        colorText: darkMode ? "rgba(255,255,255,0.92)" : neutrals.textMain,
        colorTextSecondary: darkMode ? "rgba(255,255,255,0.72)" : neutrals.textMuted,
        colorBgBase: darkMode ? "#0b1220" : neutrals.bg,
        colorBgContainer: darkMode ? "rgba(255,255,255,0.06)" : "#ffffff",
        colorBorder: darkMode ? "rgba(255,255,255,0.12)" : "rgba(148, 163, 184, 0.26)",
        borderRadius: 14,
        fontSize: 14,
      },
      components: {
        Layout: {
          headerBg: darkMode ? "rgba(11,18,32,0.92)" : "rgba(255,255,255,0.86)",
          bodyBg: darkMode ? "#0b1220" : neutrals.bg,
        },
        Card: {
          headerBg: "transparent",
        },
        Button: {
          borderRadius: 12,
          controlHeight: 40,
        },
        Input: {
          controlHeight: 40,
        },
        Select: {
          controlHeight: 40,
        },
        DatePicker: {
          controlHeight: 40,
        },
      },
    };

    return {
      ...base,
      algorithm: darkMode ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    };
  }, [darkMode]);

  const toggleFav = (hotelId) => {
    setFavorites((prev) => {
      const exists = prev.includes(hotelId);
      return exists ? prev.filter((x) => x !== hotelId) : [...prev, hotelId];
    });
  };

  const openBooking = (hotel) => {
    if (!range?.[0] || !range?.[1]) {
      message.warning("Selecciona primero tus fechas (check-in / check-out).");
      return;
    }
    setSelectedHotel(hotel);
    setBookingStep(0);
    bookingForm.resetFields();
    bookingForm.setFieldsValue({
      guests,
      fullName: "",
      email: "",
      phone: "",
      notes: "",
      paymentMethod: "card",
    });
    setBookingOpen(true);
  };

  const closeBooking = () => {
    setBookingOpen(false);
    setSelectedHotel(null);
    setBookingStep(0);
  };

  const computeTotals = (hotel) => {
    const base = (hotel?.price || 0) * nights;
    const taxes = Math.round(base * 0.16);
    const service = Math.round(base * 0.04);
    const total = base + taxes + service;
    return { base, taxes, service, total };
  };

  const confirmReservation = async () => {
    try {
      const values = await bookingForm.validateFields();
      const hotel = selectedHotel;
      if (!hotel) return;

      const totals = computeTotals(hotel);

      const newRes = {
        id: uid(),
        hotelId: hotel.id,
        hotelName: hotel.name,
        city: hotel.city,
        state: hotel.state,
        accent: hotel.accent,
        checkIn: dayjs(range[0]).toISOString(),
        checkOut: dayjs(range[1]).toISOString(),
        nights,
        guests: values.guests,
        createdAt: new Date().toISOString(),
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        notes: values.notes || "",
        paymentMethod: values.paymentMethod,
        totals,
        status: "Confirmada",
      };

      setReservations((prev) => [newRes, ...prev]);

      notification.success({
        message: "Reserva confirmada 🎉",
        description: `Listo: ${hotel.name} (${hotel.city}) — ${nights} noche(s).`,
        placement: "topRight",
      });

      setBookingStep(2);
    } catch (e) {
      // antd already highlights fields
    }
  };

  const cancelReservation = (id) => {
    Modal.confirm({
      title: "Cancelar reserva",
      content: "¿Seguro que quieres cancelar esta reserva?",
      okText: "Sí, cancelar",
      okButtonProps: { danger: true },
      cancelText: "No",
      onOk: () => {
        setReservations((prev) => prev.filter((r) => r.id !== id));
        message.success("Reserva cancelada.");
      },
    });
  };

  const FiltersPanel = (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" size={14} style={{ width: "100%" }}>
        <div>
          <Text strong>Precio por noche</Text>
          <div style={{ marginTop: 8 }}>
            <Slider
              range
              min={500}
              max={3000}
              step={50}
              value={priceRange}
              onChange={(v) => setPriceRange(v)}
            />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <Text type="secondary">{money(priceRange[0])}</Text>
              <Text type="secondary">{money(priceRange[1])}</Text>
            </div>
          </div>
        </div>

        <Divider style={{ margin: "6px 0" }} />

        <div>
          <Text strong>Calificación mínima</Text>
          <div style={{ marginTop: 8 }}>
            <Rate
              allowClear
              value={minRating}
              onChange={(v) => setMinRating(v)}
              character={<StarFilled />}
            />
            <div style={{ marginTop: 6 }}>
              <Text type="secondary">{minRating ? `${minRating}+ estrellas` : "Cualquiera"}</Text>
            </div>
          </div>
        </div>

        <Divider style={{ margin: "6px 0" }} />

        <div>
          <Text strong>Servicios</Text>
          <div style={{ marginTop: 8 }}>
            <Checkbox.Group
              value={amenities}
              onChange={(vals) => setAmenities(vals)}
              style={{ display: "grid", gap: 8 }}
            >
              {AMENITIES.map((a) => (
                <Checkbox key={a.key} value={a.key}>
                  <Space size={8}>
                    <span style={{ color: beachColors.oceanBlue }}>{a.icon}</span>
                    <span>{a.label}</span>
                  </Space>
                </Checkbox>
              ))}
            </Checkbox.Group>
          </div>
        </div>

        <Divider style={{ margin: "6px 0" }} />

        <Button
          onClick={() => {
            setQuery("");
            setCity("Cualquiera");
            setPriceRange([700, 2600]);
            setMinRating(0);
            setAmenities(["wifi"]);
            message.success("Filtros reiniciados.");
          }}
          block
        >
          Reiniciar filtros
        </Button>
      </Space>
    </div>
  );

  const headerSearch = (
    <div className="searchBar">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Busca hotel, ciudad o estado…"
      />

      <Select
        value={city}
        onChange={setCity}
        options={cityOptions.map((c) => ({ label: c, value: c }))}
        style={{ minWidth: 160 }}
        suffixIcon={<EnvironmentOutlined />}
      />

      <RangePicker
        value={range}
        onChange={(v) => setRange(v)}
        allowEmpty={[true, true]}
        format="DD MMM"
        placeholder={["Check-in", "Check-out"]}
        suffixIcon={<CalendarOutlined />}
      />

      <Select
        value={guests}
        onChange={(v) => setGuests(v)}
        style={{ minWidth: 140 }}
        options={[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
          value: n,
          label: `${n} huésped${n === 1 ? "" : "es"}`,
        }))}
        suffixIcon={<TeamOutlined />}
      />

      <Button
        icon={<FilterOutlined />}
        onClick={() => setMobileDrawerOpen(true)}
        className="onlyMobile"
      >
        Filtros
      </Button>
    </div>
  );

  const ExploreView = (
    <div style={{ padding: 18 }}>
      <div className="hero">
        <div className="heroLeft">
          <Title level={2} style={{ margin: 0 }}>
            Reserva hoteles con vibra beach 🏝️
          </Title>
          <Text type="secondary">
            Busca, filtra y confirma en minutos. Todo con una UI limpia y rápida.
          </Text>

          <div className="heroStats">
            <Card className="statCard" bordered={false}>
              <Space direction="vertical" size={2}>
                <Text type="secondary">Resultados</Text>
                <Text strong style={{ fontSize: 18 }}>
                  {filtered.length}
                </Text>
              </Space>
            </Card>

            <Card className="statCard" bordered={false}>
              <Space direction="vertical" size={2}>
                <Text type="secondary">Noches</Text>
                <Text strong style={{ fontSize: 18 }}>
                  {nights || "—"}
                </Text>
              </Space>
            </Card>

            <Card className="statCard" bordered={false}>
              <Space direction="vertical" size={2}>
                <Text type="secondary">Favoritos</Text>
                <Text strong style={{ fontSize: 18 }}>
                  {favorites.length}
                </Text>
              </Space>
            </Card>
          </div>
        </div>

        <div className="heroRight">
          <Card className="heroCard" bordered={false}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Text strong style={{ fontSize: 16 }}>
                Búsqueda rápida
              </Text>
              {headerSearch}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text type="secondary">
                  {range?.[0] && range?.[1]
                    ? `${dayjs(range[0]).format("DD MMM")} → ${dayjs(range[1]).format("DD MMM")}`
                    : "Selecciona fechas para ver totales"}
                </Text>
                <Text type="secondary">
                  {range?.[0] && range?.[1] ? `${nights} noche(s)` : ""}
                </Text>
              </div>
            </Space>
          </Card>
        </div>
      </div>

      <Divider style={{ margin: "18px 0 12px" }} />

      {filtered.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 18 }}>
          <Empty
            description="No encontramos opciones con esos filtros."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <>
          <Row gutter={[16, 16]}>
            {paged.map((hotel) => {
              const totals = computeTotals(hotel);
              const fav = isFav(hotel.id);

              return (
                <Col key={hotel.id} xs={24} md={12} lg={8}>
                  <Card
                    className="hotelCard"
                    bordered={false}
                    style={{ borderRadius: 18 }}
                    bodyStyle={{ padding: 14 }}
                    hoverable
                  >
                    <HotelThumb accent={hotel.accent} />
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ fontSize: 16 }} ellipsis>
                            {hotel.name}
                          </Text>
                          <div>
                            <Text type="secondary">
                              <EnvironmentOutlined style={{ marginRight: 6, color: beachColors.oceanBlue }} />
                              {hotel.city}, {hotel.state} • {hotel.distanceKm} km
                            </Text>
                          </div>
                        </div>

                        <Tooltip title={fav ? "Quitar de favoritos" : "Agregar a favoritos"}>
                          <Button
                            type="text"
                            aria-label="favorite"
                            icon={fav ? <HeartFilled /> : <HeartOutlined />}
                            onClick={() => toggleFav(hotel.id)}
                            style={{
                              color: fav ? beachColors.coral : undefined,
                              borderRadius: 12,
                            }}
                          />
                        </Tooltip>
                      </div>

                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                        <Badge
                          count={
                            <span style={{ fontWeight: 800 }}>
                              {hotel.rating.toFixed(1)}
                            </span>
                          }
                          style={{
                            background: "rgba(45,212,191,0.18)",
                            color: darkMode ? "rgba(255,255,255,0.92)" : neutrals.textMain,
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.14)" : "rgba(45,212,191,0.35)"}`,
                          }}
                        />
                        <Rate disabled value={Math.round(hotel.rating)} style={{ fontSize: 14 }} />
                        <Text type="secondary">({hotel.reviews})</Text>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <Space size={6} wrap>
                          {hotel.tags.map((t) => (
                            <Tag
                              key={t}
                              style={{
                                borderRadius: 999,
                                background: "rgba(245,158,11,0.12)",
                                border: "1px solid rgba(245,158,11,0.20)",
                              }}
                            >
                              {t}
                            </Tag>
                          ))}
                        </Space>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <AmenityChips amenities={hotel.amenities} />
                      </div>

                      <Divider style={{ margin: "12px 0" }} />

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <div>
                          <Text type="secondary">Desde</Text>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                            <Text strong style={{ fontSize: 18 }}>
                              {money(hotel.price)}
                            </Text>
                            <Text type="secondary">/noche</Text>
                          </div>
                          {range?.[0] && range?.[1] ? (
                            <Text type="secondary">
                              Total est.: {money(totals.total)}
                            </Text>
                          ) : (
                            <Text type="secondary">Selecciona fechas</Text>
                          )}
                        </div>

                        <Button
                          type="primary"
                          onClick={() => openBooking(hotel)}
                          style={{ borderRadius: 14, fontWeight: 800 }}
                        >
                          Reservar
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filtered.length}
              onChange={(p) => setPage(p)}
              showSizeChanger={false}
            />
          </div>
        </>
      )}
    </div>
  );

  const ReservationsView = (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Mis reservas
          </Title>
          <Text type="secondary">Historial local (persistido en tu navegador).</Text>
        </div>
        <Button
          icon={<CompassOutlined />}
          onClick={() => setActiveView("explore")}
          style={{ borderRadius: 14 }}
        >
          Explorar hoteles
        </Button>
      </div>

      <Divider style={{ margin: "14px 0" }} />

      {reservations.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 18 }}>
          <Empty
            description="Aún no tienes reservas. Haz una en la sección Explorar."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </Card>
      ) : (
        <Card bordered={false} style={{ borderRadius: 18 }}>
          <List
            itemLayout="horizontal"
            dataSource={reservations}
            renderItem={(r) => (
              <List.Item
                actions={[
                  <Tooltip key="cancel" title="Cancelar reserva">
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => cancelReservation(r.id)}
                      style={{ borderRadius: 12 }}
                    >
                      Cancelar
                    </Button>
                  </Tooltip>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      shape="square"
                      size={56}
                      style={{
                        borderRadius: 14,
                        background: `linear-gradient(135deg, ${r.accent} 0%, ${beachColors.oceanBlue} 65%)`,
                      }}
                      icon={<HomeOutlined />}
                    />
                  }
                  title={
                    <Space size={10} wrap>
                      <Text strong>{r.hotelName}</Text>
                      <Tag
                        color="success"
                        style={{ borderRadius: 999 }}
                        icon={<CheckCircleOutlined />}
                      >
                        {r.status}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">
                        {r.city}, {r.state}
                      </Text>
                      <Text type="secondary">
                        {dayjs(r.checkIn).format("DD MMM YYYY")} → {dayjs(r.checkOut).format("DD MMM YYYY")} •{" "}
                        {r.nights} noche(s) • {r.guests} huésped(es)
                      </Text>
                      <Text>
                        <Text type="secondary">Total:</Text> <Text strong>{money(r.totals?.total)}</Text>
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  );

  const BookingModal = (
    <Modal
      open={bookingOpen}
      onCancel={closeBooking}
      footer={null}
      width={980}
      centered
      styles={{ body: { padding: 16 } }}
      title={
        <Space size={10}>
          <CreditCardOutlined style={{ color: beachColors.oceanBlue }} />
          <span>Reservar</span>
          {selectedHotel ? <Text type="secondary">— {selectedHotel.name}</Text> : null}
        </Space>
      }
    >
      {!selectedHotel ? null : (
        <div>
          <Steps
            current={bookingStep}
            items={[
              { title: "Detalles", icon: <HomeOutlined /> },
              { title: "Huésped", icon: <UserOutlined /> },
              { title: "Listo", icon: <CheckCircleOutlined /> },
            ]}
          />

          <Divider style={{ margin: "14px 0" }} />

          {bookingStep === 2 ? (
            <Result
              status="success"
              title="¡Reserva confirmada!"
              subTitle="Ya quedó registrada en “Mis reservas”."
              extra={[
                <Button key="go" type="primary" onClick={() => { closeBooking(); setActiveView("reservations"); }}>
                  Ver mis reservas
                </Button>,
                <Button key="more" onClick={() => { closeBooking(); setActiveView("explore"); }}>
                  Seguir explorando
                </Button>,
              ]}
            />
          ) : (
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={14}>
                <Card bordered={false} style={{ borderRadius: 18 }}>
                  <Form
                    form={bookingForm}
                    layout="vertical"
                    requiredMark={false}
                    initialValues={{ guests, paymentMethod: "card" }}
                  >
                    {bookingStep === 0 ? (
                      <>
                        <Title level={4} style={{ marginTop: 0 }}>
                          Resumen de estancia
                        </Title>

                        <Space direction="vertical" size={10} style={{ width: "100%" }}>
                          <Card
                            bordered={false}
                            style={{
                              borderRadius: 18,
                              background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(14,165,233,0.06)",
                              border: `1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(14,165,233,0.12)"}`,
                            }}
                          >
                            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                              <Text strong>{selectedHotel.name}</Text>
                              <Text type="secondary">
                                {selectedHotel.city}, {selectedHotel.state}
                              </Text>
                              <Text type="secondary">
                                {dayjs(range[0]).format("DD MMM YYYY")} → {dayjs(range[1]).format("DD MMM YYYY")} •{" "}
                                {nights} noche(s)
                              </Text>
                              <AmenityChips amenities={selectedHotel.amenities} />
                            </Space>
                          </Card>

                          <Form.Item
                            label="Huéspedes"
                            name="guests"
                            rules={[{ required: true, message: "Indica número de huéspedes." }]}
                          >
                            <InputNumber
                              min={1}
                              max={8}
                              style={{ width: "100%" }}
                              onChange={(v) => setGuests(clamp(Number(v || 1), 1, 8))}
                            />
                          </Form.Item>

                          <Form.Item label="Notas (opcional)" name="notes">
                            <Input.TextArea rows={3} placeholder="Preferencias, hora aproximada de llegada, etc." />
                          </Form.Item>

                          <Space style={{ width: "100%", justifyContent: "space-between" }}>
                            <Button onClick={closeBooking} style={{ borderRadius: 14 }}>
                              Cancelar
                            </Button>
                            <Button
                              type="primary"
                              onClick={() => setBookingStep(1)}
                              style={{ borderRadius: 14, fontWeight: 800 }}
                            >
                              Continuar
                            </Button>
                          </Space>
                        </Space>
                      </>
                    ) : (
                      <>
                        <Title level={4} style={{ marginTop: 0 }}>
                          Datos del huésped
                        </Title>

                        <Row gutter={[12, 0]}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Nombre completo"
                              name="fullName"
                              rules={[{ required: true, message: "Escribe tu nombre." }]}
                            >
                              <Input placeholder="Ej. Ofir Hernández" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Correo"
                              name="email"
                              rules={[
                                { required: true, message: "Escribe tu correo." },
                                { type: "email", message: "Correo inválido." },
                              ]}
                            >
                              <Input placeholder="tucorreo@correo.com" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Teléfono"
                              name="phone"
                              rules={[{ required: true, message: "Escribe tu teléfono." }]}
                            >
                              <Input placeholder="Ej. 999 123 4567" />
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Método de pago"
                              name="paymentMethod"
                              rules={[{ required: true, message: "Selecciona un método." }]}
                            >
                              <Select
                                options={[
                                  { value: "card", label: "Tarjeta" },
                                  { value: "cash", label: "Pagar al llegar" },
                                  { value: "transfer", label: "Transferencia" },
                                ]}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Card
                          bordered={false}
                          style={{
                            borderRadius: 18,
                            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(245,158,11,0.10)",
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(245,158,11,0.18)"}`,
                          }}
                        >
                          <Space>
                            <SafetyCertificateOutlined style={{ color: beachColors.sunset }} />
                            <Text type="secondary">
                              Demo UI: aquí conectarías tu backend (pagos, inventario de habitaciones, etc.).
                            </Text>
                          </Space>
                        </Card>

                        <Divider style={{ margin: "12px 0" }} />

                        <Space style={{ width: "100%", justifyContent: "space-between" }}>
                          <Button onClick={() => setBookingStep(0)} style={{ borderRadius: 14 }}>
                            Atrás
                          </Button>
                          <Button
                            type="primary"
                            onClick={confirmReservation}
                            style={{ borderRadius: 14, fontWeight: 800 }}
                          >
                            Confirmar
                          </Button>
                        </Space>
                      </>
                    )}
                  </Form>
                </Card>
              </Col>

              <Col xs={24} lg={10}>
                <Card bordered={false} style={{ borderRadius: 18 }}>
                  <Title level={4} style={{ marginTop: 0 }}>
                    Total
                  </Title>

                  {(() => {
                    const t = computeTotals(selectedHotel);
                    return (
                      <Space direction="vertical" size={10} style={{ width: "100%" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text type="secondary">
                            {money(selectedHotel.price)} × {nights} noche(s)
                          </Text>
                          <Text>{money(t.base)}</Text>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text type="secondary">Impuestos (16%)</Text>
                          <Text>{money(t.taxes)}</Text>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <Text type="secondary">Servicio</Text>
                          <Text>{money(t.service)}</Text>
                        </div>

                        <Divider style={{ margin: "10px 0" }} />

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <Text strong style={{ fontSize: 16 }}>
                            Total
                          </Text>
                          <Text strong style={{ fontSize: 18 }}>
                            {money(t.total)}
                          </Text>
                        </div>

                        <Card
                          bordered={false}
                          style={{
                            borderRadius: 18,
                            background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(45,212,191,0.10)",
                            border: `1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(45,212,191,0.20)"}`,
                          }}
                        >
                          <Space direction="vertical" size={2}>
                            <Text strong>Incluye</Text>
                            <Text type="secondary">Soporte • Confirmación inmediata • Reembolso (según políticas)</Text>
                          </Space>
                        </Card>
                      </Space>
                    );
                  })()}
                </Card>
              </Col>
            </Row>
          )}
        </div>
      )}
    </Modal>
  );

  return (
    <ConfigProvider theme={themeConfig}>
      <Layout className="appRoot">
        <style>{`
          .appRoot{
            min-height: 100vh;
            background: ${darkMode ? "#0b1220" : neutrals.bg};
          }

          .glassHeader{
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            border-bottom: 1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.22)"};
            position: sticky;
            top: 0;
            z-index: 50;
          }

          .headerInner{
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 14px;
            height: 72px;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .brand{
            display:flex;
            align-items:center;
            gap:10px;
            min-width: 210px;
          }

          .brandLogo{
            width: 36px;
            height: 36px;
            border-radius: 12px;
            background: linear-gradient(135deg, ${beachColors.turquoise} 0%, ${beachColors.oceanBlue} 60%);
            display:flex;
            align-items:center;
            justify-content:center;
            box-shadow: 0 16px 40px rgba(14,165,233,0.22);
            color: white;
            font-weight: 900;
          }

          .grow{ flex: 1; }

          .searchBar{
            display: grid;
            grid-template-columns: 1.35fr 0.8fr 1fr 0.7fr auto;
            gap: 10px;
            align-items: center;
            width: 100%;
          }

          .onlyMobile{ display: none; }

          .contentShell{
            max-width: 1200px;
            width: 100%;
            margin: 0 auto;
          }

          .siderShell{
            padding: 12px 0;
            border-right: 1px solid ${darkMode ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.20)"};
            background: transparent;
          }

          .hero{
            display: grid;
            grid-template-columns: 1.2fr 1fr;
            gap: 14px;
            align-items: stretch;
          }

          .heroCard{
            border-radius: 20px !important;
            background: ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)"} !important;
            border: 1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.20)"};
            box-shadow: 0 20px 60px rgba(15,23,42,0.08);
          }

          .heroStats{
            display: grid;
            grid-template-columns: repeat(3, minmax(0,1fr));
            gap: 12px;
            margin-top: 14px;
          }

          .statCard{
            border-radius: 18px !important;
            background: ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)"} !important;
            border: 1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.20)"};
          }

          .hotelCard{
            transition: transform .18s ease, box-shadow .18s ease;
            box-shadow: 0 18px 60px rgba(15,23,42,0.08);
            background: ${darkMode ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.92)"} !important;
            border: 1px solid ${darkMode ? "rgba(255,255,255,0.10)" : "rgba(148,163,184,0.20)"};
          }

          .hotelCard:hover{
            transform: translateY(-2px);
            box-shadow: 0 22px 70px rgba(15,23,42,0.12);
          }

          @media (max-width: 992px){
            .hero{ grid-template-columns: 1fr; }
          }

          @media (max-width: 900px){
            .brand{ min-width: 160px; }
            .searchBar{
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .onlyMobile{ display: inline-flex; }
          }
        `}</style>

        {/* HEADER */}
        <Header className="glassHeader" style={{ height: 72, padding: 0 }}>
          <div className="headerInner">
            <div className="brand" onClick={() => setActiveView("explore")} style={{ cursor: "pointer" }}>
              <div className="brandLogo">B</div>
              <div style={{ lineHeight: 1.1 }}>
                <Text strong style={{ fontSize: 16 }}>
                  BeachBooking
                </Text>
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    hoteles • reservas • vibe
                  </Text>
                </div>
              </div>
            </div>

            <div className="grow">{activeView === "explore" ? headerSearch : null}</div>

            <Space size={10}>
              <Tooltip title={darkMode ? "Modo claro" : "Modo oscuro"}>
                <Switch
                  checked={darkMode}
                  onChange={setDarkMode}
                  checkedChildren={<MoonOutlined />}
                  unCheckedChildren={<SunOutlined />}
                />
              </Tooltip>

              <Button
                onClick={() => setActiveView("reservations")}
                style={{ borderRadius: 14 }}
              >
                Mis reservas
                {reservations.length ? (
                  <Badge
                    count={reservations.length}
                    style={{ background: beachColors.coral, marginLeft: 10 }}
                  />
                ) : null}
              </Button>
            </Space>
          </div>
        </Header>

        <Layout className="contentShell">
          {/* DESKTOP FILTERS */}
          <Sider
            width={300}
            className="siderShell"
            breakpoint="lg"
            collapsedWidth="0"
            theme="light"
            style={{ background: "transparent" }}
          >
            <div style={{ padding: "0 12px" }}>
              <Card bordered={false} style={{ borderRadius: 18 }}>
                <Space direction="vertical" size={2}>
                  <Text strong style={{ fontSize: 16 }}>
                    Filtros
                  </Text>
                  <Text type="secondary">Refina la búsqueda sin complicarte.</Text>
                </Space>
              </Card>
            </div>
            <Divider style={{ margin: "12px 0" }} />
            {FiltersPanel}
          </Sider>

          <Content>
            <div style={{ minHeight: "calc(100vh - 72px)" }}>
              {activeView === "explore" ? ExploreView : ReservationsView}
            </div>
          </Content>
        </Layout>

        <Footer style={{ textAlign: "center", background: "transparent" }}>
          <Text type="secondary">
            BeachBooking UI • React + Ant Design • Paleta: beachTheme.js
          </Text>
        </Footer>

        {/* MOBILE DRAWER FILTERS */}
        <Drawer
          title={
            <Space>
              <FilterOutlined />
              <span>Filtros</span>
            </Space>
          }
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          width={360}
        >
          {FiltersPanel}
        </Drawer>

        {BookingModal}

        <FloatButton.BackTop />
      </Layout>
    </ConfigProvider>
  );
}

export default App;
