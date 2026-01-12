// src/components/habitaciones/HabitacionFormModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import axios from "@api/axios";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Card,
  Space,
  Switch,
  Typography,
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
} from "@ant-design/icons";
import {
  CAPACITY_OPTIONS,
  tiposHabitacion,
  INVENTORY_STATES,
  neutralsTheme as neutrals,
} from "./helpers";

const { Text, Title } = Typography;
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

const HabitacionFormModal = ({
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
  const [previewTitle, setPreviewTitle] = useState("");

  const [messageApi, contextHolder] = message.useMessage();

  // control de Popconfirm por UID (para el remove)
  const [confirmOpen, setConfirmOpen] = useState({}); // { [uid]: true/false }
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

  // al abrir modal: hidrata el upload list desde form
  useEffect(() => {
    if (!visible) return;

    const arr = imagesFromForm;
    const list = arr.slice(0, MAX_IMAGES).map((u, i) => toUrlFile(u, i));
    setFileList(list);

    form?.setFieldsValue?.({
      images: arr.slice(0, MAX_IMAGES),
      img: arr[0] || "",
      deletedImages: [], // ✅ se llena cuando el usuario confirma “borrar del server”
    });

    setConfirmOpen({}); // limpia popconfirms
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const syncFormImages = (nextFileList) => {
    const urls = (nextFileList || [])
      .map((f) => cleanUrl(f?.url || f?.response?.url))
      .filter(Boolean)
      .slice(0, MAX_IMAGES);

    form?.setFieldsValue?.({
      images: urls,
      img: urls[0] || "",
    });
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
      messageApi.open({
        type: "warning",
        content: "Esta imagen se eliminará del servidor al guardar.",
        duration: 2,
      });
    }

    removeByUid(uid);
    setConfirmFor(uid, false);
  };

  const setAsCover = (uid) => {
    setFileList((prev) => {
      const idx = prev.findIndex((f) => f.uid === uid);
      if (idx <= 0) {
        syncFormImages(prev);
        return prev;
      }
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
          const percent = Math.round((evt.loaded / total) * 100);
          onProgress?.({ percent });
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

    if (url) {
      setPreviewSrc(url);
      setPreviewOpen(true);
      setPreviewTitle(file?.name || "Imagen");
      return;
    }

    if (file?.originFileObj) {
      const base64 = await fileToBase64(file.originFileObj);
      setPreviewSrc(base64);
      setPreviewOpen(true);
      setPreviewTitle(file?.name || "Imagen");
    }
  };

  const coverUid = fileList?.[0]?.uid;

  return (
    <>
      {contextHolder}

      <Modal
        open={visible}
        onCancel={onCancel}
        onOk={onOk}
        okText={editando ? "Guardar cambios" : "Crear habitación"}
        cancelText="Cancelar"
        centered
        width={isMobile ? 360 : 560}
        bodyStyle={{ paddingTop: 12 }}
        confirmLoading={saving}
      >
        <Space direction="vertical" size={4} style={{ width: "100%", marginBottom: 4 }}>
          <Title level={5} style={{ margin: 0, color: neutrals.textMain, fontWeight: 600 }}>
            {editando ? "Editar habitación" : "Nueva habitación"}
          </Title>
          <Text style={{ fontSize: 11, color: neutrals.textMuted }}>
            La primera imagen será la miniatura en la tabla. Puedes subir archivos o pegar links.
          </Text>
        </Space>

        <Form form={form} layout="vertical" size="small">
          <Form.Item name="images" hidden>
            <Input />
          </Form.Item>

          <Form.Item name="deletedImages" hidden>
            <Input />
          </Form.Item>

          <Form.Item
            label="Código / Identificador"
            name="codigo"
            rules={[{ required: true, message: "Ingresa el código (ej. CF-103)" }]}
          >
            <Input placeholder="Ej. CF-103" />
          </Form.Item>

          <Form.Item
            label="Número físico / puerta"
            name="roomNumber"
            rules={[{ required: true, message: "Ingresa el número físico" }]}
          >
            <Input placeholder="Ej. 103" />
          </Form.Item>

          <Form.Item
            label="Nombre interno / público"
            name="title"
            rules={[{ required: true, message: "Ingresa el nombre" }]}
          >
            <Input placeholder="Ej. Suite Patio Privado" />
          </Form.Item>

          <Form.Item label="Ubicación" name="location">
            <Input placeholder="Ej. Chuburná, frente al mar..." />
          </Form.Item>

          {/* ✅ Imágenes */}
          <Card
            size="small"
            style={{ borderRadius: 12, background: "#f9fafb", marginBottom: 10 }}
            title={
              <Space size={8}>
                <PictureOutlined />
                <Text style={{ fontWeight: 700 }}>Imágenes</Text>
              </Space>
            }
          >
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Upload
                accept="image/*"
                listType="picture-card"
                multiple
                maxCount={MAX_IMAGES}
                fileList={fileList}
                customRequest={customRequest}
                onChange={handleChange}
                onPreview={handlePreview}
                // 👇 importantísimo: ocultamos el remove default (porque ese no permite Popconfirm con 2 opciones)
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: false,
                  showDownloadIcon: false,
                }}
                // 👇 evitar que el upload intente remover por su cuenta
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

                      {/* ⭐ estrella en la mera punta */}
                      {canSetCover && (
                        <Tooltip title={isCover ? "Miniatura" : "Marcar como miniatura"}>
                          <Button
                            aria-label={isCover ? "Miniatura" : "Marcar como miniatura"}
                            size="small"
                            type="text"
                            shape="circle"
                            icon={<StarFilled />}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setAsCover(file.uid);
                            }}
                            style={{
                              position: "absolute",
                              top: 0,
                              right: 0,
                              zIndex: 60,
                              width: STAR_BTN_SIZE,
                              height: STAR_BTN_SIZE,
                              minWidth: STAR_BTN_SIZE,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "auto",
                              background: "rgba(255,255,255,0.96)",
                              border: "1px solid rgba(15,23,42,0.12)",
                              boxShadow: "0 6px 14px rgba(15,23,42,0.14)",
                              color: isCover ? "#faad14" : "#9ca3af",
                            }}
                          />
                        </Tooltip>
                      )}

                      {/* 🗑️ Popconfirm (sin Modal.confirm) */}
                      {uid && (
                        <Popconfirm
                          open={!!confirmOpen[uid]}
                          onOpenChange={(open) => setConfirmFor(uid, open)}
                          placement="bottomRight"
                          title={
                            <div style={{ maxWidth: 260 }}>
                              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                                Quitar imagen
                              </div>
                              <div style={{ fontSize: 12, color: "#374151", marginBottom: 8 }}>
                                ¿Qué deseas hacer?
                              </div>
                              <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 10 }}>
                                {isLocal
                                  ? "Si eliges “Eliminar del servidor”, se borrará permanentemente al guardar."
                                  : "Esta imagen no es de tus uploads locales. Solo se quitará del formulario."}
                              </div>

                              <Space wrap>
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeWithPolicy(file, { deleteFromServer: false });
                                  }}
                                >
                                  Solo quitar
                                </Button>

                                <Button
                                  size="small"
                                  danger
                                  type="primary"
                                  disabled={!isLocal}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    removeWithPolicy(file, { deleteFromServer: true });
                                  }}
                                >
                                  Eliminar del servidor
                                </Button>

                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmFor(uid, false);
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </Space>
                            </div>
                          }
                          // ocultamos los botones default del Popconfirm
                          okButtonProps={{ style: { display: "none" } }}
                          cancelButtonProps={{ style: { display: "none" } }}
                        >
                          <Tooltip title="Quitar / Eliminar">
                            <Button
                              size="small"
                              type="text"
                              shape="circle"
                              icon={<DeleteOutlined />}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setConfirmFor(uid, true);
                              }}
                              style={{
                                position: "absolute",
                                top: STAR_BTN_SIZE + 2,
                                right: 0,
                                zIndex: 55,
                                width: STAR_BTN_SIZE,
                                height: STAR_BTN_SIZE,
                                minWidth: STAR_BTN_SIZE,
                                padding: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                pointerEvents: "auto",
                                background: "rgba(255,255,255,0.96)",
                                border: "1px solid rgba(15,23,42,0.12)",
                                boxShadow: "0 6px 14px rgba(15,23,42,0.12)",
                                color: "#ef4444",
                              }}
                            />
                          </Tooltip>
                        </Popconfirm>
                      )}

                      {isCover && (
                        <div style={{ position: "absolute", left: 6, bottom: 6, zIndex: 20 }}>
                          <Tag
                            icon={<StarFilled />}
                            color="gold"
                            style={{ borderRadius: 999, fontSize: 10, margin: 0 }}
                          >
                            Miniatura
                          </Tag>
                        </div>
                      )}
                    </div>
                  );
                }}
              >
                {fileList.length >= MAX_IMAGES ? null : (
                  <div>
                    <UploadOutlined />
                    <div style={{ marginTop: 6, fontSize: 11 }}>Subir</div>
                  </div>
                )}
              </Upload>

              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  value={urlDraft}
                  onChange={(e) => setUrlDraft(e.target.value)}
                  placeholder="Pega un link (URL) de imagen..."
                  onPressEnter={handleAddUrl}
                />
                <Button icon={<LinkOutlined />} onClick={handleAddUrl}>
                  Agregar
                </Button>
              </div>

              <Text style={{ fontSize: 11, color: "#6b7280" }}>
                Tip: ⭐ marca la miniatura. 🗑️ te deja “solo quitar” o “eliminar del servidor”.
              </Text>
            </Space>
          </Card>

          <Form.Item label="Miniatura (auto)" name="img">
            <Input disabled placeholder="Se define con la primera imagen" />
          </Form.Item>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                label="Sede"
                name="hotelCode"
                rules={[{ required: true, message: "Selecciona la sede" }]}
              >
                <Select placeholder="Selecciona">
                  {opcionesSede.map((s) => (
                    <Option key={s.value} value={s.value} disabled={s.disabled}>
                      {s.label}
                      {s.disabled && " (inactiva)"}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div style={{ flex: 1 }}>
              <Form.Item label="Tipo de habitación" name="roomType">
                <Select placeholder="Tipo de habitación">
                  {tiposHabitacion.map((t) => (
                    <Option key={t} value={t}>
                      {t}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <Form.Item
                label="Capacidad"
                name="size"
                rules={[{ required: true, message: "Selecciona la capacidad" }]}
              >
                <Select placeholder="Capacidad">
                  {CAPACITY_OPTIONS.map((opt) => (
                    <Option key={opt.value} value={opt.value}>
                      {opt.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </div>

            <div style={{ flex: 1 }}>
              <Form.Item
                label="Tarifa base por noche"
                name="price"
                rules={[{ required: true, message: "Ingresa la tarifa base" }]}
              >
                <InputNumber min={0} step={50} style={{ width: "100%" }} prefix="$" />
              </Form.Item>
            </div>
          </div>

          {/* ✅ DESCUENTOS (restaurado) */}
          <Card
            size="small"
            style={{ borderRadius: 12, background: "#fff", marginBottom: 10 }}
            title={<Text style={{ fontWeight: 700 }}>Descuentos / Promoción</Text>}
          >
            <Form.Item
              label="¿Tiene descuento especial?"
              name="offerIsSpecial"
              valuePropName="checked"
            >
              <Switch
                checkedChildren="Sí"
                unCheckedChildren="No"
                onChange={(checked) => {
                  if (!checked) {
                    form?.setFieldsValue?.({
                      offerDiscountPercent: null,
                      offerDescription: "",
                    });
                  }
                }}
              />
            </Form.Item>

            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const on = !!getFieldValue("offerIsSpecial");
                return (
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <Form.Item
                        label="% Descuento"
                        name="offerDiscountPercent"
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              if (!getFieldValue("offerIsSpecial")) return Promise.resolve();
                              const n = Number(value);
                              if (!Number.isFinite(n) || n <= 0 || n >= 100) {
                                return Promise.reject(
                                  new Error("Ingresa un descuento válido (1 a 99).")
                                );
                              }
                              return Promise.resolve();
                            },
                          }),
                        ]}
                      >
                        <InputNumber
                          disabled={!on}
                          min={1}
                          max={99}
                          step={1}
                          style={{ width: "100%" }}
                          placeholder="Ej. 15"
                        />
                      </Form.Item>
                    </div>

                    <div style={{ flex: 2 }}>
                      <Form.Item label="Descripción" name="offerDescription">
                        <Input
                          disabled={!on}
                          placeholder="Ej. Promo enero / Semana santa..."
                        />
                      </Form.Item>
                    </div>
                  </div>
                );
              }}
            </Form.Item>

            <Text style={{ fontSize: 11, color: "#6b7280" }}>
              Nota: el backend valida que el descuento sea entre 1 y 99.
            </Text>
          </Card>

          <Form.Item
            label="Estado del inventario"
            name="inventoryStatus"
            rules={[{ required: true, message: "Selecciona el estado" }]}
          >
            <Select placeholder="Selecciona el estado">
              {INVENTORY_STATES.map((e) => (
                <Option key={e} value={e}>
                  {e}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item label="Insignia (badge)" name="badge">
            <Input placeholder="Ej. Vista al mar, Mejor precio..." />
          </Form.Item>

          <Form.Item label="Destacada" name="featured">
            <Select placeholder="¿Destacada?">
              <Option value={true}>Sí</Option>
              <Option value={false}>No</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Amenidades" name="amenities">
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="WiFi, Aire acondicionado, TV..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt="preview" style={{ width: "100%", borderRadius: 12 }} src={previewSrc} />
      </Modal>
    </>
  );
};

export default HabitacionFormModal;
