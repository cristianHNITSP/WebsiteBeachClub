// src/components/reservas/PanelProgramacionManual.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Space,
  Typography,
  Button,
  Form,
  Select,
  DatePicker,
  Input,
  Checkbox,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { beachColors, neutrals } from "../../theme/beachTheme";
import {
  DATE_FMT,
  getHabId,
  getHotelShort,
  getRoomStatusLabel,
  isRoomUnavailable,
  safeLower,
} from "./reservasHelpers";

const { Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const RESERVAS_ENDPOINT = "/api/reservas";
const RESERVAS_HABS_ENDPOINT = "/api/reservas/habitaciones";

const PanelProgramacionManual = ({
  esMobile,
  onCreated,
  filtroHotel,
  messageApi,
  sedesOptions,
  sedesLoading,
}) => {
  const [formulario] = Form.useForm();
  const [enviando, setEnviando] = useState(false);

  const [habOptions, setHabOptions] = useState([]);
  const [loadingHabOptions, setLoadingHabOptions] = useState(false);

  const hotelWatch = Form.useWatch("hotel", formulario);
  const rangoWatch = Form.useWatch("rango", formulario);
  const habWatch = Form.useWatch("habitacion", formulario);

  const hotelActual =
    hotelWatch || (filtroHotel !== "all" ? filtroHotel : undefined);

  const rangoActual = useMemo(() => {
    const r = rangoWatch;
    if (!r || r.length !== 2 || !r[0] || !r[1]) return null;
    const s = r[0].startOf("day").format(DATE_FMT);
    const e = r[1].startOf("day").format(DATE_FMT);
    if (e < s) return null;
    return { startDate: s, endDate: e };
  }, [rangoWatch]);

  const loadHabitacionesOptions = useCallback(
    async ({ q = "" } = {}) => {
      setLoadingHabOptions(true);
      try {
        const params = {};
        if (hotelActual) params.hotel = hotelActual;

        if (rangoActual) {
          params.startDate = rangoActual.startDate;
          params.endDate = rangoActual.endDate;
          params.onlyAvailable = "true";
        }

        if (q && q.trim()) params.q = q.trim();

        const res = await axios.get(RESERVAS_HABS_ENDPOINT, { params });
        const raw = res?.data?.data || [];
        const arr = Array.isArray(raw) ? raw : [];

        if (habWatch) {
          const ok = arr.some(
            (x) => String(getHabId(x)) === String(habWatch)
          );
          if (!ok) formulario.setFieldsValue({ habitacion: undefined });
        }

        setHabOptions(arr);
      } catch (e) {
        console.error("Error cargando habitaciones:", e);
        setHabOptions([]);
      } finally {
        setLoadingHabOptions(false);
      }
    },
    [hotelActual, rangoActual, habWatch, formulario]
  );

  useEffect(() => {
    loadHabitacionesOptions({ q: "" });
  }, [loadHabitacionesOptions]);

  const habById = useMemo(() => {
    const map = new Map();
    for (const h of habOptions) map.set(String(getHabId(h)), h);
    return map;
  }, [habOptions]);

  const manejarEnvio = async (valores) => {
    const msgKey = "create_reserva";
    setEnviando(true);
    messageApi?.loading({
      content: "Guardando la reserva…",
      key: msgKey,
      duration: 0,
    });

    try {
      const { habitacion, huesped, rango, notas, pagada, origen } = valores;

      if (!habitacion) {
        messageApi?.warning({ content: "Elige una habitación.", key: msgKey });
        return;
      }

      const hab = habById.get(String(habitacion));
      if (!hab) {
        messageApi?.warning({
          content: "Esa habitación no es válida. Elige otra.",
          key: msgKey,
        });
        return;
      }

      if (!rango || rango.length !== 2 || !rango[0] || !rango[1]) {
        messageApi?.warning({
          content: "Selecciona entrada y salida.",
          key: msgKey,
        });
        return;
      }

      const inicio = rango[0].startOf("day").format(DATE_FMT);
      const fin = rango[1].startOf("day").format(DATE_FMT);
      if (fin < inicio) {
        messageApi?.warning({
          content: "La salida no puede ser antes de la entrada.",
          key: msgKey,
        });
        return;
      }

      if (isRoomUnavailable(hab)) {
        const estado = getRoomStatusLabel(hab.inventoryStatus);
        messageApi?.warning({
          content: `Esa habitación está ${safeLower(estado)}. Elige otra.`,
          key: msgKey,
        });
        return;
      }

      const nombreHuesped = huesped ? ` ${huesped}` : "";
      const notasTexto = notas ? ` · ${notas}` : "";
      const etiquetaBase = `Reserva${nombreHuesped}`.trim() || "Reserva";
      const etiquetaFinal = `${etiquetaBase}${notasTexto}`;

      const payload = {
        habitacionId: getHabId(hab),
        startDate: inicio,
        endDate: fin,
        label: etiquetaFinal,
        notes: notas || "",
        origen: origen || "directo",
        origenPanel: "manual",
        origenUi: origen || "directo",
        origenSource: "panel",
        origenChannel: origen || "directo",
        origenTag: origen || "directo",
        paid: !!pagada,
      };

      // Si en backend solo mantienes un campo de origen:
      delete payload.origenPanel;
      delete payload.origenUi;
      delete payload.origenSource;
      delete payload.origenChannel;
      delete payload.origenTag;

      const res = await axios.post(RESERVAS_ENDPOINT, payload);
      const created = res?.data?.data || res?.data;
      onCreated?.(created);

      formulario.resetFields();
      formulario.setFieldsValue({ origen: "directo", pagada: false });

      messageApi?.success({
        content: pagada
          ? "Reserva guardada y marcada como pagada."
          : "Reserva guardada.",
        key: msgKey,
      });

      loadHabitacionesOptions({ q: "" });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        messageApi?.error({
          content:
            "Esa habitación ya está ocupada en esas fechas. Prueba otra.",
          key: msgKey,
        });
      } else {
        messageApi?.error({
          content: "Ups… no se pudo guardar. Intenta de nuevo.",
          key: msgKey,
        });
      }
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: neutrals.textMain,
            }}
          >
            Programar reserva
          </Text>

          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            onClick={() => loadHabitacionesOptions({ q: "" })}
            style={{ color: neutrals.textMuted }}
          >
            Actualizar
          </Button>
        </div>

        <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
          Tip: selecciona <b>fechas</b> primero para ver solo habitaciones{" "}
          <b>disponibles</b>.
        </Text>

        <Form
          form={formulario}
          layout={esMobile ? "vertical" : "inline"}
          onFinish={manejarEnvio}
          style={{ width: "100%", marginTop: 4, rowGap: 6 }}
          initialValues={{ pagada: false, origen: "directo" }}
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
              loading={loadingHabOptions || sedesLoading}
              onChange={() =>
                formulario.setFieldsValue({ habitacion: undefined })
              }
            >
              {sedesOptions && sedesOptions.length ? (
                sedesOptions.map((opt) => (
                  <Option key={opt.value} value={opt.value}>
                    {opt.label}
                  </Option>
                ))
              ) : (
                <Option key="no-sedes" value="__no_sede" disabled>
                  No hay sedes activas
                </Option>
              )}
            </Select>
          </Form.Item>

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

          <Form.Item
            name="habitacion"
            rules={[{ required: true, message: "Selecciona la habitación" }]}
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Select
              size="small"
              placeholder={loadingHabOptions ? "Cargando..." : "Habitación"}
              style={{ width: esMobile ? "100%" : 360 }}
              loading={loadingHabOptions}
              showSearch
              filterOption={false}
              onSearch={(q) => loadHabitacionesOptions({ q })}
              onChange={(value) => {
                const hab = habById.get(String(value));
                if (!hab) return;

                if (isRoomUnavailable(hab)) {
                  const estado = getRoomStatusLabel(hab.inventoryStatus);
                  messageApi?.warning({
                    content: `Esa habitación está ${safeLower(estado)}.`,
                    key: "hab_select",
                  });
                  formulario.setFieldsValue({ habitacion: undefined });
                  return;
                }
                formulario.setFieldsValue({
                  habitacion: value,
                  hotel: hab.hotelCode,
                });
              }}
              notFoundContent={
                rangoActual
                  ? "Sin disponibles para ese rango."
                  : "Elige fechas o escribe para buscar."
              }
            >
              {habOptions.map((h) => {
                const short = getHotelShort(h.hotelCode);
                const estado = getRoomStatusLabel(h.inventoryStatus);
                const disponibleTxt =
                  h.available === false ? " · No disponible" : "";
                const etiqueta = `${short ? short + " · " : ""}Hab ${
                  h.roomNumber || h.codigo || "?"
                }${h.title ? " · " + h.title : ""}${
                  estado ? " · " + estado : ""
                }${disponibleTxt}`;

                return (
                  <Option key={getHabId(h)} value={getHabId(h)}>
                    {etiqueta}
                  </Option>
                );
              })}
            </Select>
          </Form.Item>

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
              flex: esMobile ? "1 1 100%" : "1 1 220px",
            }}
          >
            <Input
              size="small"
              placeholder="Notas internas (opcional)"
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name="origen"
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
            rules={[
              {
                required: true,
                message: "Selecciona el origen de la reserva.",
              },
            ]}
          >
            <Select
              size="small"
              placeholder="Origen de la reserva"
              style={{ width: esMobile ? "100%" : 220 }}
              popupMatchSelectWidth={false}
            >
              <Option value="directo">Recepción / venta directa</Option>
              <Option value="whatsapp">WhatsApp</Option>
              <Option value="booking">Booking.com</Option>
              <Option value="expedia">Expedia</Option>
              <Option value="facebook">Facebook / Instagram</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="pagada"
            valuePropName="checked"
            style={{ marginRight: esMobile ? 0 : 6, marginBottom: 6 }}
          >
            <Checkbox>Reserva pagada (monto total liquidado)</Checkbox>
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

export default PanelProgramacionManual;
