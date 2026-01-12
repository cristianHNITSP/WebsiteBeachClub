// src/components/habitaciones/HabitacionesTable.jsx
import {
  Table,
  Space,
  Typography,
  Badge,
  Button,
  Popconfirm,
  Tag,
  Grid,
  Skeleton,
  Image,
  Descriptions,
  Flex,
  Tooltip,
  Row,
  Col,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  HeartFilled,
  HistoryOutlined,
  PictureOutlined,
  StarFilled,
} from "@ant-design/icons";
import {
  getCapacityLabel,
  getEstadoMeta,
  getSedeMeta,
  hasPromo,
  beachTheme as beachColors,
  neutralsTheme as neutrals,
} from "./helpers";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PLACEHOLDER_IMG = "https://via.placeholder.com/320x220?text=Sin+foto";

const getImages = (record) => {
  const arr = Array.isArray(record?.images) ? record.images : [];
  const legacy = String(record?.img || "").trim();
  const out = arr.map((x) => String(x || "").trim()).filter(Boolean);
  if (!out.length && legacy) return [legacy];
  return out.length ? out : [];
};

const getCover = (record) => {
  const imgs = getImages(record);
  return imgs[0] || PLACEHOLDER_IMG;
};

const HabitacionesTable = ({
  loading,
  habitaciones,
  pagination,
  onChangePage,
  canManageRooms,
  onEdit,
  onTrash,
  onRestore,
  onDeletePermanent,
  deletingRoomId,
  onViewFutureReservations,
  sedesMeta = {},
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(String(value || ""));
    } catch (_) {}
  };

  const ExpandedRow = ({ record }) => {
    const key = record?.sedeKey || record?.hotelCode;

    const apiMeta =
      key && sedesMeta && Object.prototype.hasOwnProperty.call(sedesMeta, key)
        ? sedesMeta[key]
        : null;

    const legacyMeta = getSedeMeta(record?.hotelCode);
    const sedeLabel =
      apiMeta?.label ||
      apiMeta?.name ||
      legacyMeta.label ||
      record?.hotelCode ||
      "Sin sede";

    const estadoMeta = getEstadoMeta(record?.inventoryStatus);

    const promo = hasPromo(record) ? record.offer : null;
    const pct = promo?.discountPercent;

    const amenities = Array.isArray(record?.amenities) ? record.amenities : [];

    const rating = Number(record?.rating || 0);
    const favs = Number(record?.favoritesCount || 0);

    const imgs = getImages(record);
    const cover = getCover(record);

    return (
      <div style={{ padding: 12, background: "#f9fafb", borderRadius: 8 }}>
        <Row gutter={16} wrap>
          <Col xs={24} sm={8} md={6}>
            <div
              style={{
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
              }}
            >
              <Image
                src={cover}
                alt={record?.title || "Habitación"}
                width="100%"
                height={180}
                preview={imgs.length > 0}
                style={{ objectFit: "cover" }}
                fallback={PLACEHOLDER_IMG}
                placeholder={
                  <div
                    style={{
                      height: 180,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: neutrals.textMuted,
                      gap: 8,
                    }}
                  >
                    <PictureOutlined />
                    Cargando imagen…
                  </div>
                }
              />
            </div>

            <Space direction="vertical" size={6} style={{ marginTop: 8, width: "100%" }}>
              <Tooltip title="Copiar URL de la miniatura (primera imagen)">
                <Button
                  size="small"
                  block
                  icon={<PictureOutlined />}
                  onClick={() => copyToClipboard(cover === PLACEHOLDER_IMG ? "" : cover)}
                >
                  Copiar miniatura
                </Button>
              </Tooltip>

              {imgs.length > 1 ? (
                <div
                  style={{
                    border: "1px dashed #e5e7eb",
                    borderRadius: 10,
                    padding: 8,
                    background: "#fff",
                  }}
                >
                  <Text style={{ fontSize: 11, color: neutrals.textMuted, fontWeight: 700 }}>
                    Galería ({imgs.length})
                  </Text>

                  <div style={{ marginTop: 8 }}>
                    <Image.PreviewGroup items={imgs}>
                      <Row gutter={[8, 8]}>
                        {imgs.slice(0, 6).map((u, i) => (
                          <Col key={`${u}-${i}`} span={8}>
                            <div
                              style={{
                                borderRadius: 10,
                                overflow: "hidden",
                                border: "1px solid #e5e7eb",
                                background: "#f8fafc",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Image
                                src={u}
                                width="100%"
                                height={64}
                                style={{ objectFit: "cover" }}
                                preview
                                fallback={PLACEHOLDER_IMG}
                              />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Image.PreviewGroup>
                  </div>

                  {imgs.length > 6 ? (
                    <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
                      +{imgs.length - 6} más…
                    </Text>
                  ) : null}
                </div>
              ) : null}
            </Space>
          </Col>

          <Col xs={24} sm={16} md={18}>
            <Flex justify="space-between" align="flex-start" wrap style={{ marginBottom: 8, gap: 8 }}>
              <Space direction="vertical" size={0}>
                <Text style={{ fontWeight: 700, fontSize: 14, color: neutrals.textMain }}>
                  {record?.codigo || "—"} · {record?.title || "Habitación"}
                </Text>

                <Space size={6} wrap>
                  <Tag
                    color={legacyMeta?.color || "#e5e7eb"}
                    style={{
                      borderRadius: 999,
                      fontSize: 10,
                      color: legacyMeta?.textColor || "#111827",
                      margin: 0,
                    }}
                  >
                    {sedeLabel}
                  </Tag>

                  <Tag
                    color={estadoMeta.color}
                    style={{
                      borderRadius: 999,
                      fontSize: 10,
                      color: estadoMeta.textColor,
                      margin: 0,
                      opacity: record?.isDeleted ? 0.65 : 1,
                    }}
                  >
                    {estadoMeta.label}
                  </Tag>

                  {record?.featured ? (
                    <Tag
                      color={beachColors.turquoise}
                      style={{ borderRadius: 999, fontSize: 10, margin: 0, color: "#064e3b" }}
                    >
                      Destacada
                    </Tag>
                  ) : null}

                  {record?.badge ? (
                    <Tag
                      color={beachColors.coral}
                      style={{ borderRadius: 999, fontSize: 10, margin: 0, color: "#7f1d1d" }}
                    >
                      {record.badge}
                    </Tag>
                  ) : null}

                  {promo ? (
                    <Tag
                      color={beachColors.sunset}
                      style={{ borderRadius: 999, fontSize: 10, margin: 0, color: "#7c2d12" }}
                    >
                      Promo {typeof pct === "number" ? `-${pct}%` : ""}
                    </Tag>
                  ) : (
                    <Tag
                      style={{
                        borderRadius: 999,
                        fontSize: 10,
                        margin: 0,
                        color: neutrals.textMuted,
                      }}
                    >
                      Sin promo
                    </Tag>
                  )}

                  {record?.isDeleted ? (
                    <Tag style={{ borderRadius: 999, fontSize: 10, margin: 0 }}>Papelera</Tag>
                  ) : null}
                </Space>
              </Space>

              <Space size={10}>
                <Space size={4}>
                  <StarFilled style={{ color: rating > 0 ? beachColors.sunset : "#d1d5db" }} />
                  <Text style={{ fontSize: 12, fontWeight: 700 }}>
                    {rating > 0 ? rating.toFixed(1) : "—"}
                  </Text>
                </Space>
                <Space size={4}>
                  <HeartFilled style={{ color: favs > 0 ? beachColors.coral : "#d1d5db" }} />
                  <Text style={{ fontSize: 12, fontWeight: 700 }}>{favs}</Text>
                </Space>
              </Space>
            </Flex>

            <Descriptions
              size="small"
              column={isMobile ? 1 : 2}
              labelStyle={{ color: neutrals.textMuted, fontSize: 11 }}
              contentStyle={{ color: neutrals.textMain, fontSize: 12, fontWeight: 600 }}
            >
              <Descriptions.Item label="Tipo">{record?.roomType || "—"}</Descriptions.Item>
              <Descriptions.Item label="Ubicación">{record?.location || "—"}</Descriptions.Item>
              <Descriptions.Item label="Capacidad">{getCapacityLabel(record?.size) || "—"}</Descriptions.Item>
              <Descriptions.Item label="Tarifa base">
                ${Number(record?.price || 0).toLocaleString("es-MX")}
              </Descriptions.Item>
              <Descriptions.Item label="Código interno">{record?.roomNumber || "—"}</Descriptions.Item>
              <Descriptions.Item label="Imágenes">{imgs.length ? `${imgs.length}` : "—"}</Descriptions.Item>
            </Descriptions>

            {amenities.length ? (
              <div style={{ marginTop: 8 }}>
                <Text style={{ fontSize: 11, color: neutrals.textMuted, fontWeight: 700 }}>
                  Servicios
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Space size={[6, 6]} wrap>
                    {amenities.map((a, i) => (
                      <Tag key={`${a}-${i}`} style={{ borderRadius: 999, fontSize: 10, margin: 0 }}>
                        {a}
                      </Tag>
                    ))}
                  </Space>
                </div>
              </div>
            ) : null}
          </Col>
        </Row>
      </div>
    );
  };

  const columns = [
    {
      title: "Habitación",
      dataIndex: "codigo",
      key: "codigo",
      render: (codigo, record) => {
        const cover = getCover(record);

        return (
          <Space size={10} align="start">
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                flex: "0 0 auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={cover}
                width={40}
                height={40}
                preview={false}
                style={{ objectFit: "cover" }}
                fallback={PLACEHOLDER_IMG}
              />
            </div>

            <Space direction="vertical" size={0} style={{ minWidth: 0 }}>
              <Space size={6} wrap>
                <HomeOutlined style={{ fontSize: 13, color: beachColors.deepBlue }} />
                <Text style={{ fontWeight: 800, color: neutrals.textMain, fontSize: 12 }}>
                  {codigo}
                </Text>
                {record.isDeleted && (
                  <Tag style={{ borderRadius: 999, fontSize: 10, marginLeft: 4 }}>Papelera</Tag>
                )}
              </Space>

              <Text
                className="frida-ellipsis"
                style={{
                  fontSize: 10,
                  color: neutrals.textMuted,
                  maxWidth: isMobile ? 220 : 420,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {record.title}
              </Text>

              {!isMobile ? (
                <Text style={{ fontSize: 10, color: neutrals.textMuted }}>
                  {record.location || "—"} · {record.roomType || "—"}
                </Text>
              ) : null}
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Sede",
      dataIndex: "hotelCode",
      key: "hotelCode",
      width: 140,
      responsive: ["md"],
      render: (hotelCode, record) => {
        const key = record?.sedeKey || hotelCode;

        const apiMeta =
          key && sedesMeta && Object.prototype.hasOwnProperty.call(sedesMeta, key)
            ? sedesMeta[key]
            : null;

        const legacyMeta = getSedeMeta(hotelCode);

        const label =
          apiMeta?.label || apiMeta?.name || legacyMeta.label || hotelCode || "Sin sede";

        const color = apiMeta?.color || legacyMeta.color || "#e5e7eb";
        const textColor = apiMeta?.textColor || legacyMeta.textColor || "#111827";

        return (
          <Tag color={color} style={{ borderRadius: 999, fontSize: 10, color: textColor }}>
            {label}
          </Tag>
        );
      },
    },
    {
      title: "Capacidad",
      dataIndex: "size",
      key: "size",
      align: "center",
      width: 120,
      responsive: ["md"],
      render: (size) => (
        <Badge
          count={getCapacityLabel(size)}
          style={{ backgroundColor: beachColors.turquoise, color: "#064e3b", fontSize: 9 }}
        />
      ),
    },
    {
      title: "Tarifa",
      dataIndex: "price",
      key: "price",
      align: "right",
      width: 120,
      render: (price) => (
        <Text style={{ fontSize: 11, color: neutrals.textMain, fontWeight: 700 }}>
          ${Number(price || 0).toLocaleString("es-MX")}
        </Text>
      ),
    },
    {
      title: "Estado",
      dataIndex: "inventoryStatus",
      key: "inventoryStatus",
      width: 110,
      render: (estado, record) => {
        const meta = getEstadoMeta(estado);
        return (
          <Tag
            color={meta.color}
            style={{
              borderRadius: 999,
              fontSize: 10,
              color: meta.textColor,
              opacity: record.isDeleted ? 0.65 : 1,
            }}
          >
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      align: "right",
      width: isMobile ? 260 : 380,
      render: (_, record) => {
        const viewBtn = (
          <Button
            size="small"
            type="text"
            icon={<HistoryOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onViewFutureReservations?.(record);
            }}
            disabled={loading}
            style={{ color: beachColors.teal }}
          >
            Reservas futuras
          </Button>
        );

        if (!canManageRooms) return <Space size={4}>{viewBtn}</Space>;

        return (
          <Space size={4} onClick={(e) => e.stopPropagation()}>
            {viewBtn}

            {!record.isDeleted ? (
              <>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(record);
                  }}
                  disabled={loading}
                  style={{ color: beachColors.deepBlue }}
                >
                  Editar
                </Button>

                <Popconfirm
                  title="Enviar a papelera"
                  description="La habitación se oculta de la lista, pero podrás restaurarla más adelante."
                  okText="Enviar"
                  cancelText="Cancelar"
                  onConfirm={() => onTrash(record._id)}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={<DeleteOutlined />}
                    loading={deletingRoomId === record._id}
                    style={{ color: beachColors.coral }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Papelera
                  </Button>
                </Popconfirm>
              </>
            ) : (
              <>
                <Popconfirm
                  title="Restaurar habitación"
                  description="Volverá a estar visible en la lista."
                  okText="Restaurar"
                  cancelText="Cancelar"
                  onConfirm={() => onRestore(record._id)}
                >
                  <Button
                    size="small"
                    type="text"
                    loading={deletingRoomId === record._id}
                    style={{ color: beachColors.teal }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Restaurar
                  </Button>
                </Popconfirm>

                <Popconfirm
                  title="Eliminar definitivamente"
                  description="La habitación se eliminará por completo. Esta acción no se puede deshacer."
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => onDeletePermanent(record._id)}
                >
                  <Button
                    size="small"
                    danger
                    type="text"
                    loading={deletingRoomId === record._id}
                    style={{ color: "#b91c1c" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Eliminar
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const showSkeleton = loading && (!habitaciones || habitaciones.length === 0);
  if (showSkeleton) {
    return (
      <div style={{ marginTop: 8 }}>
        {[1, 2, 3, 4, 5].map((row) => (
          <div
            key={row}
            style={{
              padding: "10px 8px",
              marginBottom: 6,
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Skeleton.Avatar active size="small" shape="square" />
            <div style={{ flex: 1 }}>
              <Skeleton.Input active size="small" style={{ width: "60%", marginBottom: 4 }} />
              <Skeleton.Input active size="small" style={{ width: "40%" }} />
            </div>
            {!isMobile && (
              <div style={{ width: 140 }}>
                <Skeleton.Input active size="small" style={{ width: "100%" }} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      <style>{`
        .frida-row-deleted td { opacity: .72; }
        .frida-ellipsis { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      `}</style>

      <Table
        size="small"
        columns={columns}
        dataSource={habitaciones}
        rowKey="_id"
        loading={loading}
        tableLayout="fixed"
        pagination={{
          ...pagination,
          pageSize: 5,
          showSizeChanger: false,
        }}
        onChange={(pag) => onChangePage(pag.current || 1)}
        style={{ marginTop: 4 }}
        scroll={isMobile ? { x: 720 } : undefined}
        rowClassName={(record) => (record?.isDeleted ? "frida-row-deleted" : "")}
        expandable={{
          expandedRowRender: (record) => <ExpandedRow record={record} />,
          expandRowByClick: true,
          rowExpandable: () => true,
        }}
      />
    </div>
  );
};

export default HabitacionesTable;
