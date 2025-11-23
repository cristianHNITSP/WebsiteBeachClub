// src/views/HabitacionesView.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Space,
  Tag,
  Typography,
  Calendar,
  Select,
  Form,
  Input,
  DatePicker,
  Button,
  message,
  Grid,
  Tooltip,
} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  CalendarOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

dayjs.locale("es");

const { Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* ===================== SEDES ===================== */

const HOTELES = {
  casa_frida: "Casa Frida",
  cabanas_fridas: "Cabañas Fridas",
};

const HOTELES_SHORT = {
  casa_frida: "CF",
  cabanas_fridas: "CB",
};

const getHotelLabel = (hotel) => HOTELES[hotel] || "Sede no especificada";
const getHotelShort = (hotel) => HOTELES_SHORT[hotel] || "";

/* ===================== META TIPOS ===================== */

const metaTipo = (type) => {
  switch (type) {
    case "checkin":
      return {
        color: "#22c55e",
        labelCorto: "Ent.",
        labelLargo: "Entrada",
      };
    case "checkout":
      return {
        color: "#fb7185",
        labelCorto: "Sal.",
        labelLargo: "Salida",
      };
    case "stay":
      return {
        color: "#38bdf8",
        labelCorto: "Res.",
        labelLargo: "Reserva (1 o varios días)",
      };
    case "stay_open":
      return {
        color: "#4f46e5",
        labelCorto: "Abierta",
        labelLargo: "Estancia abierta",
      };
    case "cleaning":
      return {
        color: "#fbbf24",
        labelCorto: "Limp.",
        labelLargo: "Limpieza",
      };
    case "block":
      return {
        color: "#9ca3af",
        labelCorto: "Bloq.",
        labelLargo: "Bloqueo",
      };
    default:
      return {
        color: beachColors.teal,
        labelCorto: "",
        labelLargo: "Movimiento",
      };
  }
};

/* ===================== HELPERS TOOLTIP ===================== */

const recortar = (texto, max = 90) => {
  if (!texto) return "";
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto;
};

const buildFechasTexto = (evento) => {
  const inicio = evento.startDate
    ? dayjs(evento.startDate).format("DD/MM/YYYY")
    : "";
  const fin = evento.endDate
    ? dayjs(evento.endDate).format("DD/MM/YYYY")
    : "";

  if (evento.type === "stay" && inicio && fin) {
    return `${inicio} al ${fin}`;
  }

  if (evento.type === "stay_open" && inicio) {
    return `Desde ${inicio} · Sin fecha de salida`;
  }

  if (inicio && !fin) {
    return inicio;
  }

  return "";
};

const tooltipContenidoEvento = (evento) => {
  const meta = metaTipo(evento.type);
  const hotelLabel = getHotelLabel(evento.hotel);
  const fechas = buildFechasTexto(evento);
  const detalleCorto = recortar(evento.label, 90);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        color: neutrals.textMain,
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontSize: 11,
      }}
    >
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 4,
              height: 26,
              borderRadius: 999,
              background: meta.color,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <span
              style={{
                fontSize: 9,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: neutrals.textMuted,
              }}
            >
              Movimiento
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: neutrals.textMain,
              }}
            >
              {meta.labelLargo}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            alignItems: "flex-end",
          }}
        >
          {evento.hotel && (
            <span
              style={{
                fontSize: 9,
                padding: "2px 8px",
                borderRadius: 999,
                border: `1px solid ${meta.color}`,
                background: "#f9fafb",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: neutrals.textMain,
              }}
            >
              <HomeOutlined style={{ fontSize: 9, color: meta.color }} />
              {hotelLabel}
            </span>
          )}
          <span
            style={{
              fontSize: 9,
              padding: "2px 8px",
              borderRadius: 999,
              background: "#eff6ff",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              color: neutrals.textMain,
            }}
          >
            Habitación <strong>#{evento.room}</strong>
          </span>
        </div>
      </div>

      {/* Bloque de info */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          marginTop: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: neutrals.textMain,
          }}
        >
          <CalendarOutlined style={{ fontSize: 11, color: meta.color }} />
          <span>
            {fechas || "Movimiento de un solo día registrado en calendario."}
          </span>
        </div>

        {detalleCorto && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
              fontSize: 10,
              color: neutrals.textMain,
            }}
          >
            <UserOutlined
              style={{ fontSize: 11, color: neutrals.textMuted, marginTop: 1 }}
            />
            <span>{detalleCorto}</span>
          </div>
        )}
      </div>

      {evento.origen === "manual" && (
        <div
          style={{
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 8.5,
            color: neutrals.textMuted,
          }}
        >
          <InfoCircleOutlined style={{ fontSize: 9, color: meta.color }} />
          <span>Registrado desde el panel interno (recepción / staff).</span>
        </div>
      )}
    </div>
  );
};

