import { useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Space,
  Button,
  Tag,
  Typography,
  List,
  Popconfirm,
  Divider,
  message,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../../theme/beachTheme";
import SedeUpsertModal from "./SedeUpsertModal";

const { Text } = Typography;

const SedesManagerPanel = ({
  open,
  sedes = [],
  loading = false,
  reload,
  onSedesChanged,
}) => {
  const [messageApi, contextHolder] = message.useMessage();

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...sedes];
    // activas primero, luego por name
    arr.sort((a, b) => {
      const ai = a.isActive ? 0 : 1;
      const bi = b.isActive ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });
    return arr;
  }, [sedes]);

  const openCreate = () => {
    setMode("create");
    setEditing(null);
    setUpsertOpen(true);
  };

  const openEdit = (sede) => {
    setMode("edit");
    setEditing(sede);
    setUpsertOpen(true);
  };

  const closeUpsert = () => {
    setUpsertOpen(false);
    setEditing(null);
  };

  const createSede = async (payload) => {
    setSaving(true);
    try {
      await axios.post("/api/sedes", payload, { withCredentials: true });
      messageApi.success("Sede creada.");
      closeUpsert();
      await reload?.();
      onSedesChanged?.();
    } catch (err) {
      console.error(err);
      const e = err.response?.data?.error;
      if (e === "DUPLICATE_KEY") {
        messageApi.error("Ese nombre genera una key ya existente. Cambia el nombre y prueba de nuevo.");
      } else {
        messageApi.error(err.response?.data?.message || "No se pudo crear la sede.");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateSede = async (id, payload) => {
    setSaving(true);
    try {
      await axios.put(`/api/sedes/${id}`, payload, { withCredentials: true });
      messageApi.success("Sede actualizada.");
      closeUpsert();
      await reload?.();
      onSedesChanged?.();
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || "No se pudo actualizar la sede.");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (sede) => {
    try {
      await axios.patch(
        `/api/sedes/${sede._id}/status`,
        { isActive: !sede.isActive },
        { withCredentials: true }
      );
      messageApi.success(sede.isActive ? "Sede desactivada." : "Sede activada.");
      await reload?.();
      onSedesChanged?.();
    } catch (err) {
      console.error(err);
      messageApi.error(err.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  return (
    <>
      {contextHolder}

      <div
        style={{
          maxHeight: open ? 520 : 0,
          opacity: open ? 1 : 0,
          marginBottom: open ? 12 : 0,
          overflow: "hidden",
          borderRadius: 12,
          border: open ? "1px solid #e5e7eb" : "1px solid transparent",
          background: "linear-gradient(to right, #f8fafc, #eef2ff)",
          boxShadow: open ? "0 10px 25px rgba(15,23,42,0.10)" : "none",
          transform: open ? "translateY(0)" : "translateY(-8px)",
          transition: "all 0.25s ease",
        }}
      >
        {open && (
          <div style={{ padding: 12 }}>
            <Space size={8} wrap style={{ justifyContent: "space-between", width: "100%" }}>
              <Space size={8} wrap>
                <Text style={{ fontWeight: 650, color: neutrals.textMain }}>
                  Configurar sedes
                </Text>
                <Tag
                  style={{
                    borderRadius: 999,
                    fontSize: 10,
                    background: "#ffffff",
                    border: "none",
                    color: "#111827",
                  }}
                >
                  {loading ? "Cargando..." : `${sedes.length} total`}
                </Tag>
            
              </Space>

              <Space size={8} wrap>
                <Button
                  size="small"
                  icon={<ReloadOutlined />}
                  onClick={() => reload?.()}
                  loading={loading}
                  style={{ borderRadius: 999 }}
                >
                  Recargar
                </Button>
                <Button
                  size="small"
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openCreate}
                  style={{
                    borderRadius: 999,
                    background: beachColors.teal,
                    borderColor: beachColors.teal,
                  }}
                >
                  Nueva sede
                </Button>
              </Space>
            </Space>

            <Divider style={{ margin: "10px 0" }} />

            <List
              dataSource={sorted}
              locale={{ emptyText: "No hay sedes registradas." }}
              renderItem={(sede) => (
                <List.Item
                  style={{
                    border: "1px solid #eef2ff",
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 8,
                    background: "#ffffff",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <Space direction="vertical" size={2}>
                    <Space size={8} wrap>
                      <Text style={{ fontWeight: 650 }}>{sede.name}</Text>
                      <Tag
                        color={sede.isActive ? beachColors.teal : "#9ca3af"}
                        style={{ borderRadius: 999, fontSize: 10 }}
                      >
                        {sede.isActive ? "Activa" : "Inactiva"}
                      </Tag>
                    </Space>

                    {sede.description ? (
                      <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
                        {sede.description}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
                        Sin descripción
                      </Text>
                    )}
                  </Space>

                  <Space size={6} wrap style={{ justifyContent: "flex-end" }}>
                    <Button
                      size="small"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => openEdit(sede)}
                      style={{ paddingInline: 6 }}
                    >
                      Editar
                    </Button>

                    <Popconfirm
                      title={sede.isActive ? "Desactivar sede" : "Activar sede"}
                      description={
                        sede.isActive
                          ? "No se podrá asignar a nuevos usuarios."
                          : "Se podrá asignar nuevamente."
                      }
                      okText="Confirmar"
                      cancelText="Cancelar"
                      onConfirm={() => toggleStatus(sede)}
                    >
                      <Button
                        size="small"
                        type="link"
                        icon={<PoweroffOutlined />}
                        danger={sede.isActive}
                        style={{ paddingInline: 6 }}
                      >
                        {sede.isActive ? "Desactivar" : "Activar"}
                      </Button>
                    </Popconfirm>
                  </Space>
                </List.Item>
              )}
            />

            <SedeUpsertModal
              open={upsertOpen}
              mode={mode}
              sede={editing}
              saving={saving}
              onCancel={closeUpsert}
              onSubmit={(values) => {
                if (mode === "create") return createSede(values);
                return updateSede(editing?._id, values);
              }}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default SedesManagerPanel;
