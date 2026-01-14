// src/App.jsx
import { useMemo, useState } from "react";
import "./app.css";
import dayjs from "dayjs";
import {
  ConfigProvider,
  Layout,
  Button,
  Typography,
  Select,
  DatePicker,
  Input,
  Slider,
  Collapse,
  Checkbox,
  InputNumber,
  Rate,
  Tabs,
  message,
  Tooltip,
  Segmented,
  Flex,
} from "antd";
import {
  SearchOutlined,
  DownOutlined,
  UserOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  FilterOutlined,
  ArrowRightOutlined,
  HeartOutlined,
  HeartFilled,
} from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;

import Footer from "./components/Footer";
import NotchBar from "./components/NotchBar";
import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import { SUCURSALES, HABITACIONES_DESTACADAS, SEARCH_ITEMS } from "./data/demoData";

/** Paleta solicitada (se queda igual) */
import { beachColors, neutrals } from "./theme/beachTheme";

/** Demo data imported from src/data/demoData.js */

function StatusPill({ text, colorKey }) {
  const map = {
    turquoise: beachColors.turquoise,
    oceanBlue: beachColors.oceanBlue,
    coral: beachColors.coral,
    teal: beachColors.teal,
    sunset: beachColors.sunset,
    deepBlue: beachColors.deepBlue,
  };
  return (
    <div
      className="hf-statusPill"
      style={{ background: map[colorKey] || colorKey }}
    >
      {text}
    </div>
  );
}