const tooltipContenidoListaExtra = (lista) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      color: neutrals.textMain,
      fontFamily:
        '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      fontSize: 10.5,
    }}
  >
    <div
      style={{
        fontWeight: 600,
        fontSize: 11.5,
        paddingBottom: 4,
        borderBottom: "1px solid #e5e7eb",
        marginBottom: 2,
        color: neutrals.textMain,
      }}
    >
      Otros movimientos en este día
    </div>
    {lista.map((e, idx) => {
      const meta = metaTipo(e.type);
      const fechas = buildFechasTexto(e);
      const detalle = recortar(e.label, 70);

      return (
        <div
          key={`${e.startDate || ""}-${e.room}-${idx}-${e.type}`}
          style={{
            padding: 6,
            borderRadius: 10,
            background: "#f9fafb",
            border: "1px solid #eef2ff",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 6,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10.5,
                color: neutrals.textMain,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "999px",
                  backgroundColor: meta.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 500 }}>
                {meta.labelLargo} · {getHotelLabel(e.hotel)} · Hab {e.room}
              </span>
            </div>
          </div>

          {detalle && (
            <div
              style={{
                fontSize: 9.5,
                color: neutrals.textMuted,
              }}
            >
              {detalle}
            </div>
          )}

          {fechas && (
            <div
              style={{
                fontSize: 9,
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: neutrals.textMuted,
              }}
            >
              <CalendarOutlined style={{ fontSize: 9, color: meta.color }} />
              <span>{fechas}</span>
            </div>
          )}
        </div>
      );
    })}
  </div>
);

/* ===================== COBERTURA FECHA ===================== */

const eventoCubreFecha = (evento, fechaStr) => {
  const inicio = evento.startDate;
  const fin = evento.endDate;
  if (!inicio) return false;

  if (evento.type === "stay_open") {
    return fechaStr >= inicio;
  }

  if (fin) {
    return fechaStr >= inicio && fechaStr <= fin;
  }

  return fechaStr === inicio;
};

/* ===================== PANEL PROGRAMACIÓN ===================== */

