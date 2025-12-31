// src/views/MiniTiendaView.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Tabs,
  Tag,
  Button,
  Select,
  Row,
  Col,
  Badge,
  Drawer,
  List,
  Divider,
  Tooltip,
  Empty,
  Modal,
  Form,
  InputNumber,
  Switch,
  Popconfirm,
  Dropdown,
  message,
  Skeleton,
  Input,
  Spin,
  Flex,
} from "antd";
import {
  ShopOutlined,
  ShoppingCartOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  WarningOutlined,
  DeleteOutlined,
  PlusCircleOutlined,
  SettingOutlined,
  MoreOutlined,
  EditOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UndoOutlined,
  FileTextOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import axios from "@api/axios";
import { beachColors, neutrals } from "../theme/beachTheme";

const { Title, Text } = Typography;

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const SECTION_TABS = [
  { key: "normal", label: "Tienda" },
  { key: "alcohol", label: "Alcohol" },
];

const SITE_LABELS = {
  casa_frida: "Casa Frida",
  cabanas_fridas: "Cabañas Fridas",
};

function prettySite(raw) {
  if (!raw) return "—";
  if (SITE_LABELS[raw]) return SITE_LABELS[raw];
  return String(raw)
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function getRoleKey(currentUser) {
  const r = currentUser?.role;
  if (!r) return "";
  if (typeof r === "string") return r;
  return r?.key || r?.name || "";
}

function normalizePerms(currentUser) {
  const raw =
    currentUser?.permissions ??
    currentUser?.role?.permissions ??
    currentUser?.role?.data?.permissions;

  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string")
    return raw
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
  return [];
}

const MotionStyles = () => (
  <style>{`
    @keyframes mtFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .mtFadeUp { animation: mtFadeUp 220ms ease both; }
    .mtSoft { transition: opacity 180ms ease, transform 180ms ease, filter 180ms ease; }
    .mtCard { transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease; }
    .mtCard:hover { transform: translateY(-2px); box-shadow: 0 18px 34px rgba(15,23,42,0.12); }
    .mtPillBtn { transition: transform 140ms ease; }
    .mtPillBtn:active { transform: scale(0.98); }

    /* ✅ Fix: evita "sobreposición" del grupo derecho */
    .mtHeaderRight { position: relative; z-index: 3; }

    /* ✅ Fix: search con flex + minWidth para que no se monte */
    .mtSearchWrap { flex: 1 1 320px; min-width: 220px; }

    /* ✅ opcional: redondeo consistente cuando hay enterButton */
    .mtSearchWrap .ant-input-group .ant-input-affix-wrapper {
      border-radius: 999px 0 0 999px !important;
    }
    .mtSearchWrap .ant-input-group-addon .ant-btn {
      border-radius: 0 999px 999px 0 !important;
    }
  `}</style>
);

export default function MiniTiendaView({ isMobile, currentUser }) {
  const [msgApi, msgCtx] = message.useMessage();

  const roleKey = getRoleKey(currentUser);
  const isAdmin = roleKey === "administrador";
  const permissions = useMemo(() => normalizePerms(currentUser), [currentUser]);

  const canView = permissions.includes("view_shop") || isAdmin;
  const canPOS = permissions.includes("pos_shop") || isAdmin;
  const canManage = permissions.includes("manage_shop") || isAdmin;

  const [section, setSection] = useState("normal");

  const [site, setSite] = useState("");
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [catsLoading, setCatsLoading] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");

  const [products, setProducts] = useState([]);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  const [cartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState([]);

  // Admin modals
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  // Admin drawer (Papelera + Logs)
  const [adminOpen, setAdminOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [trashProducts, setTrashProducts] = useState([]);
  const [trashCategories, setTrashCategories] = useState([]);
  const [stockLogs, setStockLogs] = useState([]); // StockMovement
  const [salesLogs, setSalesLogs] = useState([]); // Sale

  const [catForm] = Form.useForm();
  const [prodForm] = Form.useForm();

  const cartCount = useMemo(() => cart.reduce((a, x) => a + x.qty, 0), [cart]);
  const cartTotal = useMemo(
    () => cart.reduce((a, x) => a + x.qty * x.unitPrice, 0),
    [cart]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => String(c._id) === String(categoryId)),
    [categories, categoryId]
  );

  const siteOptions = useMemo(
    () => sites.map((s) => ({ label: prettySite(s), value: s })),
    [sites]
  );

  const showAxiosError = (e, fallback) => {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      fallback ||
      "Ocurrió un error";
    msgApi.error(msg);
  };

  // ---------- LOADERS ----------
  const loadSites = async () => {
    setSitesLoading(true);
    try {
      const { data } = await axios.get("/api/shop/sites", {
        withCredentials: true,
      });
      const arr = Array.isArray(data?.items) ? data.items : [];
      setSites(arr);
      if (!site && arr.length) setSite(arr[0]);
    } catch (e) {
      console.error(e);
      showAxiosError(e, "No se pudieron cargar sedes");
    } finally {
      setSitesLoading(false);
    }
  };

  const loadCategories = async (sec) => {
    setCatsLoading(true);
    try {
      const { data } = await axios.get("/api/shop/categories", {
        withCredentials: true,
        params: { section: sec },
      });
      const arr = Array.isArray(data?.items) ? data.items : [];
      setCategories(arr);

      if (arr.length) {
        const exists = arr.some((c) => String(c._id) === String(categoryId));
        if (!exists) setCategoryId(String(arr[0]._id));
      } else {
        setCategoryId("");
      }
    } catch (e) {
      console.error(e);
      showAxiosError(e, "No se pudieron cargar categorías");
    } finally {
      setCatsLoading(false);
    }
  };

  const loadProducts = async () => {
    if (!site || !section) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/shop/products", {
        withCredentials: true,
        params: {
          site,
          section,
          categoryId: categoryId || undefined,
          search: search || undefined, // backend fuzzy
          onlyActive: "1",
        },
      });
      setProducts(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      console.error(e);
      showAxiosError(e, "No se pudieron cargar productos");
    } finally {
      setLoading(false);
    }
  };

  // ---------- BOOT ----------
  useEffect(() => {
    if (!canView) return;
    loadSites();
    loadCategories(section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // change section
  useEffect(() => {
    if (!canView) return;
    loadCategories(section);
    setSearchDraft("");
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // debounce searchDraft
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 260);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // load products on filters
  useEffect(() => {
    if (!canView) return;
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, section, categoryId, search]);

  // ---------- CART ----------
  const addToCart = (p) => {
    if (canPOS) {
      if ((p?.stock || 0) <= 0) return msgApi.warning("Sin stock.");
      setCart((prev) => {
        const i = prev.findIndex((x) => x.productId === p._id);
        if (i >= 0) {
          const next = [...prev];
          const newQty = Math.min(next[i].qty + 1, Number(p.stock || 0));
          next[i] = {
            ...next[i],
            qty: newQty,
            stock: Number(p.stock || 0),
            unitPrice: Number(p.unitPrice),
          };
          return next;
        }
        return [
          ...prev,
          {
            productId: p._id,
            name: p.name,
            unitPrice: Number(p.unitPrice),
            qty: 1,
            stock: Number(p.stock || 0),
          },
        ];
      });
      setCartOpen(true);
      return;
    }

    // Si no puede vender pero sí administrar, click abre editar
    if (canManage) return openEditProduct(p);

    msgApi.warning("Tu usuario no tiene permiso para vender (pos_shop).");
  };

  const inc = (productId) => {
    setCart((prev) =>
      prev.map((x) =>
        x.productId === productId
          ? { ...x, qty: Math.min(x.qty + 1, x.stock) }
          : x
      )
    );
  };

  const dec = (productId) => {
    setCart((prev) =>
      prev
        .map((x) => (x.productId === productId ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  };

  const removeLine = (productId) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  };

  const confirmIfCartDirty = async ({ title, content, onOk }) => {
    if (!cart.length) return onOk();
    Modal.confirm({
      title,
      icon: <ExclamationCircleOutlined />,
      content,
      okText: "Sí, continuar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: () => {
        setCart([]);
        setCartOpen(false);
        onOk();
      },
    });
  };

  const handleChangeSite = (next) => {
    confirmIfCartDirty({
      title: "Cambiar sede",
      content: "Tu carrito se vaciará al cambiar la sede. ¿Continuar?",
      onOk: () => setSite(next),
    });
  };

  const handleChangeSection = (next) => {
    confirmIfCartDirty({
      title: "Cambiar sección",
      content: "Tu carrito se vaciará al cambiar de sección. ¿Continuar?",
      onOk: () => {
        setSection(next);
        setSearchDraft("");
        setSearch("");
      },
    });
  };

  const checkout = async () => {
    if (!cart.length) return;
    if (!site) return msgApi.error("Selecciona una sede.");
    if (!canPOS) return msgApi.warning("Sin permiso pos_shop.");

    const hide = msgApi.loading("Registrando venta…", 0);
    try {
      const payload = {
        site,
        section,
        items: cart.map((x) => ({ productId: x.productId, qty: x.qty })),
        paymentMethod: "interno",
        note: "",
      };

      await axios.post("/api/shop/sales", payload, { withCredentials: true });

      hide();
      msgApi.success({
        content: "Venta registrada ✅",
        icon: <CheckCircleOutlined />,
        duration: 2,
      });

      setCart([]);
      setCartOpen(false);
      loadProducts();
    } catch (e) {
      hide();
      console.error(e);
      showAxiosError(e, "No se pudo completar la venta");
    }
  };

  // ---------- ADMIN: CATEGORIES ----------
  const openCreateCategory = () => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    setEditingCategory(null);
    catForm.resetFields();
    catForm.setFieldsValue({ name: "", section });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat) => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    setEditingCategory(cat);
    catForm.resetFields();
    catForm.setFieldsValue({ name: cat.name, section: cat.section });
    setCatModalOpen(true);
  };

  const saveCategory = async () => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    try {
      const values = await catForm.validateFields();
      const name = String(values.name || "").trim();
      const sec = values.section;

      const hide = msgApi.loading(
        editingCategory ? "Guardando categoría…" : "Creando categoría…",
        0
      );

      if (editingCategory?._id) {
        await axios.patch(
          `/api/shop/categories/${editingCategory._id}`,
          { name, section: sec },
          { withCredentials: true }
        );
      } else {
        await axios.post(
          "/api/shop/categories",
          { name, section: sec },
          { withCredentials: true }
        );
      }

      hide();
      msgApi.success(
        editingCategory ? "Categoría actualizada ✅" : "Categoría creada ✅"
      );
      setCatModalOpen(false);
      setEditingCategory(null);

      await loadCategories(section);
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      showAxiosError(e, "No se pudo guardar la categoría");
    }
  };

  const deleteCategory = async (cat) => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    const hide = msgApi.loading("Enviando a papelera…", 0);
    try {
      await axios.delete(`/api/shop/categories/${cat._id}`, {
        withCredentials: true,
      });
      hide();
      msgApi.success("Categoría enviada a papelera ✅");
      await loadCategories(section);
      await loadProducts();
    } catch (e) {
      hide();
      console.error(e);
      showAxiosError(e, "No se pudo eliminar la categoría");
    }
  };

  // ---------- ADMIN: PRODUCTS ----------
  const openCreateProduct = () => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    if (!site) return msgApi.warning("Selecciona una sede.");
    if (!categoryId) return msgApi.warning("Selecciona una categoría.");

    setEditingProduct(null);
    prodForm.resetFields();
    prodForm.setFieldsValue({
      name: "",
      section,
      site,
      categoryId,
      unitPrice: 0,
      stock: 0,
      minStock: 0,
      active: true,
      imageUrl: "",
    });
    setProdModalOpen(true);
  };

  const openEditProduct = (p) => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    setEditingProduct(p);
    prodForm.resetFields();
    prodForm.setFieldsValue({
      name: p.name,
      section: p.section,
      site: p.site,
      categoryId: p.categoryId,
      unitPrice: Number(p.unitPrice || 0),
      stock: Number(p.stock || 0),
      minStock: Number(p.minStock || 0),
      active: Boolean(p.active),
      imageUrl: p.imageUrl || "",
    });
    setProdModalOpen(true);
  };

  const saveProduct = async () => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    try {
      const v = await prodForm.validateFields();
      const payload = {
        name: String(v.name || "").trim(),
        section: v.section,
        site: String(v.site || "").trim(),
        categoryId: v.categoryId,
        unitPrice: Number(v.unitPrice || 0),
        stock: Math.max(0, Number(v.stock || 0)),
        minStock: Math.max(0, Number(v.minStock || 0)),
        imageUrl: v.imageUrl || "",
        active: Boolean(v.active),
      };

      const hide = msgApi.loading(
        editingProduct ? "Guardando cambios…" : "Creando producto…",
        0
      );

      if (editingProduct?._id) {
        await axios.patch(`/api/shop/products/${editingProduct._id}`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post("/api/shop/products", payload, {
          withCredentials: true,
        });
      }

      hide();
      msgApi.success(
        editingProduct ? "Producto actualizado ✅" : "Producto creado ✅"
      );
      setProdModalOpen(false);
      setEditingProduct(null);
      await loadProducts();
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      showAxiosError(e, "No se pudo guardar el producto");
    }
  };

  const deleteProduct = async (p) => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    const hide = msgApi.loading("Enviando a papelera…", 0);
    try {
      await axios.delete(`/api/shop/products/${p._id}`, {
        withCredentials: true,
      });
      hide();
      msgApi.success("Producto enviado a papelera ✅");
      await loadProducts();
    } catch (e) {
      hide();
      console.error(e);
      showAxiosError(e, "No se pudo eliminar el producto");
    }
  };

  // ---------- ADMIN DRAWER: TRASH + LOGS ----------
  const openAdminDrawer = async () => {
    if (!canManage) return msgApi.warning("No tienes permiso manage_shop.");
    setAdminOpen(true);
  };

  const loadTrash = async () => {
    if (!canManage) return;
    setTrashLoading(true);
    try {
      const [tp, tc] = await Promise.all([
        axios.get("/api/shop/products/trash", {
          withCredentials: true,
          params: { site, section },
        }),
        axios.get("/api/shop/categories/trash", {
          withCredentials: true,
          params: { section },
        }),
      ]);
      setTrashProducts(Array.isArray(tp?.data?.items) ? tp.data.items : []);
      setTrashCategories(Array.isArray(tc?.data?.items) ? tc.data.items : []);
    } catch (e) {
      console.error(e);
      showAxiosError(e, "No se pudo cargar la papelera");
    } finally {
      setTrashLoading(false);
    }
  };

  const restoreProduct = async (p) => {
    if (!canManage) return;
    const hide = msgApi.loading("Restaurando producto…", 0);
    try {
      await axios.patch(
        `/api/shop/products/${p._id}/restore`,
        {},
        { withCredentials: true }
      );
      hide();
      msgApi.success("Producto restaurado ✅");
      await loadTrash();
      await loadProducts();
    } catch (e) {
      hide();
      console.error(e);
      showAxiosError(e, "No se pudo restaurar el producto");
    }
  };

  const restoreCategory = async (c) => {
    if (!canManage) return;
    const hide = msgApi.loading("Restaurando categoría…", 0);
    try {
      await axios.patch(
        `/api/shop/categories/${c._id}/restore`,
        {},
        { withCredentials: true }
      );
      hide();
      msgApi.success("Categoría restaurada ✅");
      await loadTrash();
      await loadCategories(section);
    } catch (e) {
      hide();
      console.error(e);
      showAxiosError(e, "No se pudo restaurar la categoría");
    }
  };

  const loadLogs = async () => {
    if (!canView) return;
    setLogsLoading(true);
    try {
      const [mov, sales] = await Promise.all([
        axios.get("/api/shop/stock-movements", {
          withCredentials: true,
          params: { site, section, limit: 60 },
        }),
        axios.get("/api/shop/sales", {
          withCredentials: true,
          params: { site, limit: 40 },
        }),
      ]);

      setStockLogs(Array.isArray(mov?.data?.items) ? mov.data.items : []);
      setSalesLogs(Array.isArray(sales?.data?.items) ? sales.data.items : []);
    } catch (e) {
      console.error(e);
      showAxiosError(e, "No se pudieron cargar logs");
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!adminOpen) return;
    loadTrash();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminOpen, site, section]);

  // ---------- UI ----------
  if (!canView) {
    return (
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Text style={{ color: neutrals.textMuted }}>
          No tienes permisos para ver la Tienda (view_shop).
        </Text>
      </Card>
    );
  }

  const headerStyle = {
    borderRadius: 18,
    background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
    boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
    overflow: "hidden",
  };

  const gridKey = `${site}-${section}-${categoryId}-${search}`;

  // ========== Category Pill (⋯ SIEMPRE dentro del fondo) ==========
  const CategoryPill = ({ c }) => {
    const active = String(c._id) === String(categoryId);

    const bg = active ? beachColors.turquoise : "rgba(148,163,184,0.16)";
    const fg = active ? "#064e3b" : neutrals.textMain;

    const moreFg = active ? "#064e3b" : neutrals.textMain;
    const moreHoverBg = active ? "rgba(6,78,59,0.12)" : "rgba(15,23,42,0.06)";

    const menu = {
      items: [
        {
          key: "edit",
          icon: <EditOutlined />,
          label: "Editar",
          onClick: () => openEditCategory(c),
        },
        {
          key: "del",
          danger: true,
          icon: <DeleteOutlined />,
          label: (
            <Popconfirm
              title="Enviar categoría a papelera"
              description="Soft delete. Puedes restaurarla desde Admin → Papelera."
              okText="Enviar"
              cancelText="Cancelar"
              onConfirm={() => deleteCategory(c)}
            >
              <span>Enviar a papelera</span>
            </Popconfirm>
          ),
        },
      ],
    };

    return (
      <Tag
        onClick={() => setCategoryId(String(c._id))}
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
                color: moreFg,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = moreHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            />
          </Dropdown>
        )}
      </Tag>
    );
  };

  // Cards: altura consistente + botón siempre abajo
  const CARD_MIN_HEIGHT = isMobile ? 186 : 196;

  return (
    <div
      style={{
        minHeight: "100%",
        background: `radial-gradient(circle at top left, ${beachColors.turquoise}12, transparent 55%),
                     radial-gradient(circle at bottom right, ${beachColors.sand}25, transparent 55%), #f8fafc`,
      }}
    >
      <MotionStyles />
      {msgCtx}

      {/* HEADER */}
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
                    Tienda Panel de Control
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
                      Admin
                    </Tag>
                  )}


                </Space>
              </div>
            </Space>
          </Col>

          <Col>
            <Flex
              className="mtHeaderRight"
              gap={10}
              align="center"
              justify="flex-end"
              style={{ width: "100%" }}
            >
              <Select
                value={site || undefined}
                onChange={handleChangeSite}
                placeholder="Sede"
                style={{ minWidth: isMobile ? 170 : 240, flex: "0 0 auto" }}
                options={siteOptions}
                loading={sitesLoading}
              />

              <div className="mtSearchWrap">
                <Input.Search
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onSearch={(v) => setSearchDraft(String(v || ""))}
                  placeholder="Ingresa el nombre del producto para buscar…"
                  allowClear
                  autoComplete="off"
                  enterButton={isMobile ? <SearchOutlined /> : "Buscar"}
                  loading={loading}
                  style={{ width: "100%" }}
                />
              </div>

              <Tooltip title="Recargar productos">
                <Button
                  className="mtPillBtn"
                  icon={<ReloadOutlined />}
                  onClick={loadProducts}
                  loading={loading}
                  style={{
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.14)",
                    borderColor: "rgba(255,255,255,0.35)",
                    color: "#fff",
                  }}
                />
              </Tooltip>

              {canManage && (
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      {
                        key: "newCat",
                        icon: <PlusCircleOutlined />,
                        label: "Nueva categoría",
                        onClick: openCreateCategory,
                      },
                      {
                        key: "newProd",
                        icon: <PlusCircleOutlined />,
                        label: "Nuevo producto",
                        onClick: openCreateProduct,
                      },
                      { type: "divider" },
                      {
                        key: "adminCenter",
                        icon: <SettingOutlined />,
                        label: "Papelera y logs",
                        onClick: openAdminDrawer,
                      },
                    ],
                  }}
                >
                  <Button
                    className="mtPillBtn"
                    icon={<SettingOutlined />}
                    style={{
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.14)",
                      borderColor: "rgba(255,255,255,0.35)",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    {!isMobile && "Admin"}
                  </Button>
                </Dropdown>
              )}

              <Badge count={cartCount} overflowCount={99}>
                <Button
                  className="mtPillBtn"
                  icon={<ShoppingCartOutlined />}
                  onClick={() => setCartOpen(true)}
                  style={{
                    borderRadius: 999,
                    background: beachColors.sand,
                    borderColor: "transparent",
                    color: beachColors.deepBlue,
                    fontWeight: 900,
                  }}
                >
                  {!isMobile && "Carrito"}
                </Button>
              </Badge>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* MAIN */}
      <Card
        bordered={false}
        style={{
          borderRadius: 18,
          marginTop: 14,
          boxShadow: "0 14px 32px rgba(15,23,42,0.08)",
          background: "#fff",
        }}
        bodyStyle={{ padding: isMobile ? 12 : 14 }}
      >
        <Tabs
          activeKey={section}
          animated={{ inkBar: true, tabPane: true }}
          onChange={handleChangeSection}
          items={SECTION_TABS.map((t) => ({
            key: t.key,
            label: (
              <Space size={6}>
                <span style={{ fontWeight: 900 }}>{t.label}</span>
                <Tag
                  style={{
                    borderRadius: 999,
                    fontSize: 10,
                    border: "none",
                    background: "rgba(148,163,184,0.15)",
                  }}
                >
                  {t.key === "normal"
                    ? "snacks / bebidas"
                    : "vinos / cervezas / licores"}
                </Tag>
              </Space>
            ),
          }))}
        />

        <Divider style={{ margin: "10px 0 12px" }} />

        {/* Categorías */}
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

            <Space size={8}>
              {catsLoading && (
                <Space size={6}>
                  <Spin size="small" />
                  <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
                    Cargando categorías…
                  </Text>
                </Space>
              )}
            </Space>
          </Space>

          <div style={{ marginTop: 10 }}>
            {categories.length === 0 && !catsLoading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: neutrals.textMuted }}>
                    No hay categorías.{" "}
                    {canManage ? "Crea una desde Admin." : ""}
                  </span>
                }
              />
            ) : (
              <Space size={[10, 10]} wrap>
                {categories.map((c) => (
                  <CategoryPill key={c._id} c={c} />
                ))}
              </Space>
            )}
          </div>
        </div>

        {/* Grid mosaicos */}
        <div key={gridKey} className="mtFadeUp">
          {loading ? (
            <Row gutter={[12, 12]}>
              {Array.from({ length: isMobile ? 6 : 10 }).map((_, idx) => (
                <Col key={idx} xs={12} sm={8} md={6} lg={6} xl={4}>
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 16,
                      boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
                    }}
                    bodyStyle={{ padding: 12 }}
                  >
                    <Skeleton active paragraph={{ rows: 2 }} />
                  </Card>
                </Col>
              ))}
            </Row>
          ) : products.length === 0 ? (
            <Empty
              description="No hay productos (o tu búsqueda no encontró nada)."
              style={{ marginTop: 18 }}
            />
          ) : (
            <Row gutter={[12, 12]}>
              {products.map((p) => {
                const low =
                  Number(p.stock || 0) <= Number(p.minStock || 0) &&
                  Number(p.stock || 0) > 0;
                const out = Number(p.stock || 0) <= 0;

                const menuItems = [
                  {
                    key: "edit",
                    icon: <EditOutlined />,
                    label: "Editar",
                    onClick: () => openEditProduct(p),
                  },
                  {
                    key: "del",
                    danger: true,
                    icon: <DeleteOutlined />,
                    label: (
                      <Popconfirm
                        title="Enviar producto a papelera"
                        description="Soft delete. Puedes restaurarlo en Admin → Papelera."
                        okText="Enviar"
                        cancelText="Cancelar"
                        onConfirm={() => deleteProduct(p)}
                      >
                        <span>Enviar a papelera</span>
                      </Popconfirm>
                    ),
                  },
                ];

                return (
                  <Col
                    key={p._id}
                    xs={12}
                    sm={8}
                    md={6}
                    lg={6}
                    xl={4}
                    style={{ display: "flex" }}
                  >
                    <Card
                      hoverable
                      className="mtCard"
                      onClick={() => addToCart(p)}
                      bordered={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: CARD_MIN_HEIGHT,
                        borderRadius: 16,
                        boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
                        background: out ? "rgba(148,163,184,0.10)" : "#fff",
                        opacity: out ? 0.78 : 1,
                        cursor: canPOS || canManage ? "pointer" : "not-allowed",
                      }}
                      bodyStyle={{
                        padding: 12,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Flex vertical gap={10} style={{ height: "100%" }}>
                        {/* Header: nombre (2 líneas max) + precio + ⋯ */}
                        <Flex
                          align="flex-start"
                          justify="space-between"
                          gap={10}
                        >
                          <Text
                            style={{
                              fontWeight: 900,
                              color: neutrals.textMain,
                              fontSize: 13,
                              lineHeight: 1.15,
                              flex: 1,
                              minWidth: 0, // importante para ellipsis
                            }}
                            ellipsis={{ rows: 2, tooltip: p.name }}
                          >
                            {p.name}
                          </Text>

                          <Space size={6} align="start">
                            <Tag
                              style={{
                                borderRadius: 999,
                                border: "none",
                                background: "rgba(59,130,246,0.10)",
                                color: beachColors.deepBlue,
                                fontSize: 10,
                                margin: 0,
                                fontWeight: 900,
                              }}
                            >
                              {money(p.unitPrice)}
                            </Tag>

                            {canManage && (
                              <Dropdown
                                trigger={["click"]}
                                menu={{ items: menuItems }}
                              >
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<MoreOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    padding: 0,
                                    borderRadius: 10,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: neutrals.textMuted,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background =
                                      "rgba(15,23,42,0.06)";
                                    e.currentTarget.style.color =
                                      neutrals.textMain;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background =
                                      "transparent";
                                    e.currentTarget.style.color =
                                      neutrals.textMuted;
                                  }}
                                />
                              </Dropdown>
                            )}
                          </Space>
                        </Flex>

                        {/* Body: stock + status (misma altura siempre) */}
                        <Flex align="center" justify="space-between">
                          <Text
                            style={{ fontSize: 11, color: neutrals.textMuted }}
                          >
                            Stock:{" "}
                            <b style={{ color: neutrals.textMain }}>
                              {p.stock}
                            </b>
                          </Text>

                          {out ? (
                            <Tag
                              color="red"
                              style={{
                                borderRadius: 999,
                                margin: 0,
                                fontSize: 10,
                              }}
                            >
                              Sin stock
                            </Tag>
                          ) : low ? (
                            <Tag
                              icon={<WarningOutlined />}
                              color="gold"
                              style={{
                                borderRadius: 999,
                                margin: 0,
                                fontSize: 10,
                              }}
                            >
                              Bajo
                            </Tag>
                          ) : (
                            <Tag
                              color="green"
                              style={{
                                borderRadius: 999,
                                margin: 0,
                                fontSize: 10,
                              }}
                            >
                              OK
                            </Tag>
                          )}
                        </Flex>

                        {/* Spacer: empuja el botón hasta abajo SIEMPRE */}
                        <div style={{ flex: 1 }} />

                        <Button
                          disabled={(!canPOS && !canManage) || out}
                          style={{
                            borderRadius: 12,
                            fontWeight: 900,
                            height: 40,
                            background: out
                              ? "rgba(148,163,184,0.2)"
                              : beachColors.sand,
                            borderColor: "transparent",
                            color: beachColors.deepBlue,
                          }}
                          icon={canPOS ? <PlusOutlined /> : <EditOutlined />}
                          block
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canPOS) addToCart(p);
                            else openEditProduct(p);
                          }}
                        >
                          {canPOS ? "Agregar" : "Editar"}
                        </Button>
                      </Flex>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>
      </Card>

      {/* Carrito */}
      <Drawer
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>Carrito · {prettySite(site)}</span>
          </Space>
        }
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        width={isMobile ? "92%" : 420}
      >
        {cart.length === 0 ? (
          <Empty description="Carrito vacío" />
        ) : (
          <>
            <List
              dataSource={cart}
              renderItem={(it) => (
                <List.Item
                  style={{ padding: "10px 0" }}
                  actions={[
                    <Button
                      key="dec"
                      icon={<MinusOutlined />}
                      onClick={() => dec(it.productId)}
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
                      onClick={() => inc(it.productId)}
                      style={{ borderRadius: 10 }}
                      disabled={it.qty >= it.stock}
                    />,
                    <Popconfirm
                      key="rm"
                      title="Eliminar del carrito"
                      okText="Eliminar"
                      cancelText="Cancelar"
                      onConfirm={() => removeLine(it.productId)}
                    >
                      <Tooltip title="Eliminar del carrito">
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
                      <Space size={10}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {money(it.unitPrice)} · stock {it.stock}
                        </Text>
                        <Tag
                          style={{
                            borderRadius: 999,
                            margin: 0,
                            fontWeight: 900,
                          }}
                        >
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
                  {money(cartTotal)}
                </Text>
              </div>

              <Popconfirm
                title="Confirmar venta"
                description="Se descontará stock y se registrará la venta."
                okText="Confirmar"
                cancelText="Cancelar"
                onConfirm={checkout}
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
                  Confirmar venta
                </Button>
              </Popconfirm>

              {!canPOS && (
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Tu usuario no tiene permiso <b>pos_shop</b>.
                </Text>
              )}
            </Space>
          </>
        )}
      </Drawer>

      {/* Admin Drawer: Papelera + Logs */}
      <Drawer
        title={
          <Space>
            <SettingOutlined />
            <span>Admin · Papelera y Logs</span>
          </Space>
        }
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        width={isMobile ? "96%" : 720}
        extra={
          <Space>
            <Tooltip title="Recargar">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  loadTrash();
                  loadLogs();
                }}
              />
            </Tooltip>
          </Space>
        }
      >
        <Tabs
          items={[
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
                    Categorías
                  </Divider>

                  {trashCategories.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin categorías en papelera"
                    />
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
                              onConfirm={() => restoreCategory(c)}
                            >
                              <Button icon={<UndoOutlined />}>Restaurar</Button>
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Text style={{ fontWeight: 900 }}>{c.name}</Text>
                            }
                            description={
                              <Text type="secondary">Sección: {c.section}</Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}

                  <Divider orientation="left">
                    Productos (site: <b>{prettySite(site)}</b>, sección:{" "}
                    <b>{section}</b>)
                  </Divider>

                  {trashProducts.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin productos en papelera"
                    />
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
                              onConfirm={() => restoreProduct(p)}
                            >
                              <Button icon={<UndoOutlined />}>Restaurar</Button>
                            </Popconfirm>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Text style={{ fontWeight: 900 }}>{p.name}</Text>
                            }
                            description={
                              <Text type="secondary">
                                {money(p.unitPrice)} · stock {p.stock} · cat{" "}
                                {String(p.categoryId).slice(-6)}
                              </Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Spin>
              ),
            },
            {
              key: "logs",
              label: (
                <Space size={6}>
                  <FileTextOutlined />
                  <span>Logs</span>
                </Space>
              ),
              children: (
                <Spin spinning={logsLoading}>
                  <Divider orientation="left" style={{ marginTop: 0 }}>
                    Movimientos de stock
                  </Divider>

                  {stockLogs.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin movimientos"
                    />
                  ) : (
                    <List
                      size="small"
                      dataSource={stockLogs}
                      renderItem={(m) => (
                        <List.Item>
                          <Space
                            direction="vertical"
                            size={2}
                            style={{ width: "100%" }}
                          >
                            <Space
                              style={{
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <Text style={{ fontWeight: 900 }}>
                                {m.type} ·{" "}
                                {m.delta > 0 ? `+${m.delta}` : m.delta}
                              </Text>
                              <Tag style={{ borderRadius: 999 }}>
                                {new Date(
                                  m.createdAt || Date.now()
                                ).toLocaleString("es-MX")}
                              </Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              productId: {String(m.productId)} · stock{" "}
                              {m.before} → {m.after} · {m.reason || "—"}
                            </Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}

                  <Divider orientation="left">
                    Ventas recientes <HistoryOutlined />
                  </Divider>

                  {salesLogs.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="Sin ventas"
                    />
                  ) : (
                    <List
                      dataSource={salesLogs}
                      renderItem={(s) => (
                        <List.Item>
                          <Space
                            direction="vertical"
                            size={2}
                            style={{ width: "100%" }}
                          >
                            <Space
                              style={{
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <Text style={{ fontWeight: 900 }}>
                                {money(s.total)}
                              </Text>
                              <Tag style={{ borderRadius: 999 }}>
                                {new Date(
                                  s.createdAt || Date.now()
                                ).toLocaleString("es-MX")}
                              </Tag>
                            </Space>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              items:{" "}
                              {Array.isArray(s.items) ? s.items.length : 0} ·
                              método: {s.paymentMethod || "—"} · sección:{" "}
                              {s.section}
                            </Text>
                          </Space>
                        </List.Item>
                      )}
                    />
                  )}
                </Spin>
              ),
            },
          ]}
        />
      </Drawer>

      {/* Modal: Crear/Editar categoría */}
      <Modal
        title={editingCategory ? "Editar categoría" : "Nueva categoría"}
        open={catModalOpen}
        onCancel={() => {
          setCatModalOpen(false);
          setEditingCategory(null);
        }}
        onOk={saveCategory}
        okText={editingCategory ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        destroyOnClose
      >
        <Form form={catForm} layout="vertical">
          <Form.Item
            label="Sección"
            name="section"
            rules={[{ required: true, message: "Selecciona sección" }]}
          >
            <Select
              options={[
                { label: "Normal", value: "normal" },
                { label: "Alcohol", value: "alcohol" },
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Nombre"
            name="name"
            rules={[
              { required: true, message: "Escribe el nombre" },
              { min: 2, message: "Mínimo 2 caracteres" },
            ]}
          >
            <Input placeholder="Ej: Bebidas" />
          </Form.Item>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Tip: el menú ⋯ dentro de cada categoría te deja editar/eliminar.
          </Text>
        </Form>
      </Modal>

      {/* Modal: Crear/Editar producto */}
      <Modal
        title={editingProduct ? "Editar producto" : "Nuevo producto"}
        open={prodModalOpen}
        onCancel={() => {
          setProdModalOpen(false);
          setEditingProduct(null);
        }}
        onOk={saveProduct}
        okText={editingProduct ? "Guardar" : "Crear"}
        cancelText="Cancelar"
        destroyOnClose
        width={560}
      >
        <Form form={prodForm} layout="vertical">
          <Row gutter={12}>
            <Col span={14}>
              <Form.Item
                label="Nombre"
                name="name"
                rules={[
                  { required: true, message: "Nombre requerido" },
                  { min: 2, message: "Mínimo 2 caracteres" },
                ]}
              >
                <Input placeholder="Ej: Agua 600ml" />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item
                label="Sección"
                name="section"
                rules={[{ required: true, message: "Sección requerida" }]}
              >
                <Select
                  options={[
                    { label: "Normal", value: "normal" },
                    { label: "Alcohol", value: "alcohol" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label="Sede"
                name="site"
                rules={[{ required: true, message: "Sede requerida" }]}
              >
                <Select options={siteOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Categoría"
                name="categoryId"
                rules={[{ required: true, message: "Categoría requerida" }]}
              >
                <Select
                  options={categories.map((c) => ({
                    label: c.name,
                    value: c._id,
                  }))}
                  showSearch
                  optionFilterProp="label"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label="Precio"
                name="unitPrice"
                rules={[{ required: true, message: "Precio requerido" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Stock"
                name="stock"
                rules={[{ required: true, message: "Stock requerido" }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Min. stock" name="minStock">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={18}>
              <Form.Item label="Imagen URL (opcional)" name="imageUrl">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Activo" name="active" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Text type="secondary" style={{ fontSize: 12 }}>
            Si el backend responde 403, revisa permisos: <b>manage_shop</b>.
          </Text>
        </Form>
      </Modal>
    </div>
  );
}
