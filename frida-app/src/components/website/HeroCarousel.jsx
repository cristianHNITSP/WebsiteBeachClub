// src/components/website/HeroCarousel.jsx
import { useState, useEffect } from "react";
import axios from "@api/axios";
import {
  Carousel,
  Card,
  Flex,
  Tag,
  Typography,
  Skeleton,
  Tooltip,
  message,
  Input,
  Popconfirm,
  Button,
  Grid,
} from "antd";
import {
  StarFilled,
  EditOutlined,
  PictureOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { beachColors } from "../../theme/beachTheme";

const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

const getId = (obj) => obj?._id || obj?.id || null;
const isBadId = (id) => !id || id === "undefined";

const HeroCarousel = ({ currentUser }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState([]);
  const [editingImageId, setEditingImageId] = useState(null);
  const [tempImgUrl, setTempImgUrl] = useState("");

  const isAdmin =
    currentUser &&
    (currentUser.role === "administrador" ||
      currentUser.permissions?.includes("manage_rooms"));

  useEffect(() => {
    let isMounted = true;

    const fetchSlides = async () => {
      try {
        setLoading(true);

        const { data } = await axios.get("/api/hero-slides/public");

        if (!isMounted) return;

        const raw = Array.isArray(data) ? data : (data?.items || []);
        const normalized = raw
          .map((s) => ({ ...s, _id: getId(s) }))
          .filter((s) => !isBadId(s._id));

        const sorted = [...normalized].sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );

        setSlides(sorted);
      } catch (err) {
        console.error("Error cargando hero-slides:", err);
        setSlides([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSlides();
    return () => {
      isMounted = false;
    };
  }, []);

  const carouselSlide = (slide) => ({
    height: isMobile ? "280px" : "360px",
    width: "100%",
    display: "flex",
    alignItems: "flex-end",
    padding: isMobile ? 16 : 24,
    color: "#ffffff",
    backgroundImage: `linear-gradient(to top, rgba(15,23,42,0.82), rgba(15,23,42,0.08)), url(${slide.img})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 14px 40px rgba(15,23,42,0.35)",
    position: "relative",
    overflow: "hidden",
  });

  const handleFieldChange = async (slideId, field, value) => {
    if (isBadId(slideId)) {
      message.error("No se pudo guardar: ID inválido.");
      return;
    }

    const previous = slides;

    // optimista
    setSlides((prev) =>
      prev.map((s) => (s._id === slideId ? { ...s, [field]: value } : s))
    );

    try {
      await axios.put(`/api/hero-slides/${slideId}`, { [field]: value });
      message.success("Hero actualizado");
    } catch (err) {
      console.error("Error actualizando hero-slide:", err);
      message.error("No se pudo guardar el cambio");
      setSlides(previous);
    }
  };

  const startEditImage = (slide) => {
    const id = getId(slide);
    if (isBadId(id)) {
      message.error("Slide inválido (sin ID).");
      return;
    }
    setEditingImageId(id);
    setTempImgUrl(slide.img || "");
  };

  const saveImageUrl = async (slideId) => {
    const url = (tempImgUrl || "").trim();
    if (!url) {
      message.warning("La URL de la imagen no puede estar vacía.");
      return;
    }
    await handleFieldChange(slideId, "img", url);
    setEditingImageId(null);
  };

  const handleAddSlide = async () => {
    const nextOrder =
      slides.length > 0
        ? Math.max(...slides.map((s) => s.order || 0)) + 1
        : 1;

    const payload = {
      title: "Nuevo slide hero",
      subtitle: "Personaliza este mensaje para tu campaña.",
      img:
        slides[0]?.img ||
        "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg",
      badgeText: "Nuevo",
      order: nextOrder,
      isActive: true,
    };

    try {
      const { data } = await axios.post("/api/hero-slides", payload);

      // soporta respuesta {..slide} o {slide: ..}
      const slide = data?.slide ? data.slide : data;
      const id = getId(slide);

      if (isBadId(id)) {
        message.error("El backend creó un slide sin ID válido. Revisa respuesta del POST.");
        return;
      }

      const normalized = { ...slide, _id: id };

      setSlides((prev) =>
        [...prev, normalized].sort((a, b) => (a.order || 0) - (b.order || 0))
      );

      message.success("Nuevo slide creado");
    } catch (err) {
      console.error("Error creando hero-slide:", err);
      message.error("No se pudo crear el slide");
    }
  };

  const handleDeleteSlide = async (slideId) => {
    if (isBadId(slideId)) {
      message.error("No se pudo eliminar: ID inválido.");
      return;
    }

    const previous = slides;
    setSlides((prev) => prev.filter((s) => s._id !== slideId));

    try {
      await axios.delete(`/api/hero-slides/${slideId}`);
      message.success("Slide eliminado");
    } catch (err) {
      console.error("Error eliminando hero-slide:", err);
      message.error("No se pudo eliminar el slide");
      setSlides(previous);
    }
  };

  if (loading) {
    return (
      <Card
        style={{
          height: 320,
          background: "#e5e7eb",
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <Skeleton active title paragraph={{ rows: 2 }} />
      </Card>
    );
  }

  if (!slides.length) {
    return (
      <div>
        <Card
          style={{
            height: 200,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f1f5f9",
          }}
        >
          <Text type="secondary">
            Aún no hay slides configurados para el hero.
            {isAdmin && " Crea uno nuevo para comenzar."}
          </Text>
        </Card>

        {isAdmin && (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddSlide}
            >
              Añadir primer slide
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && isMobile && (
        <div
          style={{
            marginBottom: 6,
            background: "rgba(15,23,42,0.78)",
            color: "#e5e7eb",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            gap: 6,
            backdropFilter: "blur(6px)",
            maxWidth: "100%",
            flexWrap: "wrap",
          }}
        >
          <EditOutlined style={{ fontSize: 12 }} />
          <span>Modo edición hero (textos / imagen / slides)</span>
        </div>
      )}

      <div style={{ position: "relative" }}>
        {isAdmin && !isMobile && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 14,
              zIndex: 5,
              background: "rgba(15,23,42,0.78)",
              color: "#e5e7eb",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 6,
              backdropFilter: "blur(6px)",
              maxWidth: "calc(100% - 32px)",
              flexWrap: "wrap",
            }}
          >
            <EditOutlined style={{ fontSize: 12 }} />
            <span>Modo edición hero (textos / imagen / slides)</span>
          </div>
        )}

        <Carousel autoplay dots arrows={!isMobile} style={{ width: "100%" }} autoplaySpeed={5500}>
          {slides.map((slide) => (
            <div key={slide._id}>
              <div style={carouselSlide(slide)}>
                {isAdmin && (
                  <div
                    style={{
                      position: "absolute",
                      top: isMobile ? 10 : 12,
                      left: isMobile ? 10 : 16,
                      zIndex: 6,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      maxWidth: isMobile ? "70%" : 320,
                    }}
                  >
                    {editingImageId !== slide._id ? (
                      <>
                        <Tooltip title="Cambiar URL de la imagen">
                          <button
                            type="button"
                            onClick={() => startEditImage(slide)}
                            style={{
                              border: "none",
                              outline: "none",
                              cursor: "pointer",
                              padding: "4px 8px",
                              borderRadius: 999,
                              background: "rgba(15,23,42,0.78)",
                              color: "#e5e7eb",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11,
                              backdropFilter: "blur(6px)",
                              width: "100%",
                              justifyContent: "center",
                            }}
                          >
                            <PictureOutlined style={{ fontSize: 12 }} />
                            <span>Editar imagen</span>
                          </button>
                        </Tooltip>

                        {slides.length > 1 && (
                          <Popconfirm
                            title="Eliminar slide"
                            description="Esta acción no se puede deshacer."
                            onConfirm={() => slide?._id && handleDeleteSlide(slide._id)}
                            okText="Sí, eliminar"
                            cancelText="Cancelar"
                            placement={isMobile ? "top" : "right"}
                            overlayStyle={{ maxWidth: 320, whiteSpace: "normal" }}
                          >
                            <button
                              type="button"
                              style={{
                                border: "none",
                                outline: "none",
                                cursor: "pointer",
                                padding: "4px 8px",
                                borderRadius: 999,
                                background: "rgba(220,38,38,0.85)",
                                color: "#fee2e2",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 11,
                                backdropFilter: "blur(6px)",
                                width: "100%",
                                justifyContent: "center",
                              }}
                            >
                              <DeleteOutlined style={{ fontSize: 12 }} />
                              <span>Eliminar</span>
                            </button>
                          </Popconfirm>
                        )}
                      </>
                    ) : (
                      <div
                        style={{
                          padding: 6,
                          borderRadius: 12,
                          background: "rgba(15,23,42,0.9)",
                          backdropFilter: "blur(6px)",
                          maxWidth: 320,
                        }}
                      >
                        <Text style={{ fontSize: 10, color: "rgba(226,232,240,0.9)" }}>
                          Pega la nueva URL de la imagen y presiona Enter
                        </Text>
                        <Search
                          size="small"
                          value={tempImgUrl}
                          onChange={(e) => setTempImgUrl(e.target.value)}
                          onSearch={() => saveImageUrl(slide._id)}
                          enterButton="Guardar"
                          allowClear
                          style={{ marginTop: 4, fontSize: 11 }}
                        />
                        <Text
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                            color: "rgba(156,163,175,0.95)",
                            cursor: "pointer",
                          }}
                          onClick={() => setEditingImageId(null)}
                        >
                          Cancelar
                        </Text>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ maxWidth: isMobile ? "100%" : 420, wordBreak: "break-word" }}>
                  <Tag
                    color={beachColors.turquoise}
                    style={{
                      borderRadius: 999,
                      fontSize: 10,
                      color: "#065f46",
                      marginBottom: 4,
                      border: "none",
                      paddingInline: 12,
                    }}
                  >
                    {slide.badgeText || "Reservas directas · Mejor atención"}
                  </Tag>

                  <Title
                    level={3}
                    style={{
                      margin: "4px 0 2px",
                      color: "#ffffff",
                      fontWeight: 600,
                      textShadow: "0 2px 10px rgba(15,23,42,0.85)",
                      fontSize: isMobile ? 22 : 28,
                      lineHeight: 1.2,
                    }}
                    editable={
                      isAdmin && {
                        onChange: (value) => handleFieldChange(slide._id, "title", value),
                        tooltip: "Editar título del slide",
                      }
                    }
                  >
                    {slide.title}
                  </Title>

                  <Text
                    style={{
                      display: "block",
                      marginTop: 2,
                      fontSize: isMobile ? 12 : 13,
                      color: "rgba(241,245,249,0.9)",
                      textShadow: "0 1px 6px rgba(15,23,42,0.8)",
                    }}
                    editable={
                      isAdmin && {
                        onChange: (value) => handleFieldChange(slide._id, "subtitle", value),
                        tooltip: "Editar subtítulo",
                      }
                    }
                  >
                    {slide.subtitle}
                  </Text>

                  <Flex gap={8} style={{ marginTop: 8 }}>
                    <StarFilled
                      style={{
                        color: beachColors.sunset,
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: isMobile ? 11 : 12,
                        color: "#e5e7eb",
                        textShadow: "0 1px 6px rgba(15,23,42,0.8)",
                      }}
                    >
                      Opiniones reales, sin intermediarios.
                    </Text>
                  </Flex>

                  {isAdmin && (
                    <Tooltip title="Editar texto de badge">
                      <Text
                        style={{
                          marginTop: 6,
                          display: "inline-block",
                          fontSize: 11,
                          color: "rgba(226,232,240,0.95)",
                          cursor: "pointer",
                          textDecoration: "underline dotted",
                        }}
                        editable={{
                          onChange: (value) => handleFieldChange(slide._id, "badgeText", value),
                        }}
                      >
                        {slide.badgeText || "Reservas directas · Mejor atención"}
                      </Text>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Carousel>

        {isAdmin && (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="small"
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddSlide}
            >
              Añadir slide
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroCarousel;
