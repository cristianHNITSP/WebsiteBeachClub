// src/views/HabitacionesReservaView.jsx
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import axios from "@api/axios";
import {
  Card,
  Space,
  Tag,
  Typography,
  Calendar,
  Select,
  Button,
  message,
  Grid,
  Popover,
  Modal,
  Spin,
  Tabs,
  DatePicker,
} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { ReloadOutlined } from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";
import RoomGridCalendar from "../components/reservas/RoomGridCalendar";
import PanelProgramacionManual from "../components/reservas/PanelProgramacionManual";
import CambiosFechasTab from "../components/reservas/views/CambiosFechasTab";
import PapeleraTab from "../components/reservas/views/PapeleraTab";
import {
  DATE_FMT,
  eventoCubreFecha,
  fmtRange,
  getEventId,
  getHotelLabel,
  getHotelShort,
  metaEvento,
} from "../components/reservas/reservasHelpers";
import {
  TooltipContenidoEvento,
  TooltipListaReservasDia,
} from "../components/reservas/TooltipEvento";

dayjs.locale("es");

const { Text } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;
const { RangePicker } = DatePicker;

/* ===================== ENDPOINTS ===================== */
const RESERVAS_ENDPOINT = "/api/reservas";
const SEDES_ENDPOINT = "/api/sedes";

