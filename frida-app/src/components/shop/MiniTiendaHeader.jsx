// src/components/shop/MiniTiendaHeader.jsx
import React from "react";
import {
  Card,
  Row,
  Col,
  Space,
  Typography,
  Select,
  Input,
  Button,
  Tooltip,
  Badge,
  Tag,
  Flex,
} from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  ReloadOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { beachColors } from "../../theme/beachTheme";

const { Title, Text } = Typography;

function MiniTiendaHeader({
  isMobile,
  canManage,
  site,
  siteLabel,
  section,
  siteOptions,
  sitesLoading,
  searchDraft,
  onSearchDraftChange,
  loadingProducts,
  onReloadProducts,
  adminOpen,
  onToggleAdmin,
  cartOpen,
  cartCount,
  onToggleCart,
  onChangeSite,
}) {
  const headerStyle = {
    borderRadius: 18,
    background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
    boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
    overflow: "hidden",
  };

  const sectionLabel =
    section === "normal" ? "Snacks y bebidas" : "Alcohol";

  return (
    <Card
      bordered={false}
      style={headerStyle}
      bodyStyle={{ padding: isMobile ? 14 : 18 }}
    >
      <Row gutter={[12, 12]} align="middle" justify="space-between">
        <Col>
          <Space align="center" size={10}>
            <Badge
              count={null}
              style={{ background: "rgba(255,255,255,0.22)", color: "#fff" }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShopOutlined style={{ color: "#fff" }} />
              </div>
            </Badge>

            <div>
              <Space size={8} align="baseline">
                <Title
                  level={4}
                  style={{
                    margin: 0,
                    color: "#fff",
                    fontSize: isMobile ? 18 : 20,
                  }}
                >
                  Tienda
                </Title>

                {canManage && (
                  <Tag
                    style={{
                      borderRadius: 999,
                      border: "none",
                      background: "rgba(255,255,255,0.18)",
                      color: "#fff",
                    }}
                  >
                    Gestión
                  </Tag>
                )}
              </Space>

              <Text
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.82)",
                  fontSize: 12,
                }}
              >
                {siteLabel || "Sin sede seleccionada"} · {sectionLabel}
              </Text>
            </div>
          </Space>
        </Col>

        <Col>
          <Flex
            gap={10}
            align="center"
            justify="flex-end"
            wrap={isMobile ? "wrap" : "nowrap"}
            style={{ width: "100%" }}
          >
            <Select
              value={site || undefined}
              onChange={onChangeSite}
              placeholder="Sede"
              style={{ minWidth: isMobile ? 160 : 220, flex: "0 0 auto" }}
              options={siteOptions}
              loading={sitesLoading}
            />

            <Input.Search
              value={searchDraft}
              onChange={(e) => onSearchDraftChange(e.target.value)}
              onSearch={(v) => onSearchDraftChange(String(v || ""))}
              placeholder="Busca un producto…"
              allowClear
              autoComplete="off"
              loading={loadingProducts}
              style={{
                minWidth: isMobile ? 160 : 260,
                flex: 1,
              }}
            />

            <Tooltip title="Actualizar productos">
              <Button
                icon={<ReloadOutlined />}
                onClick={onReloadProducts}
                loading={loadingProducts}
                style={{
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.35)",
                  color: "#fff",
                }}
              />
            </Tooltip>

            {canManage && (
              <Button
                icon={<SettingOutlined />}
                onClick={onToggleAdmin}
                style={{
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.35)",
                  color: "#fff",
                  fontWeight: 800,
                }}
              >
                {!isMobile && (adminOpen ? "Cerrar gestión" : "Gestión")}
              </Button>
            )}

            <Badge count={cartCount} overflowCount={99}>
              <Button
                icon={<ShoppingCartOutlined />}
                onClick={onToggleCart}
                style={{
                  borderRadius: 999,
                  background: beachColors.sand,
                  borderColor: "transparent",
                  color: beachColors.deepBlue,
                  fontWeight: 900,
                }}
              >
                {!isMobile && (cartOpen ? "Cerrar carrito" : "Carrito")}
              </Button>
            </Badge>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
}

export default MiniTiendaHeader;
