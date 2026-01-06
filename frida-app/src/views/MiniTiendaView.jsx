// src/views/MiniTiendaView.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  Space,
  Typography,
  Tabs,
  Tag,
  Button,
  Divider,
  message,
  Modal,
  Form,
} from "antd";
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import axios from "@api/axios";
import { beachColors, neutrals } from "../theme/beachTheme";

import MiniTiendaHeader from "../components/shop/MiniTiendaHeader";
import CategoryBar from "../components/shop/CategoryBar";
import ProductsGrid from "../components/shop/ProductsGrid";
import CartPanel from "../components/shop/CartPanel";
import AdminPanel from "../components/shop/AdminPanel";
import CategoryModal from "../components/shop/CategoryModal";
import ProductModal from "../components/shop/ProductModal";

const { Text } = Typography;

const SECTION_TABS = [
  { key: "normal", label: "Tienda" },
  { key: "alcohol", label: "Alcohol" },
];

const SITE_LABELS = {
  casa_frida: "Casa Frida",
  cabanas_fridas: "Cabañas Fridas",
};

const money = (n) =>
  (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

function prettySite(raw) {
  if (!raw) return "";
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

const MiniTiendaView = ({ isMobile, currentUser }) => {
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
  const [adminOpen, setAdminOpen] = useState(false);

  const [cart, setCart] = useState([]);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);

  const [trashLoading, setTrashLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [trashProducts, setTrashProducts] = useState([]);
  const [trashCategories, setTrashCategories] = useState([]);
  const [stockLogs, setStockLogs] = useState([]);
  const [salesLogs, setSalesLogs] = useState([]);

  const [catForm] = Form.useForm();
  const [prodForm] = Form.useForm();

  const bootRef = useRef(false);

  const cartCount = useMemo(
    () => cart.reduce((a, x) => a + x.qty, 0),
    [cart]
  );
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

  const notifyNoAccess = (action = "realizar esta acción") => {
    msgApi.warning({
      content: `Tu usuario no puede ${action}. Si lo necesitas, pide apoyo al administrador.`,
      duration: 2.6,
    });
  };

  const notifyError = (e, userMsg = "Ocurrió un problema") => {
    const status = e?.response?.status;
    const detail =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      "";

    const friendly =
      status === 401
        ? "Tu sesión expiró. Vuelve a iniciar sesión."
        : status === 403
        ? "No tienes acceso para realizar esta acción."
        : userMsg;

    msgApi.error({
      content: (
        <Space size={10} wrap>
          <span>{friendly}</span>
          {detail ? (
            <Button
              type="link"
              size="small"
              icon={<InfoCircleOutlined />}
              onClick={() =>
                Modal.info({
                  title: "Detalles (para soporte)",
                  centered: true,
                  okText: "Entendido",
                  content: (
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Copia esto y envíalo a soporte/administración si es
                        necesario:
                      </Text>
                      <pre
                        style={{
                          marginTop: 8,
                          padding: 10,
                          borderRadius: 10,
                          background: "#0b1220",
                          color: "#e5e7eb",
                          fontSize: 12,
                          overflowX: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {String(detail)}
                      </pre>
                    </div>
                  ),
                })
              }
            >
              Ver detalles
            </Button>
          ) : null}
        </Space>
      ),
      duration: 3,
    });
  };

  const notifyOk = (text) =>
    msgApi.success({
      content: text,
      icon: <CheckCircleOutlined />,
      duration: 2,
    });

  // ---------- LOADERS ----------
  const loadSites = async ({ silent = false } = {}) => {
    setSitesLoading(true);
    try {
      const { data } = await axios.get("/api/shop/sites", {
        withCredentials: true,
      });
      const arr = Array.isArray(data?.items) ? data.items : [];
      setSites(arr);
      if (!site && arr.length) setSite(arr[0]);
      if (!silent && bootRef.current) notifyOk("Sedes actualizadas.");
    } catch (e) {
      console.error(e);
      notifyError(e, "No pudimos cargar las sedes.");
    } finally {
      setSitesLoading(false);
    }
  };

  const loadCategories = async (sec, { silent = false } = {}) => {
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

      if (!silent && bootRef.current) notifyOk("Categorías actualizadas.");
    } catch (e) {
      console.error(e);
      notifyError(e, "No pudimos cargar las categorías.");
    } finally {
      setCatsLoading(false);
    }
  };

  const loadProducts = async ({ silent = false } = {}) => {
    if (!site || !section) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/shop/products", {
        withCredentials: true,
        params: {
          site,
          section,
          categoryId: categoryId || undefined,
          search: search || undefined,
          onlyActive: "1",
        },
      });
      setProducts(Array.isArray(data?.items) ? data.items : []);
      if (!silent && bootRef.current) notifyOk("Productos actualizados.");
    } catch (e) {
      console.error(e);
      notifyError(e, "No pudimos cargar los productos.");
    } finally {
      setLoading(false);
    }
  };

  // ---------- BOOT ----------
  useEffect(() => {
    if (!canView) return;
    loadSites({ silent: true });
    loadCategories(section, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    loadCategories(section, { silent: true });
    setSearchDraft("");
    setSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchDraft.trim()), 260);
    return () => clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    if (!canView) return;
    loadProducts({ silent: true });
    if (!bootRef.current) bootRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site, section, categoryId, search]);

  // ---------- CART ----------
  const addToCart = (p) => {
    if (canPOS) {
      if ((p?.stock || 0) <= 0) {
        msgApi.warning("Este producto está agotado.");
        return;
      }

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
      msgApi.open({
        type: "success",
        content: "Agregado al carrito.",
        duration: 1.3,
      });
      return;
    }

    if (canManage) return openEditProduct(p);

    notifyNoAccess("vender desde la tienda");
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
        .map((x) =>
          x.productId === productId ? { ...x, qty: x.qty - 1 } : x
        )
        .filter((x) => x.qty > 0)
    );
  };

  const removeLine = (productId) => {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    msgApi.info("Carrito vaciado.");
  };

  const confirmIfCartDirty = ({ title, content, onOk }) => {
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
      content:
        "Para evitar confusiones, el carrito se vaciará al cambiar la sede. ¿Continuar?",
      onOk: () => setSite(next),
    });
  };

  // 🔹 AHORA ya NO vaciamos el carrito al cambiar de sección
  const handleChangeSection = (next) => {
    setSection(next);
    setSearchDraft("");
    setSearch("");
    if (cart.length) {
      msgApi.info(
        "Cambiaste de sección, el carrito conserva los productos ya agregados."
      );
    }
  };

  const checkout = async () => {
    if (!cart.length) return;
    if (!site) return msgApi.error("Selecciona una sede para continuar.");
    if (!canPOS) return notifyNoAccess("confirmar ventas");

    msgApi.loading({
      content: "Registrando la venta…",
      key: "checkout",
      duration: 0,
    });
    try {
      const payload = {
        site,
        section,
        items: cart.map((x) => ({
          productId: x.productId,
          qty: x.qty,
        })),
        paymentMethod: "interno",
        note: "",
      };

      await axios.post("/api/shop/sales", payload, {
        withCredentials: true,
      });

      msgApi.success({
        content: "Venta registrada correctamente ✅",
        key: "checkout",
        duration: 2,
      });

      setCart([]);
      setCartOpen(false);
      loadProducts({ silent: true });
    } catch (e) {
      console.error(e);
      msgApi.destroy("checkout");
      notifyError(e, "No pudimos completar la venta.");
    }
  };

  // ---------- GESTIÓN: CATEGORIES ----------
  const openCreateCategory = () => {
    if (!canManage) return notifyNoAccess("gestionar categorías");
    setEditingCategory(null);
    catForm.resetFields();
    catForm.setFieldsValue({ name: "", section });
    setCatModalOpen(true);
  };

  const openEditCategory = (cat) => {
    if (!canManage) return notifyNoAccess("editar categorías");
    setEditingCategory(cat);
    catForm.resetFields();
    catForm.setFieldsValue({ name: cat.name, section: cat.section });
    setCatModalOpen(true);
  };

  const saveCategory = async () => {
    if (!canManage) return notifyNoAccess("guardar categorías");
    try {
      const values = await catForm.validateFields();
      const name = String(values.name || "").trim();
      const sec = values.section;

      msgApi.loading({
        content: editingCategory ? "Guardando cambios…" : "Creando categoría…",
        key: "catSave",
        duration: 0,
      });

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

      msgApi.success({
        content: editingCategory
          ? "Categoría actualizada ✅"
          : "Categoría creada ✅",
        key: "catSave",
        duration: 2,
      });

      setCatModalOpen(false);
      setEditingCategory(null);

      await loadCategories(section, { silent: true });
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      msgApi.destroy("catSave");
      notifyError(e, "No pudimos guardar la categoría.");
    }
  };

  const deleteCategory = async (cat) => {
    if (!canManage) return notifyNoAccess("eliminar categorías");
    msgApi.loading({
      content: "Enviando a papelera…",
      key: "catDel",
      duration: 0,
    });
    try {
      await axios.delete(`/api/shop/categories/${cat._id}`, {
        withCredentials: true,
      });
      msgApi.success({
        content: "Categoría enviada a papelera ✅",
        key: "catDel",
        duration: 2,
      });
      await loadCategories(section, { silent: true });
      await loadProducts({ silent: true });
    } catch (e) {
      console.error(e);
      msgApi.destroy("catDel");
      notifyError(e, "No pudimos enviar la categoría a papelera.");
    }
  };

  // ---------- GESTIÓN: PRODUCTS ----------
  const openCreateProduct = () => {
    if (!canManage) return notifyNoAccess("gestionar productos");
    if (!site) return msgApi.warning("Selecciona una sede primero.");
    if (!categoryId)
      return msgApi.warning("Selecciona una categoría primero.");

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
    if (!canManage) return notifyNoAccess("editar productos");
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
    if (!canManage) return notifyNoAccess("guardar productos");
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

      msgApi.loading({
        content: editingProduct ? "Guardando cambios…" : "Creando producto…",
        key: "prodSave",
        duration: 0,
      });

      if (editingProduct?._id) {
        await axios.patch(`/api/shop/products/${editingProduct._id}`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.post("/api/shop/products", payload, {
          withCredentials: true,
        });
      }

      msgApi.success({
        content: editingProduct
          ? "Producto actualizado ✅"
          : "Producto creado ✅",
        key: "prodSave",
        duration: 2,
      });

      setProdModalOpen(false);
      setEditingProduct(null);
      await loadProducts({ silent: true });
    } catch (e) {
      if (e?.errorFields) return;
      console.error(e);
      msgApi.destroy("prodSave");
      notifyError(e, "No pudimos guardar el producto.");
    }
  };

  const deleteProduct = async (p) => {
    if (!canManage) return notifyNoAccess("eliminar productos");
    msgApi.loading({
      content: "Enviando a papelera…",
      key: "prodDel",
      duration: 0,
    });
    try {
      await axios.delete(`/api/shop/products/${p._id}`, {
        withCredentials: true,
      });
      msgApi.success({
        content: "Producto enviado a papelera ✅",
        key: "prodDel",
        duration: 2,
      });
      await loadProducts({ silent: true });
    } catch (e) {
      console.error(e);
      msgApi.destroy("prodDel");
      notifyError(e, "No pudimos enviar el producto a papelera.");
    }
  };

  // ---------- GESTIÓN (panel): PAPELERA + HISTORIAL ----------
  const openAdminPanel = () => {
    if (!canManage) return notifyNoAccess("abrir gestión");
    setAdminOpen(true);
    setCartOpen(false);
  };

  const loadTrash = async () => {
    if (!canManage) return;
    setTrashLoading(true);
    try {
      const reqs = [
        axios.get("/api/shop/categories/trash", {
          withCredentials: true,
          params: { section },
        }),
      ];

      if (site) {
        reqs.unshift(
          axios.get("/api/shop/products/trash", {
            withCredentials: true,
            params: { site, section },
          })
        );
      }

      const res = await Promise.all(reqs);
      const tp = site ? res[0] : null;
      const tc = site ? res[1] : res[0];

      setTrashProducts(Array.isArray(tp?.data?.items) ? tp.data.items : []);
      setTrashCategories(Array.isArray(tc?.data?.items) ? tc.data.items : []);
    } catch (e) {
      console.error(e);
      notifyError(e, "No pudimos cargar la papelera.");
    } finally {
      setTrashLoading(false);
    }
  };

  const restoreProduct = async (p) => {
    if (!canManage) return;
    msgApi.loading({
      content: "Restaurando producto…",
      key: "restoreProd",
      duration: 0,
    });
    try {
      await axios.patch(
        `/api/shop/products/${p._id}/restore`,
        {},
        { withCredentials: true }
      );
      msgApi.success({
        content: "Producto restaurado ✅",
        key: "restoreProd",
        duration: 2,
      });
      await loadTrash();
      await loadProducts({ silent: true });
    } catch (e) {
      console.error(e);
      msgApi.destroy("restoreProd");
      notifyError(e, "No pudimos restaurar el producto.");
    }
  };

  const restoreCategory = async (c) => {
    if (!canManage) return;
    msgApi.loading({
      content: "Restaurando categoría…",
      key: "restoreCat",
      duration: 0,
    });
    try {
      await axios.patch(
        `/api/shop/categories/${c._id}/restore`,
        {},
        { withCredentials: true }
      );
      msgApi.success({
        content: "Categoría restaurada ✅",
        key: "restoreCat",
        duration: 2,
      });
      await loadTrash();
      await loadCategories(section, { silent: true });
    } catch (e) {
      console.error(e);
      msgApi.destroy("restoreCat");
      notifyError(e, "No pudimos restaurar la categoría.");
    }
  };

  const loadHistory = async () => {
    if (!canView || !site) return;
    setHistoryLoading(true);
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
      notifyError(e, "No pudimos cargar el historial.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!adminOpen) return;
    loadTrash();
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminOpen, site, section]);

  // ---------- UI ----------
  if (!canView) {
    return (
      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Text style={{ color: neutrals.textMuted }}>
          Tu usuario no tiene acceso a esta sección.
        </Text>
      </Card>
    );
  }

  const headerBg = `radial-gradient(circle at top left, ${beachColors.turquoise}12, transparent 55%),
                     radial-gradient(circle at bottom right, ${beachColors.sand}25, transparent 55%), #f8fafc`;

  const gridKey = `${site}-${section}-${categoryId}-${search}`;

  return (
    <div
      style={{
        minHeight: "100%",
        background: headerBg,
      }}
    >
      {msgCtx}

      <MiniTiendaHeader
        isMobile={isMobile}
        canManage={canManage}
        site={site}
        siteLabel={prettySite(site)}
        section={section}
        siteOptions={siteOptions}
        sitesLoading={sitesLoading}
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        loadingProducts={loading}
        onReloadProducts={() => loadProducts({ silent: false })}
        adminOpen={adminOpen}
        onToggleAdmin={() =>
          adminOpen ? setAdminOpen(false) : openAdminPanel()
        }
        cartOpen={cartOpen}
        cartCount={cartCount}
        onToggleCart={() => {
          setCartOpen((v) => !v);
          if (!cartOpen) setAdminOpen(false);
        }}
        onChangeSite={handleChangeSite}
      />

      <CartPanel
        open={cartOpen}
        isMobile={isMobile}
        siteLabel={prettySite(site)}
        cart={cart}
        cartTotal={cartTotal}
        canPOS={canPOS}
        onClose={() => setCartOpen(false)}
        onClearCart={clearCart}
        onInc={inc}
        onDec={dec}
        onRemoveLine={removeLine}
        onCheckout={checkout}
      />

      <AdminPanel
        open={adminOpen}
        isMobile={isMobile}
        siteLabel={prettySite(site)}
        section={section}
        trashLoading={trashLoading}
        historyLoading={historyLoading}
        trashCategories={trashCategories}
        trashProducts={trashProducts}
        stockLogs={stockLogs}
        salesLogs={salesLogs}
        onClose={() => setAdminOpen(false)}
        onReloadAll={() => {
          loadTrash();
          loadHistory();
        }}
        onRestoreCategory={restoreCategory}
        onRestoreProduct={restoreProduct}
      />

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

        <CategoryBar
          categories={categories}
          selectedCategory={selectedCategory}
          catsLoading={catsLoading}
          canManage={canManage}
          onSelectCategory={(cat) => setCategoryId(String(cat._id))}
          onEditCategory={openEditCategory}
          onDeleteCategory={deleteCategory}
        />

        <div key={gridKey}>
          <ProductsGrid
            loading={loading}
            products={products}
            isMobile={isMobile}
            canPOS={canPOS}
            canManage={canManage}
            onAddToCart={addToCart}
            onEditProduct={openEditProduct}
            onDeleteProduct={deleteProduct}
          />
        </div>
      </Card>

      <CategoryModal
        open={catModalOpen}
        editingCategory={editingCategory}
        form={catForm}
        onCancel={() => {
          setCatModalOpen(false);
          setEditingCategory(null);
        }}
        onOk={saveCategory}
      />

      <ProductModal
        open={prodModalOpen}
        editingProduct={editingProduct}
        form={prodForm}
        siteOptions={siteOptions}
        categories={categories}
        onCancel={() => {
          setProdModalOpen(false);
          setEditingProduct(null);
        }}
        onOk={saveProduct}
      />
    </div>
  );
};

export default MiniTiendaView;
