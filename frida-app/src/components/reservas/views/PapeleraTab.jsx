// src/components/reservas/PapeleraTab.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Tag,
  DatePicker,
  Button,
  Table,
  Input,
  Popconfirm,
  Typography,
  message,
} from "antd";
import {
  InboxOutlined,
  ReloadOutlined,
  UndoOutlined,
  RestOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { neutrals } from "../../../theme/beachTheme";
import {
  DATE_FMT,
  getEventId,
  getHotelLabel,
  fmtRange,
  recortar,
  moneyMXN,
} from "../reservasHelpers";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const RESERVAS_TRASH_ENDPOINT = "/api/reservas/trash";
const RESERVAS_ENDPOINT = "/api/reservas";
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

const PapeleraTab = ({ filtroHotel, esMobile, onRestored, reloadKey, messageApi }) => {
  const [localMessageApi, localContextHolder] = message.useMessage();
  const api = messageApi || localMessageApi;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");

  const [range, setRange] = useState([
    dayjs().startOf("month").subtract(2, "month"),
    dayjs().endOf("month").add(2, "month"),
  ]);

  // ✅ control manual del expand en móvil (botón “Acciones”)
  const [expandedKeys, setExpandedKeys] = useState([]);

  const rowKeyFn = useCallback(
    (r) => String(r?._id || r?.id || `${r?.deletedAt}-${r?.room}-${r?.startDate}`),
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

  const loadTrash = useCallback(async () => {
    setLoading(true);
    const key = "load_trash";
    api.loading({ content: "Cargando papelera…", key, duration: 0 });

    const params = {};
    if (filtroHotel !== "all") params.hotel = filtroHotel;

    if (range?.[0] && range?.[1]) {
      params.from = dayjs(range[0]).startOf("day").format(DATE_FMT);
      params.to = dayjs(range[1]).endOf("day").format(DATE_FMT);
    }

    if (q?.trim()) params.q = q.trim();

    try {
      const res = await axios.get(RESERVAS_TRASH_ENDPOINT, { params });
      const raw = res?.data?.data || res?.data || [];
      const arr = Array.isArray(raw) ? raw : [];
      setRows(arr);
      api.success({ content: "Papelera actualizada.", key });
    } catch (e1) {
      try {
        const res2 = await axios.get(RESERVAS_ENDPOINT, {
          params: { ...params, isDeleted: "true" },
        });
        const raw2 = res2?.data?.data || res2?.data || [];
        const arr2 = Array.isArray(raw2) ? raw2 : [];
        setRows(arr2.filter((x) => !!x?.isDeleted));
        api.success({ content: "Papelera actualizada.", key });
      } catch (e2) {
        console.error("[trash] no se pudo cargar:", e1, e2);
        setRows([]);
        api.error({ content: "No pudimos cargar la papelera.", key });
      }
    } finally {
      setLoading(false);
    }
  }, [filtroHotel, range, q, api]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  useEffect(() => {
    if (reloadKey > 0) loadTrash();
  }, [reloadKey, loadTrash]);

  const restoreReserva = useCallback(
    async (id) => {
      const sid = String(id || "");
      if (!sid) return;

      const key = `restore_${sid}`;
      api.loading({ content: "Restaurando reserva…", key, duration: 0 });

      try {
        try {
          await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/restore`);
        } catch (e1) {
          await axios.patch(`${RESERVAS_ENDPOINT}/${sid}/untrash`);
        }

        api.success({ content: "Reserva restaurada y devuelta al calendario.", key });
        setRows((prev) => prev.filter((r) => getEventId(r) !== sid));
        onRestored?.();
      } catch (e) {
        console.error(e);
        api.error({ content: "No se pudo restaurar la reserva.", key });
      }
    },
    [api, onRestored]
  );

  const hardDeleteReserva = useCallback(
    async (id) => {
      const sid = String(id || "");
      if (!sid) return;

      const key = `hard_${sid}`;
      api.loading({ content: "Eliminando reserva…", key, duration: 0 });

      try {
        await axios.delete(`${RESERVAS_ENDPOINT}/${sid}`, { params: { hard: "true" } });

        api.success({ content: "Reserva eliminada definitivamente.", key });
        setRows((prev) => prev.filter((r) => getEventId(r) !== sid));
      } catch (e) {
        console.error(e);
        api.error({ content: "No se pudo eliminar la reserva de forma definitiva.", key });
      }
    },
    [api]
  );

  const desktopColumns = useMemo(
    () => [
      {
        title: "Eliminada",
        dataIndex: "deletedAt",
        key: "deletedAt",
        width: 170,
        ellipsis: true,
        render: (v, r) =>
          v
            ? dayjs(v).format("DD/MM/YYYY HH:mm")
            : r?.updatedAt
            ? dayjs(r.updatedAt).format("DD/MM/YYYY HH:mm")
            : "—",
      },
      {
        title: "Sede / Hab",
        key: "room",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 240 }}>
            <span style={{ fontWeight: 600, color: neutrals.textMain }}>
              {getHotelLabel(r.hotel)} · Hab {r.room}
            </span>
            <span style={{ fontSize: 11, color: neutrals.textMuted }}>
              {recortar(r.label || "—", 60)}
            </span>
          </div>
        ),
      },
      {
        title: "Fechas",
        key: "range",
        width: 200,
        responsive: ["md"],
        render: (_, r) => (
          <span style={{ color: neutrals.textMuted }}>
            {r?.startDate ? fmtRange(r.startDate, r.endDate) : "—"}
          </span>
        ),
      },
      {
        title: "Total",
        key: "total",
        width: 150,
        responsive: ["md"],
        render: (_, r) => {
          const b = r?.billing;
          if (!b) return <span style={{ color: neutrals.textMuted }}>—</span>;
          const invalid = Number(b?.total) <= 0 || Number(b?.pricePerDay) <= 0;
          return (
            <span style={{ fontWeight: 700, color: invalid ? neutrals.textMuted : neutrals.textMain }}>
              {invalid ? "—" : moneyMXN(b.total)}
            </span>
          );
        },
      },
      {
        title: "Estado",
        key: "estado",
        width: 170,
        responsive: ["md"],
        render: (_, r) => (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {r?.paidAt ? (
              <Tag color="green" style={{ borderRadius: 999 }}>
                $ Pagada
              </Tag>
            ) : (
              <Tag color="gold" style={{ borderRadius: 999 }}>
                Pendiente
              </Tag>
            )}
            {r?.checkinAt ? (
              <Tag color="green" style={{ borderRadius: 999 }}>
                Check-in
              </Tag>
            ) : (
              <Tag color="blue" style={{ borderRadius: 999 }}>
                Reserva
              </Tag>
            )}
          </div>
        ),
      },
      {
        title: "Acciones",
        key: "actions",
        width: 240,
        render: (_, r) => {
          const id = getEventId(r);
          return (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Popconfirm
                title="¿Restaurar reserva?"
                description="Volverá a aparecer en el calendario. Si las fechas ya están ocupadas, el sistema lo rechazará."
                okText="Restaurar"
                cancelText="Cancelar"
                onConfirm={() => restoreReserva(id)}
              >
                <Button size="small" icon={<UndoOutlined />}>
                  Restaurar
                </Button>
              </Popconfirm>

              <Popconfirm
                title="¿Eliminar definitivamente?"
                description="Esta acción no se puede deshacer."
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => hardDeleteReserva(id)}
              >
                <Button size="small" danger icon={<RestOutlined />}>
                  Borrar
                </Button>
              </Popconfirm>
            </div>
          );
        },
      },
    ],
    [restoreReserva, hardDeleteReserva]
  );

  const mobileColumns = useMemo(
    () => [
      {
        title: "Reserva",
        key: "main",
        render: (_, r) => {
          const b = r?.billing;
          const invalid = !b || Number(b?.total) <= 0 || Number(b?.pricePerDay) <= 0;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, color: neutrals.textMain, lineHeight: 1.2 }}>
                    {getHotelLabel(r.hotel)} · Hab {r.room}
                  </div>
                  <div style={{ fontSize: 11, color: neutrals.textMuted }}>
                    {recortar(r.label || "—", 70)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: invalid ? neutrals.textMuted : neutrals.textMain }}>
                    {invalid ? "—" : moneyMXN(b.total)}
                  </div>
                  <div style={{ fontSize: 11, color: neutrals.textMuted }}>
                    {r?.startDate ? fmtRange(r.startDate, r.endDate) : "—"}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {r?.paidAt ? (
                  <Tag color="green" style={{ borderRadius: 999 }}>
                    $ Pagada
                  </Tag>
                ) : (
                  <Tag color="gold" style={{ borderRadius: 999 }}>
                    Pendiente
                  </Tag>
                )}
                {r?.checkinAt ? (
                  <Tag color="green" style={{ borderRadius: 999 }}>
                    Check-in
                  </Tag>
                ) : (
                  <Tag color="blue" style={{ borderRadius: 999 }}>
                    Reserva
                  </Tag>
                )}
              </div>

              <div style={{ fontSize: 11, color: neutrals.textMuted }}>
                Eliminada:{" "}
                {r?.deletedAt
                  ? dayjs(r.deletedAt).format("DD/MM/YYYY HH:mm")
                  : r?.updatedAt
                  ? dayjs(r.updatedAt).format("DD/MM/YYYY HH:mm")
                  : "—"}
              </div>
            </div>
          );
        },
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
              {open ? "Ocultar" : "Acciones"}
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
      expandedRowRender: (r) => {
        const id = getEventId(r);
        return (
          <div style={{ padding: "8px 6px 2px 6px" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Popconfirm
                title="¿Restaurar reserva?"
                description="Volverá a aparecer en el calendario. Si las fechas ya están ocupadas, el sistema lo rechazará."
                okText="Restaurar"
                cancelText="Cancelar"
                onConfirm={() => restoreReserva(id)}
              >
                <Button size="small" icon={<UndoOutlined />}>
                  Restaurar
                </Button>
              </Popconfirm>

              <Popconfirm
                title="¿Eliminar definitivamente?"
                description="Esta acción no se puede deshacer."
                okText="Eliminar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
                onConfirm={() => hardDeleteReserva(id)}
              >
                <Button size="small" danger icon={<RestOutlined />}>
                  Borrar
                </Button>
              </Popconfirm>
            </div>
          </div>
        );
      },
    };
  }, [esMobile, expandedKeys, restoreReserva, hardDeleteReserva]);

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
            <Tag color="volcano" style={{ borderRadius: 999 }}>
              <InboxOutlined /> Papelera
            </Tag>

            <div style={{ flex: 1, minWidth: esMobile ? "100%" : 260 }}>
              <ResponsiveRange value={range} onChange={setRange} esMobile={esMobile} />
            </div>

            <Input
              size="small"
              placeholder="Buscar (habitación / nombre / nota)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: esMobile ? "100%" : 260, maxWidth: "100%" }}
              allowClear
            />
          </div>

          <Button size="small" icon={<ReloadOutlined />} onClick={loadTrash} loading={loading}>
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

export default PapeleraTab;
