import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Button,
  Popconfirm,
  Tooltip,
  List,
  Divider,
  Tag,
  Empty,
  Tabs,
} from "antd";
import {
  ShoppingCartOutlined,
  MinusOutlined,
  PlusOutlined,
  DeleteOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import ExpandPanel from "./ui/ExpandPanel";
import { beachColors } from "../../theme/beachTheme";

const { Text } = Typography;

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const SECTION_META = {
  normal: { label: "Tienda", hint: "snacks / bebidas" },
  alcohol: { label: "Alcohol", hint: "vinos / cervezas / licores" },
};

export default function CartPanel({
  open,
  isMobile,
  siteLabel,
  activeSection,
  cartBySection,
  canPOS,
  onClose,
  onClearSection,
  onInc,
  onDec,
  onRemoveLine,
  onCheckoutSection,
}) {
  const [tab, setTab] = useState(activeSection || "normal");

  useEffect(() => {
    if (open) setTab(activeSection || "normal");
  }, [open, activeSection]);

  const totals = useMemo(() => {
    const t = { normal: 0, alcohol: 0 };
    for (const sec of ["normal", "alcohol"]) {
      const arr = cartBySection?.[sec] || [];
      t[sec] = arr.reduce((a, x) => a + x.qty * x.unitPrice, 0);
    }
    return t;
  }, [cartBySection]);

  const items = cartBySection?.[tab] || [];
  const total = totals[tab] || 0;

  const tabItems = ["normal", "alcohol"].map((sec) => {
    const count = (cartBySection?.[sec] || []).reduce((a, x) => a + x.qty, 0);
    return {
      key: sec,
      label: (
        <Space size={6}>
          <span style={{ fontWeight: 900 }}>{SECTION_META[sec].label}</span>
          <Tag style={{ borderRadius: 999, margin: 0, fontSize: 10, border: "none", background: "rgba(148,163,184,0.15)" }}>
            {count} ítems
          </Tag>
        </Space>
      ),
      children:
        items.length === 0 ? (
          <Empty description="Tu carrito está vacío en esta sección" />
        ) : (
          <>
            <List
              dataSource={items}
              renderItem={(it) => (
                <List.Item
                  style={{ padding: "10px 0" }}
                  actions={[
                    <Button
                      key="dec"
                      icon={<MinusOutlined />}
                      onClick={() => onDec(tab, it.productId)}
                      style={{ borderRadius: 10 }}
                    />,
                    <Text
                      key="qty"
                      style={{
                        minWidth: 18,
                        textAlign: "center",
                        fontWeight: 900,
                      }}
                    >
                      {it.qty}
                    </Text>,
                    <Button
                      key="inc"
                      icon={<PlusOutlined />}
                      onClick={() => onInc(tab, it.productId)}
                      style={{ borderRadius: 10 }}
                      disabled={it.qty >= it.stock}
                    />,
                    <Popconfirm
                      key="rm"
                      title="Quitar producto"
                      okText="Quitar"
                      cancelText="Cancelar"
                      onConfirm={() => onRemoveLine(tab, it.productId)}
                    >
                      <Tooltip title="Quitar del carrito">
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          style={{ borderRadius: 10 }}
                        />
                      </Tooltip>
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontWeight: 900 }}>{it.name}</Text>}
                    description={
                      <Space size={10} wrap>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {money(it.unitPrice)} · stock {it.stock}
                        </Text>
                        <Tag style={{ borderRadius: 999, margin: 0, fontWeight: 900 }}>
                          {money(it.qty * it.unitPrice)}
                        </Tag>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />

            <Divider />

            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Text>Total</Text>
                <Text style={{ fontWeight: 900, fontSize: 16 }}>
                  {money(total)}
                </Text>
              </div>

              <Popconfirm
                title="Confirmar venta"
                description="Se registrará la venta y se actualizará el stock."
                okText="Confirmar"
                cancelText="Cancelar"
                onConfirm={() => onCheckoutSection(tab)}
                disabled={!canPOS}
              >
                <Button
                  type="primary"
                  block
                  disabled={!canPOS}
                  style={{
                    borderRadius: 14,
                    height: 44,
                    fontWeight: 900,
                    background: `linear-gradient(90deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
                  }}
                >
                  Confirmar venta ({SECTION_META[tab].label})
                </Button>
              </Popconfirm>

              {!canPOS && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tu usuario no tiene acceso para confirmar ventas.
                </Text>
              )}
            </Space>
          </>
        ),
    };
  });

  return (
    <ExpandPanel open={open} maxHeight={900}>
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
            <ShoppingCartOutlined />
            <span>Carrito · {siteLabel || "sin sede"}</span>
          </Space>
        }
        extra={
          <Space>
            <Popconfirm
              title="Vaciar carrito (sección)"
              description={`Se eliminarán los productos del carrito de: ${SECTION_META[tab].label}.`}
              okText="Vaciar"
              cancelText="Cancelar"
              onConfirm={() => onClearSection(tab)}
              disabled={!items.length}
            >
              <Button disabled={!items.length} icon={<DeleteOutlined />}>
                Vaciar
              </Button>
            </Popconfirm>

            <Button icon={<CloseOutlined />} onClick={onClose}>
              Cerrar
            </Button>
          </Space>
        }
      >
        <Tabs
          activeKey={tab}
          onChange={(k) => setTab(k)}
          items={tabItems}
        />
      </Card>
    </ExpandPanel>
  );
}
