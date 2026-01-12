// src/components/shop/SedeModal.jsx
import { useMemo } from "react";
import { Modal, Space, Typography, Form, Input, Button, Table } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

/**
 * Modal de Gestión de Sedes:
 * - Crear sede (form inline)
 * - Ver sedes (table)
 * - Activar/Desactivar (viene en sedesColumns desde el padre)
 *
 * Props:
 * open: boolean
 * form: antd Form instance
 * sedes: array
 * sedesLoading: boolean
 * creatingSede: boolean
 * sedesColumns: Table columns
 * onCancel: fn
 * onCreateSede: fn(values) -> crea sede
 * onReload: fn() -> recarga sedes
 */
export default function SedeModal({
  open,
  form,
  sedes,
  sedesLoading,
  creatingSede,
  sedesColumns,
  onCancel,
  onCreateSede,
  onReload,
}) {
  const data = Array.isArray(sedes) ? sedes : [];

  const columns = useMemo(() => {
    // fallback ultra simple si no mandas columns
    if (Array.isArray(sedesColumns) && sedesColumns.length) return sedesColumns;

    return [
      {
        title: "Nombre",
        dataIndex: "name",
        key: "name",
        render: (name) => <Text style={{ fontSize: 12 }}>{name || "—"}</Text>,
      },
      {
        title: "Estado",
        dataIndex: "isActive",
        key: "isActive",
        width: 120,
        render: (isActive) => (
          <Text style={{ fontSize: 12, color: isActive ? "#16a34a" : "#6b7280" }}>
            {isActive ? "Activa" : "Inactiva"}
          </Text>
        ),
      },
    ];
  }, [sedesColumns]);

  return (
    <Modal
      open={open}
      title="Gestión de sedes"
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnClose
      maskClosable={false}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={12}>
        <Space style={{ justifyContent: "space-between", width: "100%" }} wrap>
          <Text style={{ fontSize: 11, color: "#6b7280" }}>
            Aquí puedes crear nuevas sedes y activar / desactivar las existentes.
          </Text>

          {typeof onReload === "function" ? (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={onReload}
              loading={sedesLoading}
            >
              Recargar
            </Button>
          ) : null}
        </Space>

        <Form
          form={form}
          layout="inline"
          size="small"
          onFinish={onCreateSede}
          style={{ width: "100%" }}
        >
          <Form.Item
            label="Nombre de la sede"
            name="name"
            rules={[
              { required: true, message: "Ingresa el nombre visible de la sede" },
              { whitespace: true, message: "Ingresa un nombre válido" },
            ]}
          >
            <Input placeholder="Casa Frida" maxLength={60} />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              icon={<PlusOutlined />}
              loading={creatingSede}
            >
              Agregar sede
            </Button>
          </Form.Item>
        </Form>

        <Table
          size="small"
          rowKey={(s) => String(s?._id || s?.key || s?.name || Math.random())}
          columns={columns}
          dataSource={data}
          loading={sedesLoading}
          pagination={false}
        />
      </Space>
    </Modal>
  );
}