/* ===================== VISTA PRINCIPAL ===================== */
const HabitacionesReservaView = ({ isMobile: forzarMobile }) => {
  const [messageApi, contextHolder] = message.useMessage();

  const puntosCorte = useBreakpoint();
  const esMobileDetectado = !puntosCorte.md;
  const esMobileFinal =
    typeof forzarMobile === "boolean" ? forzarMobile : esMobileDetectado;
  const compacto = esMobileFinal;

  const DEBUG_RESERVAS =
    String(import.meta.env.VITE_DEBUG_RESERVAS) === "true";

  const axiosDebugInstalledRef = useRef(false);
  useEffect(() => {
    if (!DEBUG_RESERVAS) return;
    if (axiosDebugInstalledRef.current) return;
    axiosDebugInstalledRef.current = true;

    console.log("[AXIOS DEBUG] instalado", {
      baseURL: axios.defaults.baseURL,
      withCredentials: axios.defaults.withCredentials,
    });

    axios.interceptors.request.use((config) => {
      const reqId = Math.random().toString(16).slice(2);
      config.headers = config.headers || {};
      config.headers["x-debug-reqid"] = reqId;
      config.metadata = { reqId, t0: performance.now() };

      console.groupCollapsed(
        `%c[HTTP ->] ${String(config.method).toUpperCase()} ${config.url}`,
        "color:#2563eb;font-weight:600"
      );
      console.log("reqId:", reqId);
      console.log("params:", config.params);
      console.log("data:", config.data);
      console.log("headers:", config.headers);
      console.groupEnd();

      return config;
    });

    axios.interceptors.response.use(
      (res) => {
        const md = res.config.metadata || {};
        const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
        console.groupCollapsed(
          `%c[HTTP <-] ${res.status} ${res.config.url} (${ms}ms)`,
          "color:#16a34a;font-weight:600"
        );
        console.log("reqId:", md.reqId);
        console.log("data:", res.data);
        console.groupEnd();
        return res;
      },
      (err) => {
        const cfg = err.config || {};
        const md = cfg.metadata || {};
        const ms = md.t0 ? Math.round(performance.now() - md.t0) : "?";
        console.groupCollapsed(
          `%c[HTTP !!] ${(cfg.method || "??").toUpperCase()} ${
            cfg.url
          } (${ms}ms)`,
          "color:#dc2626;font-weight:600"
        );
        console.log("reqId:", md.reqId);
        console.log("status:", err?.response?.status);
        console.log("response:", err?.response?.data);
        console.log("message:", err?.message);
        console.groupEnd();
        return Promise.reject(err);
      }
    );
  }, [DEBUG_RESERVAS]);

  const [eventos, setEventos] = useState([]);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [filtroHotel, setFiltroHotel] = useState("all");

  const [sedes, setSedes] = useState([]);
  const [loadingSedes, setLoadingSedes] = useState(false);

  const [pending, setPending] = useState({});
  const setPendingAction = (id, action, value) => {
    const sid = String(id);
    setPending((prev) => {
      const cur = prev[sid] || {};
      const next = { ...cur, [action]: !!value };
      next.any = [
        "checkin",
        "checkout",
        "paid",
        "unpaid",
        "delete",
        "dates",
        "restore",
        "hard_delete",
      ].some((k) => !!next[k]);
      return { ...prev, [sid]: next };
    });
  };

  // 🔁 contador para forzar recarga de CambiosFechasTab
  const [dateChangesReloadKey, setDateChangesReloadKey] = useState(0);
  const notifyDateChange = useCallback(() => {
    setDateChangesReloadKey((k) => k + 1);
  }, []);

  // 🔁 contador para forzar recarga de PapeleraTab
  const [trashReloadKey, setTrashReloadKey] = useState(0);
  const notifyTrashChange = useCallback(() => {
    setTrashReloadKey((k) => k + 1);
  }, []);

  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const popoverLocksRef = useRef(new Map());
  const lastOpenAtRef = useRef(0);

  const setPopoverLocked = useCallback((key, locked) => {
    if (!key) return;
    popoverLocksRef.current.set(String(key), !!locked);
  }, []);

  const closeAllPopovers = () => setOpenPopoverKey(null);

  const setPopoverOpenSafe = (key, open) => {
    const k = String(key);

    if (open) {
      lastOpenAtRef.current = Date.now();
      setOpenPopoverKey(k);
      return;
    }

    if (popoverLocksRef.current.get(k)) return;
    if (esMobileFinal && Date.now() - lastOpenAtRef.current < 160) return;

    if (openPopoverKey === k) setOpenPopoverKey(null);
  };

  const [editModal, setEditModal] = useState({
    open: false,
    eventoId: null,
    start: null,
    end: null,
  });

  const loadSedes = useCallback(async () => {
    setLoadingSedes(true);
    try {
      const res = await axios.get(SEDES_ENDPOINT);
      const raw = res?.data || [];
      const arr = Array.isArray(raw) ? raw : [];

      const activos = arr.filter((s) => s.isActive !== false);
      setSedes(activos);

      if (DEBUG_RESERVAS) {
        console.log("[UI loadSedes] sedes:", activos);
      }
    } catch (e) {
      console.error("Error cargando sedes:", e);
      setSedes([]);
      messageApi.error(
        "No se pudieron cargar las sedes (usando datos del calendario)."
      );
    } finally {
      setLoadingSedes(false);
    }
  }, [messageApi, DEBUG_RESERVAS]);

  useEffect(() => {
    loadSedes();
  }, [loadSedes]);

  const loadReservas = useCallback(
    async (options = {}) => {
      const { silent = false } = options || {};
      const msgKey = "load_reservas";

      setLoadingEventos(true);
      if (!silent) {
        messageApi.loading({
          content: "Cargando calendario de reservas…",
          key: msgKey,
          duration: 0,
        });
      }

      try {
        const params = {};
        if (filtroHotel !== "all") params.hotel = filtroHotel;

        const from = dayjs()
          .startOf("month")
          .subtract(2, "month")
          .format(DATE_FMT);
        const to = dayjs()
          .endOf("month")
          .add(2, "month")
          .format(DATE_FMT);
        params.from = from;
        params.to = to;

        if (DEBUG_RESERVAS) console.log("[UI loadReservas] params:", params);

        const res = await axios.get(RESERVAS_ENDPOINT, { params });
        const raw = res?.data?.data || res?.data || [];
        const arr = Array.isArray(raw) ? raw : [];
        setEventos(arr.filter((e) => !e?.isDeleted));

        if (!silent) {
          messageApi.success({
            content: "Calendario actualizado.",
            key: msgKey,
          });
        }
      } catch (e) {
        console.error("Error cargando reservas:", e);
        if (!silent) {
          messageApi.error({
            content:
              "No pudimos cargar el calendario. Intenta de nuevo o recarga la página.",
            key: msgKey,
          });
        }
        setEventos([]);
      } finally {
        setLoadingEventos(false);
      }
    },
    [filtroHotel, messageApi, DEBUG_RESERVAS]
  );

  useEffect(() => {
    loadReservas();
  }, [loadReservas]);

  const patchEventoLocal = (id, patch) => {
    const sid = String(id);
    setEventos((prev) =>
      prev.map((e) =>
        getEventId(e) !== sid
          ? e
          : {
              ...e,
              ...patch,
            }
      )
    );
  };

  /**
   * Helper genérico para acciones sobre una reserva (checkin, checkout, pago, borrar, etc.)
   * Con showLoading / showSuccess para evitar mensajes duplicados cuando otras pestañas
   * también muestran feedback.
   */
  const runAction = async ({
    id,
    action,
    loadingText = "Aplicando cambios…",
    okText = "Listo.",
    failText = "Ups… no se pudo completar. Intenta de nuevo.",
    fn,
    afterSuccess,
    afterFail,
    showLoading = true,
    showSuccess = true,
  }) => {
    const sid = String(id);
    const key = `act_${action}_${sid}`;

    if (pending?.[sid]?.any) {
      if (DEBUG_RESERVAS)
        console.warn("[runAction] bloqueado por pending.any", {
          sid,
          action,
          pending: pending?.[sid],
        });
      return;
    }

    setPendingAction(sid, action, true);
    if (showLoading) {
      messageApi.loading({ content: loadingText, key, duration: 0 });
    }

    try {
      if (DEBUG_RESERVAS) console.log("[runAction] start:", { sid, action });
      const out = await fn?.();
      if (DEBUG_RESERVAS)
        console.log("[runAction] success:", { sid, action, out });

      afterSuccess?.(out);

      if (showSuccess) {
        messageApi.success({ content: okText, key });
      } else if (showLoading) {
        // si no queremos success pero sí mostramos loading, cerramos el mensaje
        messageApi.destroy(key);
      }

      return out;
    } catch (err) {
      const status = err?.response?.status;
      const apiMsg =
        err?.response?.data?.message || err?.response?.data?.error;

      let human = apiMsg;
      if (!human) {
        if (status === 409)
          human = "Esa fecha ya está ocupada. Cambia el rango.";
        else human = failText;
      }

      messageApi.error({ content: human, key });
      afterFail?.(err);

      if (DEBUG_RESERVAS)
        console.error("[runAction] fail:", {
          sid,
          action,
          status,
          data: err?.response?.data,
          msg: err?.message,
        });
      throw err;
    } finally {
      setPendingAction(sid, action, false);
      if (DEBUG_RESERVAS) console.log("[runAction] done:", { sid, action });
    }
  };

  const marcarCheckin = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "checkin",
      loadingText: "Marcando entrada…",
      okText: "Entrada registrada.",
      failText: "No pudimos marcar la entrada.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/checkin`))
          ?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const marcarCheckout = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "checkout",
      loadingText: "Marcando salida…",
      okText: "Salida registrada.",
      failText: "No pudimos marcar la salida.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/checkout`))
          ?.data?.data,
      afterSuccess: (data) => {
        if (data) patchEventoLocal(eventoId, data);
        // 🔁 notificar que hay cambio de fechas (recorte por checkout)
        notifyDateChange();
      },
    });

  const marcarPagado = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "paid",
      loadingText: "Marcando como pagada…",
      okText: "Marcada como pagada.",
      failText: "No pudimos marcarla como pagada.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/paid`))
          ?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const marcarPendientePago = async (eventoId) =>
    runAction({
      id: eventoId,
      action: "unpaid",
      loadingText: "Quitando marca de pago…",
      okText: "Listo: queda como pendiente.",
      failText: "No pudimos cambiar el estado de pago.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${eventoId}/unpaid`))
          ?.data?.data,
      afterSuccess: (data) => data && patchEventoLocal(eventoId, data),
    });

  const eliminarEvento = async (eventoId) => {
    const sid = String(eventoId || "");
    if (!sid) {
      messageApi.error(
        "No encontramos el ID de la reserva (eventoId vacío)."
      );
      console.error("[UI delete] eventoId vacío:", eventoId);
      return;
    }

    await runAction({
      id: sid,
      action: "delete",
      loadingText: "Moviendo reserva a la papelera…",
      okText: "Reserva enviada a la papelera.",
      failText: "No pudimos moverla a la papelera.",
      fn: async () =>
        (await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/trash`))?.data?.data,
      afterSuccess: () => {
        setEventos((prev) => prev.filter((e) => getEventId(e) !== sid));
        closeAllPopovers();
        // 🔁 avisar a la pestaña papelera para que recargue
        notifyTrashChange();
      },
      // El feedback visible lo da la pestaña Papelera cuando recarga.
      showSuccess: false,
    });
  };

  const requestEditDates = (evento) => {
    if (!evento || evento.type !== "stay") return;
    if (evento.checkoutAt)
      return messageApi.warning(
        "Esa reserva ya tiene salida. No se puede cambiar."
      );

    const eid = getEventId(evento);
    setEditModal({
      open: true,
      eventoId: eid,
      start: dayjs(evento.startDate).startOf("day"),
      end: dayjs(evento.endDate || evento.startDate).startOf("day"),
    });
  };

  const applyEditDates = async () => {
    const evento = eventos.find(
      (e) => getEventId(e) === String(editModal.eventoId)
    );
    if (!evento) return messageApi.error("No encontramos esa reserva.");

    const start = editModal.start?.startOf("day");
    const end = editModal.end?.startOf("day");
    if (!start || !end) return messageApi.warning("Elige un rango válido.");
    if (end.isBefore(start, "day"))
      return messageApi.warning(
        "La salida no puede ser antes de la entrada."
      );
    if (evento.checkoutAt)
      return messageApi.warning(
        "Esa reserva ya tiene salida. No se puede cambiar."
      );

    if (evento.checkinAt) {
      const originalStart = dayjs(evento.startDate).startOf("day");
      if (!start.isSame(originalStart, "day"))
        return messageApi.warning(
          "Ya tiene entrada, solo puedes cambiar la salida."
        );
      const checkin = dayjs(evento.checkinAt).startOf("day");
      if (end.isBefore(checkin, "day"))
        return messageApi.warning(
          "La salida no puede ser antes de la entrada registrada."
        );
    }

    const startStr = start.format(DATE_FMT);
    const endStr = end.format(DATE_FMT);

    await runAction({
      id: getEventId(evento),
      action: "dates",
      loadingText: "Actualizando fechas…",
      okText: "Fechas actualizadas.",
      failText: "No pudimos cambiar las fechas.",
      fn: async () =>
        (
          await axios.patch(
            `${RESERVAS_ENDPOINT}/${getEventId(evento)}/dates`,
            {
              startDate: startStr,
              endDate: endStr,
            }
          )
        )?.data?.data,
      afterSuccess: (data) => {
        if (data) patchEventoLocal(getEventId(evento), data);
        setEditModal({
          open: false,
          eventoId: null,
          start: null,
          end: null,
        });
        // 🔁 notificar cambio de fechas manual
        notifyDateChange();
      },
      // El historial de cambios muestra su propio mensaje.
      showSuccess: false,
    });
  };

  const handleCreated = async () => loadReservas();

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

  const leyendaTipos = (
    <div style={legendWrapStyle}>
      <Tag color="#38bdf8" style={{ ...tagBase, color: "#0f172a" }}>
        Reserva
      </Tag>
      <Tag color="#22c55e" style={{ ...tagBase, color: "#052e16" }}>
        Check-in
      </Tag>
      <Tag color="#fb7185" style={{ ...tagBase, color: "#4c0519" }}>
        Check-out
      </Tag>
      <Tag color="#10b981" style={{ ...tagBase, color: "#052e16" }}>
        $ Pagada
      </Tag>
    </div>
  );

  const sedesSelectOptions = useMemo(() => {
    if (sedes && sedes.length) {
      const arr = sedes.map((s) => ({
        value: s.key,
        label: s.name || getHotelLabel(s.key),
      }));
      arr.sort((a, b) => a.label.localeCompare(b.label, "es"));
      return arr;
    }

    const map = new Map();
    for (const e of eventos) {
      const code = e.hotel || e.hotelCode || e.siteKey || e.sede || "";
      if (!code) continue;
      if (!map.has(code)) {
        map.set(code, {
          value: code,
          label: getHotelLabel(code),
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "es")
    );
  }, [sedes, eventos]);

  const hotelFilterOptions = useMemo(
    () => [{ value: "all", label: "Todas las sedes" }, ...sedesSelectOptions],
    [sedesSelectOptions]
  );

  const selectorHotel = (
    <Select
      size="small"
      value={filtroHotel}
      onChange={setFiltroHotel}
      style={{ minWidth: 160 }}
      popupMatchSelectWidth={false}
      loading={loadingSedes}
    >
      {hotelFilterOptions.map((opt) => (
        <Option key={opt.value} value={opt.value}>
          {opt.label}
        </Option>
      ))}
    </Select>
  );

  const renderCeldaFecha = (valor) => {
    const fechaStr = valor.format(DATE_FMT);
    const lista = eventos.filter(
      (e) =>
        eventoCubreFecha(e, fechaStr) &&
        (filtroHotel === "all" || e.hotel === filtroHotel)
    );
    if (!lista.length) return null;

    const maxItems = compacto ? 3 : 4;
    const visibles = lista.slice(0, maxItems);
    const extras = lista.slice(maxItems);

    const bodyStyle = {
      background: "#ffffff",
      borderRadius: 14,
      boxShadow: "0 14px 34px rgba(15,23,42,0.16)",
      border: "1px solid #e5e7eb",
      padding: 10,
    };

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
          const eid = getEventId(item);
          const instanceKey = `evt:${fechaStr}:${eid || "noid"}:${indice}`;

          const etiquetaCorta = `${shortHotel ? `${shortHotel} · ` : ""}Hab ${
            item.room
          } · ${meta.labelCorto}${item.paidAt ? " · $" : ""}`.trim();

          return (
            <Popover
              key={`pop-${instanceKey}`}
              content={
                <TooltipContenidoEvento
                  evento={item}
                  onCheckin={marcarCheckin}
                  onCheckout={marcarCheckout}
                  onPaid={marcarPagado}
                  onUnpaid={marcarPendientePago}
                  onRequestEditDates={requestEditDates}
                  onDelete={eliminarEvento}
                  pending={pending}
                  onClosePopover={closeAllPopovers}
                  isMobileUI={esMobileFinal}
                  popoverKey={instanceKey}
                  onLockPopover={setPopoverLocked}
                />
              }
              color="#ffffff"
              styles={{ body: bodyStyle }}
              trigger={esMobileFinal ? "click" : "hover"}
              open={openPopoverKey === instanceKey}
              onOpenChange={(open) => setPopoverOpenSafe(instanceKey, open)}
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
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
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
            content={<TooltipListaReservasDia lista={extras} />}
            color="#ffffff"
            styles={{ body: bodyStyle }}
            trigger={esMobileFinal ? "click" : "hover"}
            open={openPopoverKey === `extras:${fechaStr}`}
            onOpenChange={(open) =>
              setPopoverOpenSafe(`extras:${fechaStr}`, open)
            }
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
                userSelect: "none",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              +{extras.length} más
            </li>
          </Popover>
        )}
      </ul>
    );
  };

  const calendarViewTabs = [
    {
      key: "classic",
      label: "Vista por días",
      children: (
        <RoomGridCalendar
          eventos={eventos}
          filtroHotel={filtroHotel}
          compacto={esMobileFinal}
          loading={loadingEventos}
          onCheckin={marcarCheckin}
          onCheckout={marcarCheckout}
          onPaid={marcarPagado}
          onUnpaid={marcarPendientePago}
          onDelete={eliminarEvento}
          onRequestEditDates={requestEditDates}
          pending={pending}
          isMobileUI={esMobileFinal}
          openPopoverKey={openPopoverKey}
          onPopoverToggle={setPopoverOpenSafe}
          onPopoverLock={setPopoverLocked}
          onCloseAllPopovers={closeAllPopovers}
        />
      ),
    },
    {
      key: "modern",
      label: "Vista Calendario",
      children: (
        <div
          style={{
            overflowX: compacto ? "auto" : "visible",
            paddingBottom: compacto ? 4 : 0,
          }}
        >
          <Spin
            spinning={loadingEventos}
            tip="Cargando…"
            style={{ width: "100%" }}
          >
            <div
              style={{
                minWidth: compacto ? 620 : "auto",
                opacity: loadingEventos ? 0.7 : 1,
              }}
            >
              <Calendar
                fullscreen={false}
                defaultValue={dayjs()}
                cellRender={(current, info) => {
                  if (info.type === "date") {
                    return renderCeldaFecha(current);
                  }
                  return info.originNode;
                }}
                headerRender={({ value, onChange }) => {
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
                          onChange={(mes) =>
                            onChange(value.clone().month(mes))
                          }
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
                          onChange={(anio) =>
                            onChange(value.clone().year(anio))
                          }
                          style={{ width: 90 }}
                        >
                          {[2024, 2025, 2026].map((anio) => (
                            <Option key={anio} value={anio}>
                              {anio}
                            </Option>
                          ))}
                        </Select>

                        <Button
                          size="small"
                          type="text"
                          onClick={closeAllPopovers}
                          style={{ color: neutrals.textMuted }}
                        >
                          Cerrar tooltips
                        </Button>
                      </Space>
                    </div>
                  );
                }}
              />
            </div>
          </Spin>
        </div>
      ),
    },
  ];

  const tabsItems = [
    {
      key: "calendario",
      label: "Calendario",
      children: (
        <>
          <PanelProgramacionManual
            esMobile={esMobileFinal}
            onCreated={handleCreated}
            filtroHotel={filtroHotel}
            messageApi={messageApi}
            sedesOptions={sedesSelectOptions}
            sedesLoading={loadingSedes}
          />

          <Tabs
            size="small"
            defaultActiveKey="classic"
            items={calendarViewTabs}
            style={{ marginTop: 8 }}
            onChange={() => closeAllPopovers()}
          />
        </>
      ),
    },
    {
      key: "cambios",
      label: "Cambios de fechas",
      children: (
        <CambiosFechasTab
          filtroHotel={filtroHotel}
          esMobile={esMobileFinal}
          reloadKey={dateChangesReloadKey}
          messageApi={messageApi}
        />
      ),
    },
    {
      key: "papelera",
      label: "Papelera",
      children: (
        <PapeleraTab
          filtroHotel={filtroHotel}
          esMobile={esMobileFinal}
          onRestored={() => loadReservas({ silent: true })}
          reloadKey={trashReloadKey}
          messageApi={messageApi}
        />
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Card
        variant="borderless"
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
            <Text style={headerTitleStyle}>
              Calendario de ocupación centralizado
            </Text>
            <div style={headerRightStyle}>
              {leyendaTipos}
              {selectorHotel}
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => loadReservas()}
                loading={loadingEventos}
                style={{ color: neutrals.textMuted }}
              >
                Recargar
              </Button>
            </div>
          </div>
        }
      >
        <Tabs
          defaultActiveKey="calendario"
          items={tabsItems}
          style={{ marginTop: -8 }}
          onChange={() => closeAllPopovers()}
        />
      </Card>

      <Modal
        open={editModal.open}
        title="Cambiar fechas de la reserva"
        okText="Guardar"
        cancelText="Cancelar"
        onOk={applyEditDates}
        onCancel={() =>
          setEditModal({
            open: false,
            eventoId: null,
            start: null,
            end: null,
          })
        }
        destroyOnHidden
      >
        {(() => {
          const ev = eventos.find(
            (x) => getEventId(x) === String(editModal.eventoId)
          );
          const hasCheckin = !!ev?.checkinAt;
          const hasCheckout = !!ev?.checkoutAt;

          return (
            <div
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {hasCheckout && (
                <Text style={{ fontSize: 12, color: neutrals.textMuted }}>
                  Esta reserva ya tiene <b>check-out</b>. No se permiten
                  cambios.
                </Text>
              )}

              {hasCheckin && !hasCheckout && (
                <Text style={{ fontSize: 12, color: neutrals.textMuted }}>
                  Ya existe <b>check-in</b>. Solo puedes cambiar la{" "}
                  <b>salida</b>.
                </Text>
              )}

              <RangePicker
                value={[editModal.start, editModal.end]}
                onChange={(val) => {
                  if (!val || val.length !== 2) return;

                  if (hasCheckin && ev?.startDate) {
                    setEditModal((p) => ({
                      ...p,
                      start: dayjs(ev.startDate).startOf("day"),
                      end: val[1]?.startOf("day") || p.end,
                    }));
                    return;
                  }

                  setEditModal((p) => ({
                    ...p,
                    start: val[0]?.startOf("day") || p.start,
                    end: val[1]?.startOf("day") || p.end,
                  }));
                }}
                format="DD/MM/YYYY"
                style={{ width: "100%" }}
                disabled={hasCheckout}
              />

              {ev && (
                <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
                  Hab <b>#{ev.room}</b> · {getHotelLabel(ev.hotel)} · Actual:{" "}
                  <b>{fmtRange(ev.startDate, ev.endDate)}</b>
                </Text>
              )}
            </div>
          );
        })()}
      </Modal>
    </>
  );
};

export default HabitacionesReservaView;
