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
import { HistoryOutlined, ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { neutrals } from "../../../theme/beachTheme";
import { DATE_FMT, getHotelLabel, fmtRange } from "../reservasHelpers";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const RESERVAS_DATE_CHANGES_ENDPOINT = "/api/reservas/date-changes";

const CambiosFechasTab = ({ filtroHotel, esMobile, reloadKey, messageApi }) => {
  const [localMessageApi, localContextHolder] = message.useMessage();
  const api = messageApi || localMessageApi;

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [range, setRange] = useState([
    dayjs().startOf("month").subtract(1, "month"),
    dayjs().endOf("month").add(1, "month"),
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    const key = "load_changes";
    api.loading({
      content: "Cargando historial de cambios…",
      key,
      duration: 0,
    });

    try {
      const params = {};
      if (filtroHotel !== "all") params.hotel = filtroHotel;

      if (range?.[0] && range?.[1]) {
        params.from = range[0].startOf("day").format(DATE_FMT);
        params.to = range[1].endOf("day").format(DATE_FMT);
      }

      const res = await axios.get(RESERVAS_DATE_CHANGES_ENDPOINT, { params });
      const raw = res?.data?.data || [];
      const arr = Array.isArray(raw) ? raw : [];
      setRows(arr);

      api.success({
        content: "Historial de cambios actualizado.",
        key,
      });
    } catch (e) {
      console.error(e);
      setRows([]);
      api.error({
        content: "No pudimos cargar el historial de cambios.",
        key,
      });
    } finally {
      setLoading(false);
    }
  }, [filtroHotel, range, api]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  const columns = useMemo(
    () => [
      {
        title: "Fecha",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (v) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
      },
      {
        title: "Sede / Hab",
        key: "room",
        render: (_, r) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div>
              <Tag
                color={r.action === "checkout_trim" ? "red" : "blue"}
                style={{ borderRadius: 999 }}
              >
                {r.action === "checkout_trim"
                  ? "Check-out (recorte)"
                  : "Edición de fechas"}
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
        width: 260,
        render: (arr) => {
          const list = Array.isArray(arr) ? arr : [];
          if (!list.length)
            return <span style={{ color: neutrals.textMuted }}>—</span>;

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
        },
      },
      {
        title: "Responsable",
        key: "actor",
        width: 180,
        render: (_, r) => (
          <div style={{ fontSize: 11, color: neutrals.textMuted }}>
            {r?.actor?.email ? <span>{r.actor.email}</span> : <span>—</span>}
          </div>
        ),
      },
    ],
    []
  );

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
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Tag color="geekblue" style={{ borderRadius: 999 }}>
              <HistoryOutlined /> Cambios de fechas
            </Tag>

            <RangePicker
              value={range}
              onChange={(v) => setRange(v || [])}
              format="DD/MM/YYYY"
              size="small"
              style={{ width: esMobile ? "100%" : 260 }}
            />
          </div>

          <Button
            size="small"
            icon={<ReloadOutlined />}
            onClick={load}
            loading={loading}
          >
            Recargar
          </Button>
        </div>

        <Table
          rowKey={(r) =>
            String(r?._id || r?.id || `${r?.createdAt}-${r?.reservaId}`)
          }
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size="small"
        />
      </div>
    </>
  );
};

export default CambiosFechasTab;
