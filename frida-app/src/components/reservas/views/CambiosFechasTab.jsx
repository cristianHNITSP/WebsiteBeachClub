// src/components/reservas/CambiosFechasTab.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Tag,
  DatePicker,
  Button,
  Table,
  Tooltip,
  Typography,
  Space,
  message,
} from "antd";
import {
  HistoryOutlined,
  ReloadOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { neutrals } from "../../../theme/beachTheme";
import { DATE_FMT, getHotelLabel, fmtRange } from "../reservasHelpers";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const RESERVAS_DATE_CHANGES_ENDPOINT = "/api/reservas/date-changes";
const toDay = (v) => (v ? dayjs(v).startOf("day") : null);

function ResponsiveRange({ value, onChange, esMobile }) {
  const start = value?.[0] ? toDay(value[0]) : null;
  const end = value?.[1] ? toDay(value[1]) : null;

  if (!esMobile) {
    return (
      <RangePicker
        value={value}
        onChange={(v) => onChange(v || [])}
        format="DD/MM/YYYY"
        size="small"
        style={{ width: 260, maxWidth: "100%" }}
        placement="bottomLeft"
        getPopupContainer={() => document.body}
      />
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", width: "100%" }}>
      <DatePicker
        size="small"
        format="DD/MM/YYYY"
        placeholder="Desde"
        value={start}
        style={{ flex: 1, minWidth: 150 }}
        inputReadOnly
        onChange={(v) => {
          const ns = v ? v.startOf("day") : null;
          const ne =
            ns && end && end.isBefore(ns, "day") ? ns : end || null;
          const next = [ns, ne].filter(Boolean);
          onChange(next);
        }}
      />

      <DatePicker
        size="small"
        format="DD/MM/YYYY"
        placeholder="Hasta"
        value={end}
        style={{ flex: 1, minWidth: 150 }}
        inputReadOnly
        disabledDate={(d) => {
          if (!d || !start) return false;
          return d.startOf("day").isBefore(start, "day");
        }}
        onChange={(v) => {
          const ne = v ? v.startOf("day") : null;
          const ns = start || ne;
          const next = [ns, ne].filter(Boolean);
          onChange(next);
        }}
      />
    </div>
  );
}

const CambiosFechasTab = ({ filtroHotel, esMobile, reloadKey, messageApi }) => {
  const [localMessageApi, localContextHolder] = message.useMessage();
  const api = messageApi || localMessageApi;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [range, setRange] = useState([
    dayjs().startOf("month").subtract(1, "month"),
    dayjs().endOf("month").add(1, "month"),
  ]);

  // ✅ control manual del expand en móvil (para que sea obvio con botón + icono)
  const [expandedKeys, setExpandedKeys] = useState([]);

  const rowKeyFn = useCallback(
    (r) => String(r?._id || r?.id || `${r?.createdAt}-${r?.reservaId}`),
    []
  );

  const isExpanded = useCallback(
    (r) => expandedKeys.includes(rowKeyFn(r)),
    [expandedKeys, rowKeyFn]
  );

  const toggleExpanded = useCallback(
    (r) => {
      const k = rowKeyFn(r);
      setExpandedKeys((prev) =>
        prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
      );
    },
    [rowKeyFn]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const key = "load_changes";
    api.loading({ content: "Cargando historial de cambios…", key, duration: 0 });

    try {
      const params = {};
      if (filtroHotel !== "all") params.hotel = filtroHotel;

      if (range?.[0] && range?.[1]) {
        params.from = dayjs(range[0]).startOf("day").format(DATE_FMT);
        params.to = dayjs(range[1]).endOf("day").format(DATE_FMT);
      }

      const res = await axios.get(RESERVAS_DATE_CHANGES_ENDPOINT, { params });
      const raw = res?.data?.data || [];
      const arr = Array.isArray(raw) ? raw : [];
      setRows(arr);

      api.success({ content: "Historial de cambios actualizado.", key });
    } catch (e) {
      console.error(e);
      setRows([]);
      api.error({ content: "No pudimos cargar el historial de cambios.", key });
    } finally {
      setLoading(false);
    }
  }, [filtroHotel, range, api]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const renderRemovedDates = useCallback((arr) => {
    const list = Array.isArray(arr) ? arr : [];
    if (!list.length) return <span style={{ color: neutrals.textMuted }}>—</span>;

    const preview = list.slice(0, 4);
    const rest = list.length - preview.length;

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {preview.map((d) => (
          <Tag key={d} style={{ borderRadius: 999, fontSize: 11 }}>
            {dayjs(d).format("DD/MM")}
          </Tag>
        ))}

        {rest > 0 && (
          <Tooltip
            title={
              <div style={{ maxWidth: 260 }}>
                {list.map((d) => (
                  <div key={d}>{dayjs(d).format("DD/MM/YYYY")}</div>
                ))}
              </div>
            }
          >
            <Tag color="purple" style={{ borderRadius: 999 }}>
              +{rest} más
            </Tag>
          </Tooltip>
        )}
      </div>
    );
  }, []);

  const desktopColumns = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 170,
        ellipsis: true,
        render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
      },
      {
        title: "Sede / Hab",
        key: "room",
        ellipsis: true,
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 220 }}>
            <span style={{ fontWeight: 600, color: neutrals.textMain }}>
              {getHotelLabel(r.hotel)} · Hab {r.room}
            </span>
            <span style={{ fontSize: 11, color: neutrals.textMuted }}>
              Reserva: {r.codigoReserva || "—"}
            </span>
          </div>
        ),
      },
      {
        title: "Cambio",
        key: "change",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 260 }}>
            <div>
              <Tag
                color={r.action === "checkout_trim" ? "red" : "blue"}
                style={{ borderRadius: 999 }}
              > 
                {r.action === "checkout_trim" ? "Check-out (recorte)" : "Edición de fechas"}
              </Tag>
            </div>
            <div style={{ fontSize: 11 }}>
              <div style={{ color: neutrals.textMuted }}>
                Antes:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.oldStartDate, r.oldEndDate)}
                </b>
              </div>
              <div style={{ color: neutrals.textMuted }}>
                Después:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.newStartDate, r.newEndDate)}
                </b>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "Fechas ajustadas",
        dataIndex: "removedDates",
        key: "removedDates",
        width: 280,
        responsive: ["md"],
        render: renderRemovedDates,
      },
      {
        title: "Responsable",
        key: "actor",
        width: 200,
        responsive: ["md"],
        ellipsis: true,
        render: (_, r) => (
          <div style={{ fontSize: 11, color: neutrals.textMuted }}>
            {r?.actor?.email ? <span>{r.actor.email}</span> : <span>—</span>}
          </div>
        ),
      },
    ],
    [renderRemovedDates]
  );

  const mobileColumns = useMemo(
    () => [
      {
        title: "Cambio",
        key: "main",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: neutrals.textMain, lineHeight: 1.2 }}>
                  {getHotelLabel(r.hotel)} · Hab {r.room}
                </div>
                <div style={{ fontSize: 11, color: neutrals.textMuted }}>
                  {r?.createdAt ? dayjs(r.createdAt).format("DD/MM/YYYY HH:mm") : "—"}
                  {" · "}
                  Reserva: {r.codigoReserva || "—"}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12 }}>
              <div style={{ color: neutrals.textMuted }}>
                Antes:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.oldStartDate, r.oldEndDate)}
                </b>
              </div>
              <div style={{ color: neutrals.textMuted }}>
                Después:{" "}
                <b style={{ color: neutrals.textMain }}>
                  {fmtRange(r.newStartDate, r.newEndDate)}
                </b>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: "",
        key: "more",
        width: 92,
        align: "right",
        render: (_, r) => {
          const open = isExpanded(r);
          return (
            <Button
              size="small"
              type="text"
              onClick={() => toggleExpanded(r)}
              icon={open ? <DownOutlined /> : <RightOutlined />}
              style={{ color: neutrals.textMuted, paddingInline: 6 }}
            >
              {open ? "Ocultar" : "Detalles"}
            </Button>
          );
        },
      },
    ],
    [isExpanded, toggleExpanded]
  );

  const expandable = useMemo(() => {
    if (!esMobile) return undefined;

    return {
      expandedRowKeys: expandedKeys,
      onExpandedRowsChange: (keys) => setExpandedKeys(keys.map(String)),
      expandRowByClick: false,
      showExpandColumn: false,
      expandedRowRender: (r) => (
        <div style={{ padding: "8px 6px 2px 6px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: neutrals.textMain }}>
                Fechas ajustadas
              </div>
              <div style={{ marginTop: 6 }}>{renderRemovedDates(r.removedDates)}</div>
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: neutrals.textMain }}>
                Responsable
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: neutrals.textMuted }}>
                {r?.actor?.email || "—"}
              </div>
            </div>
          </div>
        </div>
      ),
    };
  }, [esMobile, expandedKeys, renderRemovedDates]);

  return (
    <>
      {!messageApi && localContextHolder}

      <div
        style={{
          padding: esMobile ? 8 : 12,
          borderRadius: 14,
          border: "1px solid #e5e7eb",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", flex: 1 }}>
            <Tag color="geekblue" style={{ borderRadius: 999 }}>
              <HistoryOutlined /> Cambios de fechas
            </Tag>

            <div style={{ flex: 1, minWidth: esMobile ? "100%" : 260 }}>
              <ResponsiveRange value={range} onChange={setRange} esMobile={esMobile} />
            </div>
          </div>

          <Button size="small" icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Recargar
          </Button>
        </div>

        <Table
          rowKey={rowKeyFn}
          columns={esMobile ? mobileColumns : desktopColumns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false, simple: esMobile }}
          size="small"
          tableLayout="fixed"
          scroll={esMobile ? undefined : { x: "max-content" }}
          expandable={expandable}
        />
      </div>
    </>
  );
};

export default CambiosFechasTab;
