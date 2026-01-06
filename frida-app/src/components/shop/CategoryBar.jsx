// src/components/shop/CategoryBar.jsx
import React from "react";
import {
  Space,
  Typography,
  Tag,
  Dropdown,
  Button,
  Popconfirm,
  Empty,
  Spin,
} from "antd";
import { MoreOutlined } from "@ant-design/icons";
import { beachColors, neutrals } from "../../theme/beachTheme";

const { Text } = Typography;

function CategoryPill({ c, active, canManage, onSelect, onEdit, onDelete }) {
  const bg = active ? beachColors.turquoise : "rgba(148,163,184,0.16)";
  const fg = active ? "#064e3b" : neutrals.textMain;

  const menu = {
    items: [
      {
        key: "edit",
        icon: <MoreOutlined />,
        label: "Editar",
        onClick: () => onEdit(c),
      },
      {
        key: "del",
        danger: true,
        label: (
          <Popconfirm
            title="Enviar a papelera"
            description="Podrás restaurar la categoría desde Gestión."
            okText="Enviar"
            cancelText="Cancelar"
            onConfirm={() => onDelete(c)}
          >
            <span>Enviar a papelera</span>
          </Popconfirm>
        ),
      },
    ],
  };

  return (
    <Tag
      onClick={() => onSelect(c)}
      style={{
        margin: 0,
        cursor: "pointer",
        userSelect: "none",
        border: "none",
        background: bg,
        color: fg,
        borderRadius: 999,
        padding: canManage ? "6px 6px 6px 12px" : "6px 12px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontWeight: active ? 900 : 800,
      }}
    >
      <span style={{ whiteSpace: "nowrap", lineHeight: 1 }}>{c.name}</span>

      {canManage && (
        <Dropdown trigger={["click"]} menu={menu}>
          <Button
            type="text"
            size="small"
            icon={<MoreOutlined />}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: fg,
            }}
          />
        </Dropdown>
      )}
    </Tag>
  );
}

function CategoryBar({
  categories,
  selectedCategory,
  catsLoading,
  canManage,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
}) {
  return (
    <div className="mtSoft" style={{ marginBottom: 10 }}>
      <Space
        align="center"
        style={{ width: "100%", justifyContent: "space-between" }}
      >
        <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
          Categoría:{" "}
          <strong style={{ color: neutrals.textMain }}>
            {selectedCategory?.name || "—"}
          </strong>
        </Text>

        {catsLoading && (
          <Space size={6}>
            <Spin size="small" />
            <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
              Cargando categorías…
            </Text>
          </Space>
        )}
      </Space>

      <div style={{ marginTop: 10 }}>
        {categories.length === 0 && !catsLoading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span style={{ color: neutrals.textMuted }}>
                No hay categorías por ahora.{" "}
                {canManage ? "Puedes crear una desde Gestión." : ""}
              </span>
            }
          />
        ) : (
          <Space size={[10, 10]} wrap>
            {categories.map((c) => (
              <CategoryPill
                key={c._id}
                c={c}
                active={String(selectedCategory?._id) === String(c._id)}
                canManage={canManage}
                onSelect={(cat) => onSelectCategory(cat)}
                onEdit={(cat) => onEditCategory(cat)}
                onDelete={(cat) => onDeleteCategory(cat)}
              />
            ))}
          </Space>
        )}
      </div>
    </div>
  );
}

export default CategoryBar;
