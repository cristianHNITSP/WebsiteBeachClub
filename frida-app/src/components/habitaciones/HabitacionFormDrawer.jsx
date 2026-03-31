// src/components/habitaciones/HabitacionFormDrawer.jsx
// ─── Custom right-slide panel for room creation/editing ───
import React, { useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  Switch,
  Upload,
  Button,
  Tag,
  Tooltip,
  message,
  Popconfirm,
} from "antd";
import {
  UploadOutlined,
  LinkOutlined,
  PictureOutlined,
  StarFilled,
  DeleteOutlined,
  CloseOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import {
  CAPACITY_OPTIONS,
  tiposHabitacion,
  INVENTORY_STATES,
} from "./helpers";
import { DS, adaptiveText, glassCard } from "../website/glassStyles";
import { SlidePanel } from "./EditorialModal";

const { Option } = Select;

const MAX_IMAGES = 8;
const STAR_BTN_SIZE = 26;

const toUrlFile = (url, idx = 0) => ({
  uid: `url-${idx}-${url}`,
  name: `imagen-${idx + 1}`,
  status: "done",
  url,
});

const cleanUrl = (u) => String(u || "").trim();

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });

const isLocalUploadsHab = (url) => {
  const u = cleanUrl(url);
  return u.includes("/uploads/habitaciones/");
};

const labelStyle = {
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.16em",
  fontWeight: 700,
  fontFamily: "'Manrope', sans-serif",
  color: "rgba(23,28,33,0.38)",
  display: "block",
  marginBottom: 6,
};

const ghostInput = {
  background: "transparent",
  border: "none",
  borderBottom: "1px solid rgba(208,194,208,0.20)",
  borderRadius: 0,
  paddingLeft: 0,
  fontFamily: "'Manrope', sans-serif",
  fontSize: 14,
};