const PanelProgramacionManual = ({
  esMobile,
  onCrearEvento,
  habitaciones,
  loadingHabitaciones,
}) => {
  const [formulario] = Form.useForm();
  const [enviando, setEnviando] = useState(false);
  const tipoSeleccionado = Form.useWatch("tipo", formulario);
  const hotelSeleccionado = Form.useWatch("hotel", formulario);

  const manejarEnvio = (valores) => {
    setEnviando(true);

    try {
      const {
        hotel,
        habitacion,
        tipo,
        huesped,
        fecha,
        rango,
        fechaInicio,
        notas,
      } = valores;

      const habitacionObj = habitaciones.find((h) => h.id === habitacion);

      if (!habitacionObj) {
        message.error("Selecciona una habitación válida.");
        setEnviando(false);
        return;
      }

      const hotelFinal = hotel || habitacionObj.hotelCode;
      const roomFinal =
        habitacionObj.roomNumber ||
        habitacionObj.codigo ||
        habitacionObj.id?.slice(-4) ||
        "?";

      if (!tipo) {
        message.error("Selecciona el tipo de movimiento.");
        setEnviando(false);
        return;
      }

      const nombreHuesped = huesped ? ` ${huesped}` : "";
      const notasTexto = notas ? ` · ${notas}` : "";

      // Reserva 1 o varios días
      if (tipo === "stay") {
        if (!rango || rango.length !== 2) {
          message.error(
            "Selecciona fechas de entrada y salida (pueden ser el mismo día)."
          );
          setEnviando(false);
          return;
        }

        const inicio = rango[0].startOf("day").format("YYYY-MM-DD");
        const fin = rango[1].startOf("day").format("YYYY-MM-DD");
        const etiquetaBase =
          `Reserva${nombreHuesped}`.trim() || "Reserva";
        const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

        onCrearEvento({
          hotel: hotelFinal,
          room: roomFinal,
          type: "stay",
          startDate: inicio,
          endDate: fin,
          label: etiquetaFinal,
          origen: "manual",
        });

        formulario.resetFields();
        message.success("Reserva registrada en el calendario.");
        setEnviando(false);
        return;
      }

      // Estancia abierta
      if (tipo === "stay_open") {
        if (!fechaInicio) {
          message.error("Selecciona la fecha de entrada.");
          setEnviando(false);
          return;
        }

        const inicio = fechaInicio.startOf("day").format("YYYY-MM-DD");
        const etiquetaBase =
          `Estancia abierta${nombreHuesped}`.trim() ||
          "Estancia abierta";
        const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

        onCrearEvento({
          hotel: hotelFinal,
          room: roomFinal,
          type: "stay_open",
          startDate: inicio,
          label: etiquetaFinal,
          origen: "manual",
        });

        formulario.resetFields();
        message.success("Estancia abierta registrada.");
        setEnviando(false);
        return;
      }

      // Eventos de un solo día: entrada, salida, limpieza, bloqueo
      if (!fecha) {
        message.error("Selecciona la fecha.");
        setEnviando(false);
        return;
      }

      const fechaUnica = fecha.startOf("day").format("YYYY-MM-DD");
      let etiquetaBase = "";

      switch (tipo) {
        case "checkin":
          etiquetaBase = `Entrada${nombreHuesped}`.trim();
          break;
        case "checkout":
          etiquetaBase = `Salida${nombreHuesped}`.trim();
          break;
        case "cleaning":
          etiquetaBase = "Limpieza programada";
          break;
        case "block":
          etiquetaBase = "Bloqueo manual";
          break;
        default:
          etiquetaBase = "Movimiento manual";
      }

      const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

      onCrearEvento({
        hotel: hotelFinal,
        room: roomFinal,
        type,
        startDate: fechaUnica,
        label: etiquetaFinal,
        origen: "manual",
      });

      formulario.resetFields();
      message.success("Movimiento registrado en el calendario.");
    } catch (error) {
      console.error(error);
      message.error("No se pudo registrar el movimiento.");
    } finally {
      setEnviando(false);
    }
  };

  const habitacionesFiltradas = habitaciones.filter((h) =>
    hotelSeleccionado ? h.hotelCode === hotelSeleccionado : true
  );

  return (
    <div
      style={{
        padding: esMobile ? 10 : 12,
        marginBottom: 10,
        borderRadius: 12,
        background: "#f9fafb",
        border: "1px solid #e5e7eb",
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
    >
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: neutrals.textMain,
          }}
        >
          Programar habitación manualmente
        </Text>

        <Text
          style={{
            fontSize: 10,
            color: neutrals.textMuted,
          }}
        >
          Registra <b>entradas</b>, <b>salidas</b>, <b>reservas (1 o varios días)</b>,
          estancias abiertas, limpiezas y bloqueos para Casa Frida y Cabañas
          Fridas.
        </Text>

        <Form
          form={formulario}
          layout={esMobile ? "vertical" : "inline"}
          onFinish={manejarEnvio}
          style={{
            width: "100%",
            marginTop: 4,
            rowGap: 6,
          }}
        >
          {/* Sede */}
          <Form.Item
            name="hotel"
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder="Sede"
              style={{ width: esMobile ? "100%" : 150 }}
              allowClear
            >
              <Option value="casa_frida">Casa Frida</Option>
              <Option value="cabanas_fridas">Cabañas Fridas</Option>
            </Select>
          </Form.Item>

          {/* Habitación */}
          <Form.Item
            name="habitacion"
            rules={[{ required: true, message: "Selecciona la habitación" }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder={
                loadingHabitaciones
                  ? "Cargando habitaciones..."
                  : "Habitación"
              }
              style={{ width: esMobile ? "100%" : 260 }}
              loading={loadingHabitaciones}
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }
              onChange={(value) => {
                const hab = habitaciones.find((h) => h.id === value);
                if (hab) {
                  formulario.setFieldsValue({
                    habitacion: value,
                    hotel: hab.hotelCode,
                  });
                }
              }}
            >
              {habitacionesFiltradas.map((h) => {
                const short = getHotelShort(h.hotelCode);
                const etiqueta = `${short ? short + " · " : ""}Hab ${
                  h.roomNumber || h.codigo || "?"
                }${h.title ? " · " + h.title : ""}`;
                return (
                  <Option key={h.id} value={h.id}>
                    {etiqueta}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

          {/* Tipo */}
          <Form.Item
            name="tipo"
            rules={[{ required: true, message: "Selecciona el tipo" }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder="Tipo de movimiento"
              style={{ width: esMobile ? "100%" : 220 }}
            >
              <Option value="checkin">Entrada (check-in)</Option>
              <Option value="checkout">Salida (check-out)</Option>
              <Option value="stay">Reserva (1 o varios días)</Option>
              <Option value="stay_open">Estancia abierta</Option>
              <Option value="cleaning">Limpieza</Option>
              <Option value="block">Bloqueo</Option>
            </Select>
          </Form.Item>

          {/* Fecha según tipo */}
          {tipoSeleccionado === "stay" ? (
            <Form.Item
              name="rango"
              rules={[
                {
                  required: true,
                  message:
                    "Selecciona entrada y salida (pueden ser la misma fecha).",
                },
              ]}
              style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            >
              <RangePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: esMobile ? "100%" : 230 }}
              />
            </Form.Item>
          ) : tipoSeleccionado === "stay_open" ? (
            <Form.Item
              name="fechaInicio"
              rules={[
                {
                  required: true,
                  message: "Selecciona la fecha de entrada",
                },
              ]}
              style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            >
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                placeholder="Fecha entrada"
                style={{ width: esMobile ? "100%" : 140 }}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name="fecha"
              rules={[
                {
                  required: true,
                  message: "Selecciona la fecha",
                },
              ]}
              style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            >
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: esMobile ? "100%" : 140 }}
              />
            </Form.Item>
          )}

          {/* Huésped */}
          <Form.Item
            name="huesped"
            style={{
              marginRight: esMobile ? 0 : 6,
              marginBottom: 6,
              flex: esMobile ? "1 1 100%" : "0 1 180px",
            }}
          >
            <Input
              size="small"
              placeholder="Nombre del huésped (opcional)"
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* Notas */}
          <Form.Item
            name="notas"
            style={{
              marginRight: esMobile ? 0 : 6,
              marginBottom: 6,
              flex: esMobile ? "1 1 100%" : "1 1 200px",
            }}
          >
            <Input
              size="small"
              placeholder="Notas internas (opcional)"
              style={{ width: "100%" }}
            />
          </Form.Item>

          {/* Botón */}
          <Form.Item style={{ marginBottom: 6 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="small"
              loading={enviando}
              style={{
                borderRadius: 999,
                paddingInline: 16,
                background: beachColors.oceanBlue,
                borderColor: beachColors.oceanBlue,
              }}
            >
              Guardar
            </Button>
          </Form.Item>
        </Form>
      </Space>
    </div>
  );
};

/* ===================== VISTA PRINCIPAL ===================== */

const HabitacionesReservaView = ({ isMobile: forzarMobile }) => {
  const puntosCorte = useBreakpoint();
  const esMobileDetectado = !puntosCorte.md;
  const esMobile =
    typeof forzarMobile === "boolean" ? forzarMobile : esMobileDetectado;
  const compacto = esMobile;

  // AHORA el calendario empieza vacío: tú creas todo
  const [eventos, setEventos] = useState([]);

  const [filtroHotel, setFiltroHotel] = useState("all");

  // Habitaciones desde tu API de inventario
  const [habitaciones, setHabitaciones] = useState([]);
  const [loadingHabitaciones, setLoadingHabitaciones] = useState(false);

  useEffect(() => {
    const fetchHabitaciones = async () => {
      try {
        setLoadingHabitaciones(true);
        const res = await axios.get("/api/habitaciones");
        setHabitaciones(res.data || []);
      } catch (err) {
        console.error(err);
        message.error("No se pudieron cargar las habitaciones");
      } finally {
        setLoadingHabitaciones(false);
      }
    };

    fetchHabitaciones();
  }, []);

  const leyendaTipos = (
    <Space size={6} wrap>
      <Tag color="#22c55e" style={{ borderRadius: 999, fontSize: 9 }}>
        Entrada
      </Tag>
      <Tag color="#fb7185" style={{ borderRadius: 999, fontSize: 9 }}>
        Salida
      </Tag>
      <Tag
        color="#38bdf8"
        style={{ borderRadius: 999, fontSize: 9, color: "#0f172a" }}
      >
        Reserva 1 o varios días
      </Tag>
      <Tag
        color="#4f46e5"
        style={{ borderRadius: 999, fontSize: 9, color: "#eff6ff" }}
      >
        Estancia abierta
      </Tag>
      <Tag color="#fbbf24" style={{ borderRadius: 999, fontSize: 9 }}>
        Limpieza
      </Tag>
      <Tag
        style={{
          borderRadius: 999,
          fontSize: 9,
          color: "#111827",
          background: "#e5e7eb",
          border: "none",
        }}
      >
        Bloqueo
      </Tag>
    </Space>
  );

  const selectorHotel = (
    <Select
      size="small"
      value={filtroHotel}
      onChange={setFiltroHotel}
      style={{ minWidth: 150 }}
    >
      <Option value="all">Todas las sedes</Option>
      <Option value="casa_frida">Casa Frida</Option>
      <Option value="cabanas_fridas">Cabañas Fridas</Option>
    </Select>
  );

  const manejarCrearEvento = (nuevoEvento) => {
    setEventos((anteriores) => [...anteriores, nuevoEvento]);
  };

  const renderCeldaFecha = (valor) => {
    const fechaStr = valor.format("YYYY-MM-DD");
    const lista = eventos.filter(
      (e) =>
        eventoCubreFecha(e, fechaStr) &&
        (filtroHotel === "all" || e.hotel === filtroHotel)
    );

    if (!lista.length) return null;

    const maxItems = compacto ? 3 : 4;
    const visibles = lista.slice(0, maxItems);
    const extras = lista.slice(maxItems);
    const restantes = extras.length;

    return (
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          fontFamily:
            '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        }}
      >
        {visibles.map((item, indice) => {
          const meta = metaTipo(item.type);
          const shortHotel = getHotelShort(item.hotel);
          const etiquetaCorta = `${
            shortHotel ? `${shortHotel} · ` : ""
          }Hab ${item.room} · ${meta.labelCorto}`.trim();

          return (
            <Tooltip
              key={`${item.startDate || ""}-${item.room}-${indice}-${
                item.type
              }-${item.hotel || "x"}`}
              title={tooltipContenidoEvento(item)}
              color="#ffffff"
              overlayInnerStyle={{
                background: "#ffffff",
                borderRadius: 14,
                boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
                border: "1px solid #e5e7eb",
              }}
              trigger={["hover", "click"]}
            >
              <li
                style={{
                  marginTop: 2,
                  padding: "2px 4px",
                  borderRadius: 7,
                  fontSize: compacto ? 8 : 9,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  backgroundColor: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "999px",
                    backgroundColor: meta.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    display: "inline-block",
                    maxWidth: "100%",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    color: neutrals.textMain,
                    fontWeight: 500,
                  }}
                >
                  {etiquetaCorta}
                </span>
              </li>
            </Tooltip>
          );
        })}

        {restantes > 0 && (
          <Tooltip
            title={tooltipContenidoListaExtra(extras)}
            color="#ffffff"
            overlayInnerStyle={{
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
              border: "1px solid #e5e7eb",
            }}
            trigger={["hover", "click"]}
          >
            <li
              style={{
                marginTop: 2,
                padding: "2px 4px",
                borderRadius: 7,
                fontSize: compacto ? 8 : 9,
                background: "#eef2ff",
                color: "#111827",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              +{restantes} más
            </li>
          </Tooltip>
        )}
      </ul>
    );
  };

  return (
    <Card
      bordered={false}
      style={{
        marginTop: 4,
        borderRadius: 16,
        background: "#ffffff",
        boxShadow: "0 8px 18px rgba(15,23,42,0.05)",
        fontFamily:
          '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      }}
      title={
        <Space
          size={6}
          direction={compacto ? "vertical" : "horizontal"}
          wrap
        >
          <Text
            style={{
              fontWeight: 600,
              color: neutrals.textMain,
              fontSize: 15,
            }}
          >
            Calendario de ocupación centralizado
          </Text>
          <Tag
            color={beachColors.oceanBlue}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: "#0f172a",
            }}
          >
            Casa Frida & Cabañas Fridas · Reservas, entradas, salidas y
            bloqueos
          </Tag>
          {compacto && (
            <Space size={8} wrap>
              {leyendaTipos}
              {selectorHotel}
            </Space>
          )}
        </Space>
      }
      extra={
        !compacto && (
          <Space size={10} wrap>
            {leyendaTipos}
            {selectorHotel}
          </Space>
        )
      }
    >
      <PanelProgramacionManual
        esMobile={esMobile}
        onCrearEvento={manejarCrearEvento}
        habitaciones={habitaciones}
        loadingHabitaciones={loadingHabitaciones}
      />

      <div
        style={{
          overflowX: compacto ? "auto" : "visible",
          paddingBottom: compacto ? 4 : 0,
        }}
      >
        <div style={{ minWidth: compacto ? 620 : "auto" }}>
          <Calendar
            fullscreen={false}
            defaultValue={dayjs()}
            dateCellRender={renderCeldaFecha}
            headerRender={(props) => {
              const { value, onChange } = props;
              const meses = [];
              for (let i = 0; i < 12; i++) {
                meses.push(value.clone().month(i).format("MMM"));
              }

              return (
                <div
                  style={{
                    padding: "4px 8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 600,
                      color: neutrals.textMain,
                      fontSize: 13,
                    }}
                  >
                    {value.format("MMMM YYYY")}
                  </Text>
                  <Space size={6} wrap>
                    <Select
                      size="small"
                      value={value.month()}
                      onChange={(mes) => {
                        const nuevo = value.clone().month(mes);
                        onChange(nuevo);
                      }}
                      style={{ width: 110 }}
                    >
                      {meses.map((nombreMes, indice) => (
                        <Option key={indice} value={indice}>
                          {nombreMes}
                        </Option>
                      ))}
                    </Select>
                    <Select
                      size="small"
                      value={value.year()}
                      onChange={(anio) => {
                        const nuevo = value.clone().year(anio);
                        onChange(nuevo);
                      }}
                      style={{ width: 90 }}
                    >
                      {[2024, 2025, 2026].map((anio) => (
                        <Option key={anio} value={anio}>
                          {anio}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                </div>
              );
            }}
          />
        </div>
      </div>
    </Card>
  );
};

export default HabitacionesReservaView;
