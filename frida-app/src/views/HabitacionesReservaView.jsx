// src/views/HabitacionesView.jsx
import { useState, useMemo } from "react";
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
  Popover,
  Dropdown,
  Modal,
  Divider,
} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  CalendarOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  UserOutlined,
  MoreOutlined,
  LoginOutlined,
  LogoutOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";

import { isMobile } from "react-device-detect";

dayjs.locale("es");

const { Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* ===================== HELPERS ID ===================== */

const genId = () => {
  try {
    // modern browsers
    return crypto.randomUUID();
  } catch {
    return `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
};

/* ===================== DATA EN MEMORIA (EDITA AQUÍ) ===================== */

const HABITACIONES_SEED = [
  // Casa Frida
  {
    id: "cf-101",
    codigo: "101",
    roomNumber: "101",
    title: "Suite Garden",
    hotelCode: "casa_frida",
  },
  {
    id: "cf-102",
    codigo: "102",
    roomNumber: "102",
    title: "Ocean View",
    hotelCode: "casa_frida",
  },

  // Cabañas Fridas
  {
    id: "cb-201",
    codigo: "201",
    roomNumber: "201",
    title: "Cabaña Deluxe",
    hotelCode: "cabanas_fridas",
  },
  {
    id: "cb-202",
    codigo: "202",
    roomNumber: "202",
    title: "Cabaña Familiar",
    hotelCode: "cabanas_fridas",
  },
];

// Si quieres empezar vacío, deja esto como []
const EVENTOS_SEED = [
  {
    id: "evt_seed_1",
    hotel: "casa_frida",
    room: "101",
    type: "stay",
    startDate: dayjs().add(1, "day").format("YYYY-MM-DD"),
    endDate: dayjs().add(3, "day").format("YYYY-MM-DD"),
    label: "Reserva Daniel · pagado",
    origen: "seed",
    // checkinAt / checkoutAt se agregan cuando aplique
  },
  {
    id: "evt_seed_2",
    hotel: "cabanas_fridas",
    room: "201",
    type: "cleaning",
    startDate: dayjs().format("YYYY-MM-DD"),
    label: "Limpieza programada · AM",
    origen: "seed",
  },
];

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

/* ===================== META TIPOS (BASE) ===================== */

const metaTipo = (type) => {
  switch (type) {
    case "checkin":
      return { color: "#22c55e", labelCorto: "Ent.", labelLargo: "Entrada" };
    case "checkout":
      return { color: "#fb7185", labelCorto: "Sal.", labelLargo: "Salida" };
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
      return { color: "#fbbf24", labelCorto: "Limp.", labelLargo: "Limpieza" };
    case "block":
      return { color: "#9ca3af", labelCorto: "Bloq.", labelLargo: "Bloqueo" };
    default:
      return {
        color: beachColors.teal,
        labelCorto: "",
        labelLargo: "Movimiento",
      };
  }
};

/**
 * Estado derivado:
 * - Las reservas (stay / stay_open) NO se crean como check-in/out.
 * - check-in/out se registran desde un submenú dentro del tooltip (acciones).
 * - Visualmente podemos reflejar el estado con el color/label de entrada/salida.
 */
const metaEvento = (evento) => {
  if (evento?.type === "stay" || evento?.type === "stay_open") {
    if (evento.checkoutAt) return metaTipo("checkout");
    if (evento.checkinAt) return metaTipo("checkin");
    return metaTipo(evento.type);
  }
  return metaTipo(evento?.type);
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
  const fin = evento.endDate ? dayjs(evento.endDate).format("DD/MM/YYYY") : "";

  if (evento.type === "stay" && inicio && fin) return `${inicio} al ${fin}`;
  if (evento.type === "stay_open" && inicio)
    return `Desde ${inicio} · Sin fecha de salida`;
  if (inicio && !fin) return inicio;
  return "";
};

const eventoCubreFecha = (evento, fechaStr) => {
  const inicio = evento.startDate;
  const fin = evento.endDate;
  if (!inicio) return false;

  if (evento.type === "stay_open") return fechaStr >= inicio;
  if (fin) return fechaStr >= inicio && fechaStr <= fin;
  return fechaStr === inicio;
};

/* ===================== TOOLTIP CONTENT COMPONENT ===================== */

const TooltipContenidoEvento = ({
  evento,
  onCheckin,
  onCheckout,
  onDelete,
}) => {
  const meta = metaEvento(evento);
  const hotelLabel = getHotelLabel(evento.hotel);
  const fechas = buildFechasTexto(evento);
  const detalleCorto = recortar(evento.label, 90);

  const esReserva = evento.type === "stay" || evento.type === "stay_open";
  const tieneCheckin = !!evento.checkinAt;
  const tieneCheckout = !!evento.checkoutAt;

  const accionesItems = [
    !tieneCheckin && esReserva
      ? {
          key: "checkin",
          icon: <LoginOutlined />,
          label: "Marcar entrada (check-in)",
        }
      : null,
    tieneCheckin && !tieneCheckout && esReserva
      ? {
          key: "checkout",
          icon: <LogoutOutlined />,
          label: "Marcar salida (check-out)",
        }
      : null,
    esReserva
      ? {
          key: "delete",
          icon: <DeleteOutlined />,
          label: "Eliminar reserva",
          danger: true,
        }
      : {
          key: "delete",
          icon: <DeleteOutlined />,
          label: "Eliminar movimiento",
          danger: true,
        },
  ].filter(Boolean);

  const handleAccion = ({ key }) => {
    if (key === "checkin") {
      onCheckin?.(evento.id);
      return;
    }
    if (key === "checkout") {
      onCheckout?.(evento.id);
      return;
    }
    if (key === "delete") {
      Modal.confirm({
        title: esReserva ? "Eliminar reserva" : "Eliminar movimiento",
        content: esReserva
          ? "Esto eliminará la reserva del calendario. ¿Deseas continuar?"
          : "Esto eliminará el movimiento del calendario. ¿Deseas continuar?",
        okText: "Eliminar",
        okButtonProps: { danger: true },
        cancelText: "Cancelar",
        onOk: () => onDelete?.(evento.id),
      });
    }
  };

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
        minWidth: 260,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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

        {(evento.type === "stay" || evento.type === "stay_open") && (
          <>
            <Divider style={{ margin: "6px 0" }} />
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                fontSize: 9.5,
                color: neutrals.textMuted,
              }}
            >
              {evento.checkinAt ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    border: "1px solid #bbf7d0",
                    color: "#065f46",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <LoginOutlined />
                  Entrada: <b>{dayjs(evento.checkinAt).format("DD/MM/YYYY")}</b>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e3a8a",
                  }}
                >
                  Sin check-in
                </span>
              )}

              {evento.checkoutAt ? (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#fff1f2",
                    border: "1px solid #fecdd3",
                    color: "#9f1239",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <LogoutOutlined />
                  Salida: <b>{dayjs(evento.checkoutAt).format("DD/MM/YYYY")}</b>
                </span>
              ) : (
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#334155",
                  }}
                >
                  Sin check-out
                </span>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Dropdown
                trigger={isMobile ? ["click"] : ["hover"]}
                menu={{ items: accionesItems, onClick: handleAccion }}
              >
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  style={{
                    borderRadius: 999,
                    marginTop: 6,
                  }}
                >
                  Acciones
                </Button>
              </Dropdown>
            </div>
          </>
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
      const meta = metaEvento(e);
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
                }}
              />
              <span style={{ fontWeight: 500 }}>
                {meta.labelLargo} · {getHotelLabel(e.hotel)} · Hab {e.room}
              </span>
            </div>
          </div>

          {detalle && (
            <div style={{ fontSize: 9.5, color: neutrals.textMuted }}>
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
      const { hotel, habitacion, tipo, huesped, fecha, rango, fechaInicio, notas } =
        valores;

      const habitacionObj = habitaciones.find((h) => h.id === habitacion);

      if (!habitacionObj) {
        message.error("Selecciona una habitación válida.");
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
        return;
      }

      const nombreHuesped = huesped ? ` ${huesped}` : "";
      const notasTexto = notas ? ` · ${notas}` : "";

      if (tipo === "stay") {
        if (!rango || rango.length !== 2) {
          message.error(
            "Selecciona fechas de entrada y salida (pueden ser el mismo día)."
          );
          return;
        }

        const inicio = rango[0].startOf("day").format("YYYY-MM-DD");
        const fin = rango[1].startOf("day").format("YYYY-MM-DD");
        const etiquetaBase = `Reserva${nombreHuesped}`.trim() || "Reserva";
        const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

        onCrearEvento({
          id: genId(),
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
        return;
      }

      if (tipo === "stay_open") {
        if (!fechaInicio) {
          message.error("Selecciona la fecha de entrada.");
          return;
        }

        const inicio = fechaInicio.startOf("day").format("YYYY-MM-DD");
        const etiquetaBase =
          `Estancia abierta${nombreHuesped}`.trim() || "Estancia abierta";
        const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

        onCrearEvento({
          id: genId(),
          hotel: hotelFinal,
          room: roomFinal,
          type: "stay_open",
          startDate: inicio,
          label: etiquetaFinal,
          origen: "manual",
        });

        formulario.resetFields();
        message.success("Estancia abierta registrada.");
        return;
      }

      if (!fecha) {
        message.error("Selecciona la fecha.");
        return;
      }

      const fechaUnica = fecha.startOf("day").format("YYYY-MM-DD");
      let etiquetaBase = "";

      switch (tipo) {
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
        id: genId(),
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

  const habitacionesFiltradas = useMemo(
    () =>
      habitaciones.filter((h) =>
        hotelSeleccionado ? h.hotelCode === hotelSeleccionado : true
      ),
    [habitaciones, hotelSeleccionado]
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
        <Text style={{ fontSize: 12, fontWeight: 600, color: neutrals.textMain }}>
          Programar habitación manualmente
        </Text>

        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Registra <b>reservas</b>, <b>estancias abiertas</b>, <b>limpiezas</b> y{" "}
          <b>bloqueos</b>. <br />
          El <b>check-in</b> y <b>check-out</b> se marcan desde el{" "}
          <b>tooltip (Acciones)</b> de la reserva para no saturar el formulario.
        </Text>

        <Form
          form={formulario}
          layout={esMobile ? "vertical" : "inline"}
          onFinish={manejarEnvio}
          style={{ width: "100%", marginTop: 4, rowGap: 6 }}
        >
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

          <Form.Item
            name="habitacion"
            rules={[{ required: true, message: "Selecciona la habitación" }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder={loadingHabitaciones ? "Cargando..." : "Habitación"}
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
                if (hab)
                  formulario.setFieldsValue({
                    habitacion: value,
                    hotel: hab.hotelCode,
                  });
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
              <Option value="stay">Reserva (1 o varios días)</Option>
              <Option value="stay_open">Estancia abierta</Option>
              <Option value="cleaning">Limpieza</Option>
              <Option value="block">Bloqueo</Option>
            </Select>
          </Form.Item>

          {tipoSeleccionado === "stay" ? (
            <Form.Item
              name="rango"
              rules={[{ required: true, message: "Selecciona entrada y salida." }]}
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
              rules={[{ required: true, message: "Selecciona la fecha de entrada" }]}
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
              rules={[{ required: true, message: "Selecciona la fecha" }]}
              style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            >
              <DatePicker
                size="small"
                format="DD/MM/YYYY"
                style={{ width: esMobile ? "100%" : 140 }}
              />
            </Form.Item>
          )}

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

          <Form.Item style={{ marginBottom: 6 }}>
            <Button
              type="primary"
              htmlType="submit"
              size="small"
              style={{
                borderRadius: 999,
                paddingInline: 16,
                background: beachColors.oceanBlue,
                borderColor: beachColors.oceanBlue,
              }}
              loading={enviando}
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
  const esMobileFinal =
    typeof forzarMobile === "boolean" ? forzarMobile : esMobileDetectado;
  const compacto = esMobileFinal;

  // Data en memoria
  const [habitaciones] = useState(HABITACIONES_SEED);
  const [eventos, setEventos] = useState(EVENTOS_SEED);

  // Ya no hay carga API
  const [loadingHabitaciones] = useState(false);

  const [filtroHotel, setFiltroHotel] = useState("all");

  const manejarCrearEvento = (nuevoEvento) => {
    setEventos((anteriores) => [
      ...anteriores,
      { ...nuevoEvento, id: nuevoEvento.id || genId() },
    ]);
  };

  const marcarCheckin = (eventoId) => {
    setEventos((prev) =>
      prev.map((e) => {
        if (e.id !== eventoId) return e;
        if (e.type !== "stay" && e.type !== "stay_open") return e;
        if (e.checkinAt) return e;
        return { ...e, checkinAt: dayjs().format("YYYY-MM-DD") };
      })
    );
    message.success("Entrada (check-in) registrada.");
  };

  const marcarCheckout = (eventoId) => {
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return;

    if ((evento.type === "stay" || evento.type === "stay_open") && !evento.checkinAt) {
      message.warning("Primero marca la entrada (check-in).");
      return;
    }

    setEventos((prev) =>
      prev.map((e) => {
        if (e.id !== eventoId) return e;
        if (e.type !== "stay" && e.type !== "stay_open") return e;
        if (e.checkoutAt) return e;
        return { ...e, checkoutAt: dayjs().format("YYYY-MM-DD") };
      })
    );
    message.success("Salida (check-out) registrada.");
  };

  const eliminarEvento = (eventoId) => {
    setEventos((prev) => prev.filter((e) => e.id !== eventoId));
    message.success("Eliminado.");
  };

  // ===================== HEADER RESPONSIVE (ARREGLADO) =====================
  const headerWrapStyle = {
    display: "grid",
    gridTemplateColumns: compacto ? "1fr" : "max-content 1fr",
    alignItems: "center",
    columnGap: 12,
    rowGap: 10,
    width: "100%",
    minWidth: 0,
  };

  const headerTitleStyle = {
    fontWeight: 600,
    color: neutrals.textMain,
    fontSize: 15,
    lineHeight: 1.2,
    whiteSpace: compacto ? "normal" : "nowrap",
    minWidth: 0,
  };

  const headerRightStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 0,
  };

  const legendWrapStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    minWidth: 0,
  };

  const tagBase = {
    borderRadius: 999,
    fontSize: 9,
    whiteSpace: "nowrap",
    lineHeight: "18px",
    paddingInline: 10,
    paddingBlock: 2,
  };

  // ✅ ya NO mostramos Entrada/Salida arriba (se manejan desde tooltip->Acciones)
  const leyendaTipos = (
    <div style={legendWrapStyle}>
      <Tag color="#38bdf8" style={{ ...tagBase, color: "#0f172a" }}>
        Reserva 1 o varios días
      </Tag>
      <Tag color="#4f46e5" style={{ ...tagBase, color: "#eff6ff" }}>
        Estancia abierta
      </Tag>
      <Tag color="#fbbf24" style={tagBase}>
        Limpieza
      </Tag>
      <Tag
        style={{
          ...tagBase,
          color: "#111827",
          background: "#e5e7eb",
          border: "none",
        }}
      >
        Bloqueo
      </Tag>
    </div>
  );

  const selectorHotel = (
    <Select
      size="small"
      value={filtroHotel}
      onChange={setFiltroHotel}
      style={{ minWidth: 160 }}
      dropdownMatchSelectWidth={false}
    >
      <Option value="all">Todas las sedes</Option>
      <Option value="casa_frida">Casa Frida</Option>
      <Option value="cabanas_fridas">Cabañas Fridas</Option>
    </Select>
  );

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
          const meta = metaEvento(item);
          const shortHotel = getHotelShort(item.hotel);

          const etiquetaCorta = `${shortHotel ? `${shortHotel} · ` : ""}Hab ${
            item.room
          } · ${meta.labelCorto}`.trim();

          return (
            <Popover
              key={`${item.id || ""}-${item.startDate || ""}-${item.room}-${indice}-${item.type}-${item.hotel || "x"}`}
              content={
                <TooltipContenidoEvento
                  evento={item}
                  onCheckin={marcarCheckin}
                  onCheckout={marcarCheckout}
                  onDelete={eliminarEvento}
                />
              }
              color="#ffffff"
              overlayInnerStyle={{
                background: "#ffffff",
                borderRadius: 14,
                boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
                border: "1px solid #e5e7eb",
                padding: 10,
              }}
              trigger={isMobile ? "click" : "hover"}
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
            </Popover>
          );
        })}

        {extras.length > 0 && (
          <Popover
            content={tooltipContenidoListaExtra(extras)}
            color="#ffffff"
            overlayInnerStyle={{
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
              border: "1px solid #e5e7eb",
              padding: 10,
            }}
            trigger={isMobile ? "click" : "hover"}
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
              +{extras.length} más
            </li>
          </Popover>
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
        <div style={headerWrapStyle}>
          <Text style={headerTitleStyle}>Calendario de ocupación centralizado</Text>
          <div style={headerRightStyle}>
            {leyendaTipos}
            {selectorHotel}
          </div>
        </div>
      }
    >
      <PanelProgramacionManual
        esMobile={esMobileFinal}
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
              for (let i = 0; i < 12; i++)
                meses.push(value.clone().month(i).format("MMM"));

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
                  <Text style={{ fontWeight: 600, color: neutrals.textMain, fontSize: 13 }}>
                    {value.format("MMMM YYYY")}
                  </Text>

                  <Space size={6} wrap>
                    <Select
                      size="small"
                      value={value.month()}
                      onChange={(mes) => onChange(value.clone().month(mes))}
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
                      onChange={(anio) => onChange(value.clone().year(anio))}
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