const HabitacionFormDrawer = ({
  visible,
  isMobile,
  editando,
  form,
  onCancel,
  onOk,
  saving,
  sedesOptions = [],
}) => {
  const opcionesSede = Array.isArray(sedesOptions) ? sedesOptions : [];

  const [fileList, setFileList] = useState([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [messageApi, contextHolder] = message.useMessage();
  const [confirmOpen, setConfirmOpen] = useState({});
  const setConfirmFor = (uid, open) =>
    setConfirmOpen((prev) => ({ ...prev, [uid]: open }));

  const imagesFromForm = useMemo(() => {
    const imgs = form?.getFieldValue?.("images");
    const legacy = form?.getFieldValue?.("img");
    const arr = Array.isArray(imgs) ? imgs.map(cleanUrl).filter(Boolean) : [];
    if (arr.length) return arr;
    const l = cleanUrl(legacy);
    return l ? [l] : [];
  }, [form, visible]);

  useEffect(() => {
    if (!visible) return;
    const arr = imagesFromForm;
    const list = arr.slice(0, MAX_IMAGES).map((u, i) => toUrlFile(u, i));
    setFileList(list);
    form?.setFieldsValue?.({
      images: arr.slice(0, MAX_IMAGES),
      img: arr[0] || "",
      deletedImages: [],
    });
    setConfirmOpen({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const syncFormImages = (nextFileList) => {
    const urls = (nextFileList || [])
      .map((f) => cleanUrl(f?.url || f?.response?.url))
      .filter(Boolean)
      .slice(0, MAX_IMAGES);
    form?.setFieldsValue?.({ images: urls, img: urls[0] || "" });
  };

  const pushDeletedImage = (url) => {
    const u = cleanUrl(url);
    if (!u) return;
    const prev = form?.getFieldValue?.("deletedImages");
    const arr = Array.isArray(prev) ? prev.map(cleanUrl).filter(Boolean) : [];
    if (arr.includes(u)) return;
    form?.setFieldsValue?.({ deletedImages: [...arr, u] });
  };

  const removeByUid = (uid) => {
    setFileList((prev) => {
      const next = (prev || []).filter((f) => f.uid !== uid);
      syncFormImages(next);
      return next;
    });
  };

  const removeWithPolicy = (file, { deleteFromServer = false } = {}) => {
    const uid = file?.uid;
    if (!uid) return;
    const url = cleanUrl(file?.url || file?.response?.url);
    const local = !!url && isLocalUploadsHab(url);
    if (deleteFromServer && local) {
      pushDeletedImage(url);
      messageApi.open({ type: "warning", content: "Se eliminará del servidor al guardar.", duration: 2 });
    }
    removeByUid(uid);
    setConfirmFor(uid, false);
  };

  const setAsCover = (uid) => {
    setFileList((prev) => {
      const idx = prev.findIndex((f) => f.uid === uid);
      if (idx <= 0) { syncFormImages(prev); return prev; }
      const copy = [...prev];
      const [picked] = copy.splice(idx, 1);
      copy.unshift(picked);
      syncFormImages(copy);
      return copy;
    });
  };

  const handleAddUrl = () => {
    const u = cleanUrl(urlDraft);
    if (!u) return;
    setFileList((prev) => {
      const exists = prev.some((f) => cleanUrl(f.url) === u);
      if (exists) return prev;
      const next = [...prev, toUrlFile(u, prev.length)].slice(0, MAX_IMAGES);
      syncFormImages(next);
      return next;
    });
    setUrlDraft("");
  };

  const customRequest = async (options) => {
    const { file, onProgress, onError, onSuccess } = options;
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post("/api/habitaciones/upload", fd, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          const total = evt.total || 1;
          onProgress?.({ percent: Math.round((evt.loaded / total) * 100) });
        },
      });
      onSuccess?.(res.data, file);
    } catch (err) {
      console.error(err);
      onError?.(err);
    }
  };

  const handleChange = ({ fileList: nextList }) => {
    const normalized = (nextList || []).map((f) => {
      const url = cleanUrl(f?.url || f?.response?.url);
      if (f.status === "done" && url) return { ...f, url };
      return f;
    });
    const limited = normalized.slice(0, MAX_IMAGES);
    setFileList(limited);
    syncFormImages(limited);
  };

  const handlePreview = async (file) => {
    const url = cleanUrl(file?.url || file?.response?.url);
    if (url) { setPreviewSrc(url); setPreviewOpen(true); return; }
    if (file?.originFileObj) {
      const base64 = await fileToBase64(file.originFileObj);
      setPreviewSrc(base64); setPreviewOpen(true);
    }
  };

  const coverUid = fileList?.[0]?.uid;
  const panelWidth = isMobile ? "100%" : 560;

  return (
    <>
      {contextHolder}

      <SlidePanel open={visible} onClose={onCancel} width={panelWidth}>
        {/* ── Header ── */}
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: "24px 28px 18px",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(208,194,208,0.10)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: DS.tertiary,
                display: "block",
                marginBottom: 6,
              }}>
                {editando ? "Editar Suite" : "Nueva Suite"}
              </span>
              <h2 style={{
                fontFamily: "'Noto Serif', serif",
                fontSize: 22,
                fontWeight: 700,
                color: DS.onSurface,
                margin: 0,
                lineHeight: 1.2,
              }}>
                {editando ? (editando.title || `Hab. ${editando.roomNumber}`) : "Configurar Habitación"}
              </h2>
            </div>
            <button
              onClick={onCancel}
              style={{
                padding: 8,
                background: "transparent",
                border: "1px solid rgba(208,194,208,0.25)",
                borderRadius: 999,
                cursor: "pointer",
                color: "rgba(23,28,33,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                flexShrink: 0,
              }}
            >
              <CloseOutlined style={{ fontSize: 12 }} />
            </button>
          </div>
          <p style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: 12,
            color: "rgba(23,28,33,0.40)",
            margin: "8px 0 0",
          }}>
            La primera imagen será la portada. Puedes subir archivos o pegar URLs.
          </p>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "28px 28px 130px", flex: 1 }}>
          <Form form={form} layout="vertical" size="middle" requiredMark={false}>
            <Form.Item name="images" hidden><Input /></Form.Item>
            <Form.Item name="deletedImages" hidden><Input /></Form.Item>

            {/* Identity */}
            <div style={{ marginBottom: 32 }}>
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase", color: DS.secondary,
                display: "block", marginBottom: 16,
              }}>Identidad</span>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Código</label>
                  <Form.Item name="codigo" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                    <Input placeholder="CF-103" style={ghostInput} />
                  </Form.Item>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Número de puerta</label>
                  <Form.Item name="roomNumber" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                    <Input placeholder="103" style={ghostInput} />
                  </Form.Item>
                </div>
              </div>

              <label style={labelStyle}>Nombre</label>
              <Form.Item name="title" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                <Input placeholder="Suite Patio Privado" style={{ ...ghostInput, fontFamily: "'Noto Serif', serif", fontSize: 18 }} />
              </Form.Item>

              <label style={labelStyle}>Ubicación</label>
              <Form.Item name="location" style={{ marginBottom: 0 }}>
                <Input placeholder="Chuburná, frente al mar..." style={ghostInput} />
              </Form.Item>
            </div>

            {/* Images */}
            <div style={{
              marginBottom: 32,
              borderRadius: 14,
              padding: "20px 20px 16px",
              background: "rgba(240,244,250,0.6)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <PictureOutlined style={{ color: DS.surfaceTint }} />
                <span style={{
                  fontFamily: "'Manrope', sans-serif",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                  textTransform: "uppercase", color: DS.surfaceTint,
                }}>Galería de Imágenes</span>
              </div>

              <Upload
                accept="image/*"
                listType="picture-card"
                multiple
                maxCount={MAX_IMAGES}
                fileList={fileList}
                customRequest={customRequest}
                onChange={handleChange}
                onPreview={handlePreview}
                showUploadList={{ showPreviewIcon: true, showRemoveIcon: false, showDownloadIcon: false }}
                onRemove={() => false}
                itemRender={(originNode, file) => {
                  const isCover = file?.uid === coverUid && file?.status === "done";
                  const canSetCover = file?.status === "done" && !!coverUid;
                  const url = cleanUrl(file?.url || file?.response?.url);
                  const isLocal = !!url && isLocalUploadsHab(url);
                  const uid = file?.uid;

                  return (
                    <div style={{ position: "relative", overflow: "visible" }}>
                      {originNode}
                      {canSetCover && (
                        <Tooltip title={isCover ? "Portada" : "Marcar como portada"}>
                          <Button
                            size="small" type="text" shape="circle" icon={<StarFilled />}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setAsCover(file.uid); }}
                            style={{
                              position: "absolute", top: 0, right: 0, zIndex: 60,
                              width: STAR_BTN_SIZE, height: STAR_BTN_SIZE, minWidth: STAR_BTN_SIZE,
                              padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                              pointerEvents: "auto", background: "rgba(255,255,255,0.96)",
                              border: "1px solid rgba(15,23,42,0.12)",
                              boxShadow: "0 6px 14px rgba(15,23,42,0.14)",
                              color: isCover ? "#faad14" : "#9ca3af",
                            }}
                          />
                        </Tooltip>
                      )}
                      {uid && (
                        <Popconfirm
                          open={!!confirmOpen[uid]}
                          onOpenChange={(open) => setConfirmFor(uid, open)}
                          placement="bottomRight"
                          title={
                            <div style={{ maxWidth: 260 }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>Quitar imagen</div>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                                {isLocal
                                  ? 'Si eliges "Eliminar del servidor", se borrará permanentemente al guardar.'
                                  : "Esta imagen no es de tus uploads locales."}
                              </div>
                              <Space wrap>
                                <Button size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeWithPolicy(file, { deleteFromServer: false }); }}>Solo quitar</Button>
                                <Button size="small" danger type="primary" disabled={!isLocal} onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeWithPolicy(file, { deleteFromServer: true }); }}>Eliminar del servidor</Button>
                                <Button size="small" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmFor(uid, false); }}>Cancelar</Button>
                              </Space>
                            </div>
                          }
                          okButtonProps={{ style: { display: "none" } }}
                          cancelButtonProps={{ style: { display: "none" } }}
                        >
                          <Tooltip title="Quitar / Eliminar">
                            <Button
                              size="small" type="text" shape="circle" icon={<DeleteOutlined />}
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmFor(uid, true); }}
                              style={{
                                position: "absolute", top: STAR_BTN_SIZE + 2, right: 0, zIndex: 55,
                                width: STAR_BTN_SIZE, height: STAR_BTN_SIZE, minWidth: STAR_BTN_SIZE,
                                padding: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                pointerEvents: "auto", background: "rgba(255,255,255,0.96)",
                                border: "1px solid rgba(15,23,42,0.12)",
                                boxShadow: "0 6px 14px rgba(15,23,42,0.12)", color: "#ef4444",
                              }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}
                      {isCover && (
                        <div style={{ position: "absolute", left: 6, bottom: 6, zIndex: 20 }}>
                          <Tag icon={<StarFilled />} color="gold" style={{ borderRadius: 999, fontSize: 10, margin: 0 }}>Portada</Tag>
                        </div>
                      )}
                    </div>
                  );
                }}
              >
                {fileList.length >= MAX_IMAGES ? null : (
                  <div><UploadOutlined /><div style={{ marginTop: 6, fontSize: 11 }}>Subir</div></div>
                )}
              </Upload>

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <Input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} placeholder="Pega un link de imagen..." onPressEnter={handleAddUrl} style={ghostInput} />
                <Button icon={<LinkOutlined />} onClick={handleAddUrl} style={{ borderRadius: 999 }}>URL</Button>
              </div>
            </div>

            {/* Classification & Rate */}
            <div style={{ marginBottom: 32 }}>
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase", color: DS.secondary,
                display: "block", marginBottom: 16,
              }}>Clasificación & Tarifa</span>

              <Form.Item name="img" hidden><Input /></Form.Item>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Sede</label>
                  <Form.Item name="hotelCode" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                    <Select placeholder="Selecciona" style={{ width: "100%" }} variant="borderless">
                      {opcionesSede.map((s) => (
                        <Option key={s.value} value={s.value} disabled={s.disabled}>
                          {s.label}{s.disabled && " (inactiva)"}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Tipo</label>
                  <Form.Item name="roomType" style={{ marginBottom: 16 }}>
                    <Select placeholder="Tipo" style={{ width: "100%" }} variant="borderless">
                      {tiposHabitacion.map((t) => <Option key={t} value={t}>{t}</Option>)}
                    </Select>
                  </Form.Item>
                </div>
              </div>

              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Capacidad</label>
                  <Form.Item name="size" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                    <Select placeholder="Capacidad" style={{ width: "100%" }} variant="borderless">
                      {CAPACITY_OPTIONS.map((opt) => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                    </Select>
                  </Form.Item>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Tarifa Base / Noche</label>
                  <Form.Item name="price" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 16 }}>
                    <InputNumber min={0} step={50} style={{ width: "100%", ...ghostInput }} prefix="$" />
                  </Form.Item>
                </div>
              </div>

              <label style={labelStyle}>Estado del Inventario</label>
              <Form.Item name="inventoryStatus" rules={[{ required: true, message: "Requerido" }]} style={{ marginBottom: 0 }}>
                <Select placeholder="Estado" style={{ width: "100%" }} variant="borderless">
                  {INVENTORY_STATES.map((e) => <Option key={e} value={e}>{e}</Option>)}
                </Select>
              </Form.Item>
            </div>

            {/* Promotions */}
            <div style={{
              marginBottom: 32, borderRadius: 14, padding: "20px 20px 16px",
              background: "rgba(240,244,250,0.6)",
            }}>
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase", color: DS.gold,
                display: "block", marginBottom: 14,
              }}>Descuentos & Promoción</span>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <Form.Item name="offerIsSpecial" valuePropName="checked" style={{ margin: 0 }}>
                  <Switch
                    checkedChildren="Sí" unCheckedChildren="No"
                    onChange={(checked) => { if (!checked) form?.setFieldsValue?.({ offerDiscountPercent: null, offerDescription: "" }); }}
                  />
                </Form.Item>
                <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 13, color: "rgba(23,28,33,0.6)" }}>
                  ¿Tiene descuento especial?
                </span>
              </div>

              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const on = !!getFieldValue("offerIsSpecial");
                  return (
                    <div style={{ display: "flex", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>% Descuento</label>
                        <Form.Item
                          name="offerDiscountPercent"
                          rules={[({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!getFieldValue("offerIsSpecial")) return Promise.resolve();
                              const n = Number(value);
                              if (!Number.isFinite(n) || n <= 0 || n >= 100) return Promise.reject(new Error("1 a 99"));
                              return Promise.resolve();
                            },
                          })]}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber disabled={!on} min={1} max={99} step={1} style={{ width: "100%", ...ghostInput }} placeholder="15" />
                        </Form.Item>
                      </div>
                      <div style={{ flex: 2 }}>
                        <label style={labelStyle}>Descripción</label>
                        <Form.Item name="offerDescription" style={{ marginBottom: 0 }}>
                          <Input disabled={!on} placeholder="Promo enero, Semana santa..." style={ghostInput} />
                        </Form.Item>
                      </div>
                    </div>
                  );
                }}
              </Form.Item>
            </div>

            {/* Extras */}
            <div style={{ marginBottom: 32 }}>
              <span style={{
                fontFamily: "'Manrope', sans-serif",
                fontSize: 10, fontWeight: 700, letterSpacing: "0.16em",
                textTransform: "uppercase", color: DS.secondary,
                display: "block", marginBottom: 16,
              }}>Detalles Adicionales</span>

              <label style={labelStyle}>Insignia (badge)</label>
              <Form.Item name="badge" style={{ marginBottom: 16 }}>
                <Input placeholder="Vista al mar, Mejor precio..." style={ghostInput} />
              </Form.Item>

              <label style={labelStyle}>Destacada</label>
              <Form.Item name="featured" style={{ marginBottom: 16 }}>
                <Select placeholder="¿Destacada?" style={{ width: "100%" }} variant="borderless">
                  <Option value={true}>Sí</Option>
                  <Option value={false}>No</Option>
                </Select>
              </Form.Item>

              <label style={labelStyle}>Amenidades</label>
              <Form.Item name="amenities" style={{ marginBottom: 0 }}>
                <Select mode="tags" style={{ width: "100%" }} placeholder="WiFi, Aire acondicionado, TV..." variant="borderless" />
              </Form.Item>
            </div>
          </Form>
        </div>

        {/* ── Sticky footer ── */}
        <div style={{
          position: "sticky",
          bottom: 0,
          zIndex: 20,
          padding: "16px 28px",
          background: "rgba(255,255,255,0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(208,194,208,0.10)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: "10px 24px", background: "transparent",
              color: "rgba(23,28,33,0.5)",
              border: "1px solid rgba(208,194,208,0.25)",
              borderRadius: 999, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "'Manrope', sans-serif",
            }}
          >Cancelar</button>
          <button
            onClick={onOk} disabled={saving}
            style={{
              padding: "10px 32px",
              background: `linear-gradient(135deg, ${DS.surfaceTint}, ${DS.primaryContainer})`,
              color: "#fff", border: "none", borderRadius: 999,
              fontSize: 13, fontWeight: 700, letterSpacing: "0.06em",
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: "'Manrope', sans-serif",
              boxShadow: `0 12px 24px ${DS.surfaceTint}30`,
              opacity: saving ? 0.6 : 1,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <SaveOutlined />
            {editando ? "Guardar Cambios" : "Crear Habitación"}
          </button>
        </div>
      </SlidePanel>

      {/* Image preview as a simple overlay */}
      {previewOpen && (
        <div
          onClick={() => setPreviewOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 950,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <img
            alt="preview"
            src={previewSrc}
            style={{ maxWidth: "90%", maxHeight: "85vh", borderRadius: 12, objectFit: "contain" }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default HabitacionFormDrawer;
