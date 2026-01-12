// src/components/shop/AdminPanel.jsx
import React from "react";
import {
  Card,
  Space,
  Button,
  Tooltip,
  Tabs,
  Divider,
  Empty,
  List,
  Tag,
  Typography,
  Spin,
  Popconfirm,
} from "antd";
import {
  SettingOutlined,
  ReloadOutlined,
  CloseOutlined,
  DeleteOutlined,
  UndoOutlined,
  HistoryOutlined,
  FileTextOutlined,
  HomeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import ExpandPanel from "./ui/ExpandPanel";

const { Text } = Typography;

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

export default function AdminPanel({
  open,
  isMobile,

  // contexto actual
  siteLabel,
  section,

  // trash/history
  trashLoading,
  historyLoading,
  trashCategories,
  trashProducts,
  stockLogs,
  salesLogs,

  // actions
  onClose,
  onReloadAll,
  onRestoreCategory,
  onRestoreProduct,
  onOpenCreateCategory,
  onOpenCreateProduct,

  // ✅ abre el modal "Gestión de sedes"
  onOpenSedes,
}) {
  const tabs = [
    {
      key: "trash",
      label: (
        <Space size={6}>
          <DeleteOutlined />
          <span>Papelera</span>
        </Space>
      ),
      children: (
        <Spin spinning={trashLoading}>
          <Divider orientation="left" style={{ marginTop: 0 }}>
            Categorías ({section})
          </Divider>

          {trashCategories.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay categorías en papelera" />
          ) : (
            <List
              dataSource={trashCategories}
              renderItem={(c) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="restore"
                      title="Restaurar categoría"
                      okText="Restaurar"
                      cancelText="Cancelar"
                      onConfirm={() => onRestoreCategory(c)}
                    >
                      <Button icon={<UndoOutlined />}>Restaurar</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontWeight: 900 }}>{c.name}</Text>}
                    description={<Text type="secondary">Sección: {c.section}</Text>}
                  />
                </List.Item>
              )}
            />
          )}

          <Divider orientation="left">
            Productos ({siteLabel || "sin sede"} · {section})
          </Divider>

          {!siteLabel ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Selecciona una sede para ver productos en papelera."
            />
          ) : trashProducts.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay productos en papelera" />
          ) : (
            <List
              dataSource={trashProducts}
              renderItem={(p) => (
                <List.Item
                  actions={[
                    <Popconfirm
                      key="restore"
                      title="Restaurar producto"
                      okText="Restaurar"
                      cancelText="Cancelar"
                      onConfirm={() => onRestoreProduct(p)}
                    >
                      <Button icon={<UndoOutlined />}>Restaurar</Button>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontWeight: 900 }}>{p.name}</Text>}
                    description={<Text type="secondary">{money(p.unitPrice)} · stock {p.stock}</Text>}
                  />
                </List.Item>
              )}
            />
          )}
        </Spin>
      ),
    },
    {
      key: "history",
      label: (
        <Space size={6}>
          <HistoryOutlined />
          <span>Historial</span>
        </Space>
      ),
      children: (
        <Spin spinning={historyLoading}>
          {!siteLabel ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Selecciona una sede para ver el historial." />
          ) : (
            <>
              <Divider orientation="left" style={{ marginTop: 0 }}>
                Movimientos de stock
              </Divider>

              {stockLogs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin movimientos" />
              ) : (
                <List
                  size="small"
                  dataSource={stockLogs}
                  renderItem={(m) => {
                    const when = new Date(m.createdAt || Date.now()).toLocaleString("es-MX");
                    const pid = m.productId?.name ? m.productId.name : String(m.productId || "Producto");
                    return (
                      <List.Item>
                        <Space direction="vertical" size={2} style={{ width: "100%" }}>
                          <Space style={{ justifyContent: "space-between", width: "100%" }}>
                            <Text style={{ fontWeight: 900 }}>
                              {m.type} · {m.delta > 0 ? `+${m.delta}` : m.delta} · {pid}
                            </Text>
                            <Tag style={{ borderRadius: 999 }}>{when}</Tag>
                          </Space>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Stock {m.before} → {m.after} · {m.reason || "—"}
                          </Text>
                        </Space>
                      </List.Item>
                    );
                  }}
                />
              )}

              <Divider orientation="left">
                Ventas recientes <FileTextOutlined />
              </Divider>

              {salesLogs.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Sin ventas" />
              ) : (
                <List
                  dataSource={salesLogs}
                  renderItem={(s) => (
                    <List.Item>
                      <Space direction="vertical" size={2} style={{ width: "100%" }}>
                        <Space style={{ justifyContent: "space-between", width: "100%" }}>
                          <Text style={{ fontWeight: 900 }}>{money(s.total)}</Text>
                          <Tag style={{ borderRadius: 999 }}>
                            {new Date(s.createdAt || Date.now()).toLocaleString("es-MX")}
                          </Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Productos: {Array.isArray(s.items) ? s.items.length : 0} · método:{" "}
                          {s.paymentMethod || "—"} · sección: {s.section}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </>
          )}
        </Spin>
      ),
    },
  ];

  return (
    <ExpandPanel open={open} maxHeight={1200}>
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          marginTop: 12,
          boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
          background: "#fff",
        }}
        bodyStyle={{ padding: isMobile ? 12 : 14 }}
        title={
          <Space>
            <SettingOutlined />
            <span>Gestión</span>
          </Space>
        }
        extra={
          <Space wrap>
            <Tooltip title="Gestionar sedes">
              <Button icon={<HomeOutlined />} onClick={onOpenSedes}>
                {!isMobile ? "Sedes" : null}
              </Button>
            </Tooltip>

            <Tooltip title="Nueva categoría">
              <Button icon={<PlusOutlined />} onClick={onOpenCreateCategory}>
                {!isMobile ? "Nueva categoría" : null}
              </Button>
            </Tooltip>

            <Tooltip title="Nuevo producto">
              <Button icon={<PlusOutlined />} onClick={onOpenCreateProduct}>
                {!isMobile ? "Nuevo producto" : null}
              </Button>
            </Tooltip>

            <Tooltip title="Actualizar todo">
              <Button icon={<ReloadOutlined />} onClick={onReloadAll} />
            </Tooltip>

            <Button icon={<CloseOutlined />} onClick={onClose}>
              Cerrar
            </Button>
          </Space>
        }
      >
        <Tabs items={tabs} />
      </Card>
    </ExpandPanel>
  );
}