/** SEARCH */
function SearchSidebar({ filters, setFilters }) {
  return (
    <div className="hf-searchSidebar">
      <div className="hf-sideTop">
        <div className="hf-sideTopTitle">Filtros</div>
        <DownOutlined style={{ opacity: 0.9 }} />
      </div>

      <div className="hf-sideBody">
        <div className="hf-sideRow">
          <div className="hf-sideLabel">Sucursal</div>
          <Select
            value={filters.location}
            onChange={(v) => setFilters((s) => ({ ...s, location: v }))}
            placeholder="Sucursal"
            suffixIcon={<DownOutlined />}
            className="hf-sideSelect"
            options={[
              { label: "Todas", value: "ALL" },
              ...SUCURSALES.map((d) => ({
                label: `${d.name} · ${d.subtitle}`,
                value: d.key,
              })),
            ]}
          />
        </div>

        <div className="hf-sideRow">
          <div className="hf-sideLabel">Fechas</div>
          <DatePicker.RangePicker
            value={filters.range}
            onChange={(v) => setFilters((s) => ({ ...s, range: v }))}
            className="hf-sideRange"
            placeholder={["Check-in", "Check-out"]}
          />
        </div>

        <div className="hf-sideDivider" />

        <div className="hf-sideRow">
          <div className="hf-sideLabel">Precio por noche</div>
          <div className="hf-miniPrice">
            <div className="hf-miniPriceRow">
              <div className="hf-miniBox">${filters.price[0]}</div>
              <div className="hf-miniDash">|</div>
              <div className="hf-miniBox">${filters.price[1]}</div>
            </div>
            <Slider
              range
              min={800}
              max={2500}
              step={50}
              value={filters.price}
              onChange={(v) => setFilters((s) => ({ ...s, price: v }))}
            />
          </div>
        </div>

        <div className="hf-sideDivider" />

        <div className="hf-sideRow">
          <div className="hf-sideLabel">Amenidades</div>
          <Collapse
            ghost
            defaultActiveKey={["c1"]}
            expandIconPosition="end"
            className="hf-sideCollapse"
            items={[
              {
                key: "c1",
                label: <span className="hf-sideCollapseLabel">Incluye</span>,
                children: (
                  <Checkbox.Group
                    value={filters.amenities}
                    onChange={(v) =>
                      setFilters((s) => ({ ...s, amenities: v }))
                    }
                    options={[
                      { label: "WiFi", value: "wifi" },
                      { label: "A/C", value: "ac" },
                      { label: "Estacionamiento", value: "parking" },
                      { label: "Cocina", value: "kitchen" },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>

        <div className="hf-sideDivider" />

        <div className="hf-sideRow">
          <div className="hf-sideLabel">Calificación mínima</div>
          <Slider
            min={1}
            max={5}
            step={0.5}
            value={filters.stars}
            onChange={(v) => setFilters((s) => ({ ...s, stars: v }))}
          />
          <div className="hf-starsRow">
            <Rate allowHalf disabled value={filters.stars} />
            <span className="hf-starsText">{filters.stars}+</span>
          </div>
        </div>

        <Button
          className="hf-sideReserveBtn"
          type="primary"
          onClick={() => message.success("Filtros aplicados")}
        >
          Aplicar filtros
        </Button>
      </div>
    </div>
  );
}

function SearchResultRow({ it, onReserve, isFav, onToggleFav }) {
  return (
    <div className="hf-resultRow">
      <div
        className="hf-resultThumb"
        style={{ backgroundImage: `url('${it.img}')` }}
      />
      <div className="hf-resultMid">
        <div className="hf-resultTitleRow">
          <div className="hf-resultTitle">{it.title}</div>
          <button
            type="button"
            className={"hf-favMini " + (isFav ? "isFav" : "")}
            onClick={() => onToggleFav(it.key)}
            aria-label={isFav ? "Quitar de favoritos" : "Guardar en favoritos"}
          >
            {isFav ? <HeartFilled /> : <HeartOutlined />}
          </button>
        </div>

        <div className="hf-resultDesc">{it.desc}</div>

        <div className="hf-resultMeta">
          <Rate allowHalf disabled value={it.rating} />
          <span className="hf-resultMetaText">({it.reviews})</span>
          <span className="hf-dot">•</span>
          <span className="hf-resultMetaText">${it.price}/noche</span>
        </div>
      </div>

      <Button
        className="hf-resultBtn"
        type="primary"
        onClick={() => onReserve(it)}
      >
        Ver detalle <ArrowRightOutlined />
      </Button>
    </div>
  );
}

function SearchPage({
  initialForm,
  onReserveGoDetail,
  favorites,
  onToggleFav,
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({
    location: initialForm?.branch || "ALL",
    range: initialForm?.range || null,
    price: [1000, 2200],
    stars: 4,
    amenities: [],
  });

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SEARCH_ITEMS.filter((it) => {
      if (filters.location !== "ALL" && it.location !== filters.location)
        return false;
      if (it.price < filters.price[0] || it.price > filters.price[1])
        return false;
      if (it.rating < filters.stars) return false;

      if (filters.amenities.length) {
        const ok = filters.amenities.every((a) => it.amenities.includes(a));
        if (!ok) return false;
      }

      if (q && !it.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, filters]);

  return (
    <div className="hf-pageBody hf-viewEnter">
      <div className="hf-searchLayout hf-searchLayout--wide">
        <div className="hf-searchLeft">
          <SearchSidebar filters={filters} setFilters={setFilters} />
        </div>

        <div className="hf-searchRight">
          <div className="hf-resultsCard">
            <div className="hf-resultsTop">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtra por nombre de habitación…"
                prefix={
                  <SearchOutlined style={{ color: neutrals.textMuted }} />
                }
                className="hf-resultsSearch"
              />
              <Button className="hf-resultsDrop">
                Ordenar <DownOutlined style={{ fontSize: 11 }} />
              </Button>
            </div>

            <div className="hf-resultsList">
              {items.map((it) => (
                <SearchResultRow
                  key={it.key}
                  it={it}
                  onReserve={onReserveGoDetail}
                  isFav={favorites.has(it.key)}
                  onToggleFav={onToggleFav}
                />
              ))}
              {!items.length ? (
                <div className="hf-empty">
                  <FilterOutlined /> Sin resultados con estos filtros.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** DETAIL */
function DetailPage({ selectedItem, initialForm, onConfirm }) {
  const [range, setRange] = useState(initialForm?.range || null);
  const [branch, setBranch] = useState(
    initialForm?.branch || selectedItem?.location || "chelem"
  );
  const [people, setPeople] = useState(2);

  const pricePerNight = selectedItem?.price ?? 1500;
  const nights = useMemo(() => {
    if (!range?.[0] || !range?.[1]) return 0;
    const diff = range[1].diff(range[0], "day");
    return Math.max(1, diff || 0);
  }, [range]);

  const total = pricePerNight * (nights || 1);

  const branchLabel = useMemo(() => {
    const s = SUCURSALES.find((x) => x.key === branch);
    return s ? `${s.name} · ${s.subtitle}` : "Sucursal";
  }, [branch]);

  return (
    <div className="hf-pageBody hf-viewEnter">
      <div className="hf-detailWrap hf-detailWrap--wide">
        <Title level={3} className="hf-detailH1">
          {selectedItem?.title || "Detalle de habitación"}
        </Title>

        <div className="hf-detailGrid">
          <div className="hf-detailMain">
            <div
              className="hf-detailImage"
              style={{
                backgroundImage: `url('${
                  selectedItem?.img ||
                  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2200&q=70"
                }')`,
              }}
            />

            <div className="hf-detailFormCard">
              <div className="hf-detailFormRow">
                <div className="hf-field">
                  <div className="hf-fieldLabel">Fechas</div>
                  <DatePicker.RangePicker
                    value={range}
                    onChange={setRange}
                    className="hf-fieldControl"
                    placeholder={["Check-in", "Check-out"]}
                    suffixIcon={<CalendarOutlined />}
                  />
                </div>

                <div className="hf-field">
                  <div className="hf-fieldLabel">Sucursal</div>
                  <Select
                    value={branch}
                    onChange={setBranch}
                    className="hf-fieldControl"
                    options={SUCURSALES.map((s) => ({
                      label: `${s.name} · ${s.subtitle}`,
                      value: s.key,
                    }))}
                    suffixIcon={<DownOutlined />}
                  />
                </div>
              </div>

              <div className="hf-detailFormRow hf-detailFormRow--bottom">
                <div className="hf-field" style={{ flex: 1 }}>
                  <div className="hf-fieldLabel">Huéspedes</div>
                  <div className="hf-peopleRow">
                    <InputNumber
                      min={1}
                      max={10}
                      value={people}
                      onChange={(v) => setPeople(v || 1)}
                      className="hf-peopleInput"
                    />
                    <div
                      className="hf-peopleMini"
                      aria-label="Control rápido de huéspedes"
                    >
                      <button
                        type="button"
                        className="hf-miniBtn"
                        onClick={() =>
                          setPeople((p) => Math.max(1, (p || 1) - 1))
                        }
                      >
                        -
                      </button>
                      <div className="hf-miniVal">{people}</div>
                      <button
                        type="button"
                        className="hf-miniBtn"
                        onClick={() =>
                          setPeople((p) => Math.min(10, (p || 1) + 1))
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="hf-detailIcons">
                  <div className="hf-iconChip" title="Ubicación">
                    <EnvironmentOutlined />
                  </div>
                  <div className="hf-iconChip" title="Huéspedes">
                    <UserOutlined />
                  </div>
                </div>
              </div>

              <div className="hf-detailMiniNote">
                <Text className="hf-detailMiniText">
                  {branchLabel} ·{" "}
                  {nights ? `${nights} noche(s)` : "Selecciona fechas"} · $
                  {pricePerNight}/noche
                </Text>
              </div>
            </div>
          </div>

          <div className="hf-detailSide">
            <div className="hf-summaryCard">
              <div className="hf-summaryTitle">Resumen</div>

              <div className="hf-summaryLine">
                <span>Fechas</span>
                <span className="hf-summaryValue">
                  {range?.[0] && range?.[1]
                    ? `${range[0].format("DD/MM")} – ${range[1].format(
                        "DD/MM"
                      )}`
                    : "—"}
                </span>
              </div>

              <div className="hf-summaryLine">
                <span>Sucursal</span>
                <span className="hf-summaryValue">{branchLabel}</span>
              </div>

              <div className="hf-summaryLine">
                <span>Huéspedes</span>
                <span className="hf-summaryValue">{people}</span>
              </div>

              <div className="hf-summaryLine">
                <span>Total</span>
                <span className="hf-summaryValue">${total}</span>
              </div>

              <Button
                className="hf-confirmBtn"
                type="primary"
                onClick={() =>
                  onConfirm({
                    range,
                    branch,
                    people,
                    total,
                    pricePerNight,
                    nights,
                  })
                }
                disabled={!range?.[0] || !range?.[1]}
              >
                Confirmar reserva
              </Button>
            </div>

            <div className="hf-miniCard">
              <div className="hf-miniCardTop">Info rápida</div>
              <div className="hf-miniCardBody">
                <div className="hf-miniPlay">
                  <div className="hf-playIcon">✓</div>
                  <div className="hf-playText">
                    Check-in fácil y atención directa
                  </div>
                </div>
                <div className="hf-miniPlay" style={{ marginTop: 10 }}>
                  <div className="hf-playIcon">✓</div>
                  <div className="hf-playText">
                    WiFi y espacios listos para descansar
                  </div>
                </div>
              </div>
              <div
                className="hf-miniCardImg"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1800&q=70')",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ACCOUNT */
function BookingRow({ b, onOpen }) {
  const btnColor = beachColors.oceanBlue;
  return (
    <div className="hf-bookRow">
      <div
        className="hf-bookThumb"
        style={{ backgroundImage: `url('${b.img}')` }}
      />
      <div className="hf-bookMid">
        <div className="hf-bookTitle">{b.title}</div>
        <div className="hf-bookMeta">
          <Rate disabled value={b.stars} />
          <span className="hf-bookMetaText">{b.details}</span>
        </div>
      </div>

      <div className="hf-bookRight">
        <StatusPill text={b.status.text} colorKey={b.status.color} />
        <Button
          className="hf-bookBtn"
          type="primary"
          style={{ background: btnColor, borderColor: btnColor }}
          onClick={onOpen}
        >
          Ver detalle
        </Button>
      </div>
    </div>
  );
}

function AccountPage({ bookings, favoritesCount, onOpenDetail }) {
  const hasBookings = bookings.length > 0;

  return (
    <div className="hf-pageBody hf-viewEnter">
      <div className="hf-accountWrap hf-accountWrap--wide">
        <div className="hf-accountCard">
          <div className="hf-accountTabs">
            <Tabs
              defaultActiveKey="mis"
              items={[
                { key: "mis", label: "Mis Reservas" },
                { key: "fav", label: `Favoritos (${favoritesCount})` },
                { key: "msg", label: "Mensajes" },
              ]}
            />
          </div>

          <div className="hf-accountList">
            {hasBookings ? (
              bookings.map((b) => (
                <BookingRow key={b.key} b={b} onOpen={() => onOpenDetail(b)} />
              ))
            ) : (
              <div className="hf-empty hf-empty--pad">
                <FilterOutlined /> Aún no tienes reservas. Haz una búsqueda y
                confirma una estancia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** APP */
const App = () => {
  const [view, setView] = useState("home"); // home | search | detail | account

  const [form, setForm] = useState({
    branch: undefined,
    range: null,
  });

  const [selected, setSelected] = useState(null);

  const [favorites, setFavorites] = useState(() => new Set());
  const [bookings, setBookings] = useState([]);

  const theme = useMemo(
    () => ({
      token: {
        colorPrimary: beachColors.oceanBlue,
        colorInfo: beachColors.oceanBlue,
        colorSuccess: beachColors.teal,
        colorWarning: beachColors.sunset,
        colorError: beachColors.coral,
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", Arial',
        borderRadius: 14,
        controlHeight: 40,
      },
    }),
    []
  );

  const setFormPatch = (patch) => setForm((s) => ({ ...s, ...patch }));

  const goHome = () => setView("home");
  const goSearch = () => {
    setView("search");
    message.info("Búsqueda abierta");
  };
  const goAccount = () => setView("account");

  const toggleFav = (key) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        message.info("Quitado de favoritos");
      } else {
        next.add(key);
        message.success("Guardado en favoritos");
      }
      return next;
    });
  };

  const reserveFromFeatured = (item) => {
    setSelected(item);
    setView("detail");
    message.success("Abriendo detalle");
  };

  const reserveFromSearch = (it) => {
    setSelected(it);
    setView("detail");
    message.success("Detalle seleccionado");
  };

  const confirmReserve = (payload) => {
    const s = SUCURSALES.find((x) => x.key === payload.branch);
    const branchLabel = s ? `${s.name} · ${s.subtitle}` : "Sucursal";

    const newBooking = {
      key: `b-${dayjs().valueOf()}`,
      title: selected?.title || "Reserva",
      img:
        selected?.img ||
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=70",
      stars: Math.round((selected?.rating || 4.5) * 2) / 2,
      details: `${branchLabel} · ${payload.nights} noche(s) · ${payload.people} huésped(es)`,
      status: { text: "Próxima", color: "turquoise" },
      payload,
      selected,
    };

    setBookings((b) => [newBooking, ...b]);
    message.success("Reserva confirmada ✅");
    setView("account");
  };

  const pickSucursal = (key) => {
    setFormPatch({ branch: key });
    message.success("Sucursal seleccionada");
    setView("search");
  };

  return (
    <ConfigProvider theme={theme}>
      <Layout className="hf-app">
        <Content className="hf-root">
          {/* Notch / Barra superior (solo hover en centro) */}
          <NotchBar view={view} setView={setView} />

          <div className="hf-canvasWrap">
            <div className="hf-canvas">
              <Navbar
                variant={view === "search" ? "light" : "gradient"}
                onGoSearch={goSearch}
                onGoAccount={goAccount}
                onGoHome={goHome}
              />

              {view === "home" ? (
                <HomePage
                  form={form}
                  setFormPatch={setFormPatch}
                  onSearch={goSearch}
                  onReserveFeatured={reserveFromFeatured}
                  onPickSucursal={pickSucursal}
                  favorites={favorites}
                  onToggleFav={toggleFav}
                />
              ) : null}

              {view === "search" ? (
                <SearchPage
                  initialForm={form}
                  onReserveGoDetail={reserveFromSearch}
                  favorites={favorites}
                  onToggleFav={toggleFav}
                />
              ) : null}

              {view === "detail" ? (
                <DetailPage
                  selectedItem={selected}
                  initialForm={form}
                  onConfirm={confirmReserve}
                />
              ) : null}

              {view === "account" ? (
                <AccountPage
                  bookings={bookings}
                  favoritesCount={favorites.size}
                  onOpenDetail={(b) => {
                    setSelected(b.selected || null);
                    setView("detail");
                    message.info("Mostrando detalle");
                  }}
                />
              ) : null}

              <Footer />
            </div>
          </div>
        </Content>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
