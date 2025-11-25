// src/components/website/ChatSoporte.jsx
import React, { useState } from "react";
import {
  Drawer,
  Flex,
  Button,
  Input,
  Typography,
  Space,
  Popconfirm,
} from "antd";
import {
  CustomerServiceOutlined,
  SendOutlined,
  UserOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { beachColors } from "../../theme/beachTheme";

dayjs.locale("es");

const { Text } = Typography;

// Mensaje de bienvenida por defecto
const getInitialMessages = () => [
  {
    from: "agent",
    text: "Hola 👋, somos el equipo de reservas. ¿En qué podemos ayudarte?",
    time: dayjs().format("HH:mm"),
  },
];

const ChatSoporte = ({
  open,
  onClose,
  isMobile,
  habitacionSeleccionada, // habitación en contexto (puede ser null)
  onFinalizarReserva, // callback para liberar habitación + reset estado
}) => {
  const [messages, setMessages] = useState(getInitialMessages);
  const [value, setValue] = useState("");

  const resetChat = () => {
    setMessages(getInitialMessages());
    setValue("");
  };

  const handleSend = () => {
    const text = value.trim();
    if (!text) return;

    const now = dayjs().format("HH:mm");

    // Mensaje del usuario
    setMessages((prev) => [...prev, { from: "user", text, time: now }]);
    setValue("");

    // Respuesta automática simulada
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          from: "agent",
          text:
            "Hemos recibido tu mensaje ✅. Un miembro del equipo te responderá en breve.",
          time: dayjs().format("HH:mm"),
        },
      ]);
    }, 600);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Cierre simple (por máscara / gesto / X sin habitación en contexto)
  const handleDrawerClose = () => {
    if (onClose) onClose();
  };

  // Confirmar cierre cuando hay habitación en espera
  const handleCerrarConfirmado = async () => {
    // Liberar habitación + lógica de App
    if (onFinalizarReserva) {
      await onFinalizarReserva();
    }
    // Reset chat local
    resetChat();
  };

  const tituloHabitacion =
    habitacionSeleccionada &&
    `${habitacionSeleccionada.codigo || ""} · ${
      habitacionSeleccionada.title || ""
    }`;

  return (
    <Drawer
      open={open}
      onClose={handleDrawerClose}
      placement={isMobile ? "bottom" : "right"}
      height={isMobile ? "70%" : undefined}
      width={isMobile ? "100%" : 360}
      closeIcon={null} // usamos nuestra propia X personalizada
      destroyOnClose={false} // conservar mensajes
      maskClosable={true} // tocar fuera solo cierra visualmente
      title={
        <Flex align="center" justify="space-between">
          {/* Lado izquierdo: info del chat */}
          <Flex align="center" gap={8}>
            <CustomerServiceOutlined
              style={{ color: beachColors.teal, fontSize: 18 }}
            />
            <div>
              <Text strong style={{ fontSize: 13, display: "block" }}>
                Chat con el equipo
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: "#6b7280",
                }}
              >
                Resolvemos dudas sobre reservas, disponibilidad y estancias.
              </Text>

              {/* Subtítulo con habitación en contexto */}
              {tituloHabitacion && (
                <Text
                  style={{
                    fontSize: 10,
                    color: "#0f766e",
                    display: "block",
                    marginTop: 2,
                  }}
                >
                  Hablando sobre: {tituloHabitacion}
                </Text>
              )}
            </div>
          </Flex>

          {/* Lado derecho: botón X con Popconfirm si hay habitación */}
          {habitacionSeleccionada ? (
            <Popconfirm
              title="Cerrar chat y liberar habitación"
              description="Si cierras el chat, la habitación volverá a estar disponible y se borrará esta conversación. ¿Seguro que quieres salir?"
              okText="Sí, cerrar"
              cancelText="Seguir en el chat"
              onConfirm={handleCerrarConfirmado}
            >
              <Button
                shape="circle"
                size="small"
                type="text"
                icon={<CloseOutlined />}
                style={{
                  color: "#6b7280",
                }}
              />
            </Popconfirm>
          ) : (
            <Button
              shape="circle"
              size="small"
              type="text"
              icon={<CloseOutlined />}
              onClick={handleDrawerClose}
              style={{
                color: "#6b7280",
              }}
            />
          )}
        </Flex>
      }
      styles={{
        header: {
          padding: 12,
          borderBottom: "1px solid #e5e7eb",
          background: "#ffffff",
        },
        body: {
          display: "flex",
          flexDirection: "column",
          padding: 10,
          background: "#f9fafb",
        },
      }}
    >
      <Flex vertical style={{ height: "100%", gap: 8 }}>
        {/* Mensajes */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {messages.map((msg, i) => {
            const isUser = msg.from === "user";
            return (
              <Flex
                key={`${msg.time}-${i}`}
                justify={isUser ? "flex-end" : "flex-start"}
                style={{ marginBottom: 6 }}
              >
                <div
                  style={{
                    maxWidth: "82%",
                    padding: "8px 10px",
                    borderRadius: 14,
                    fontSize: 11,
                    background: isUser
                      ? `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`
                      : "#ffffff",
                    color: isUser ? "#ffffff" : "#111827",
                    boxShadow: isUser
                      ? "0 4px 10px rgba(14,165,233,0.35)"
                      : "0 2px 6px rgba(148,163,253,0.16)",
                    border: isUser ? "none" : "1px solid #e5e7eb",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      lineHeight: 1.4,
                      display: "block",
                    }}
                  >
                    {msg.text}
                  </Text>
                  <div
                    style={{
                      textAlign: "right",
                      marginTop: 2,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 8.5,
                        opacity: 0.7,
                        color: isUser ? "#eff6ff" : "#9ca3af",
                      }}
                    >
                      {msg.time}
                    </Text>
                  </div>
                </div>
              </Flex>
            );
          })}
        </div>

        {/* Acciones rápidas */}
        <Space size={6} wrap>
          {[
            "Quiero información de disponibilidad",
            "Necesito ayuda con una reserva existente",
            "¿Tienen opciones para grupos o eventos?",
          ].map((label, idx) => (
            <Button
              key={idx}
              size="small"
              onClick={() => setValue(label)}
              style={{
                borderRadius: 999,
                fontSize: 9,
                borderColor: "#e5e7eb",
                background: "#ffffff",
              }}
            >
              {label}
            </Button>
          ))}
        </Space>

        {/* Input */}
        <Flex gap={6} align="center">
          <Input.TextArea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="Escribe tu mensaje..."
            style={{
              borderRadius: 10,
              fontSize: 11,
              borderColor: "#e5e7eb",
              background: "#ffffff",
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            style={{
              borderRadius: 12,
              minWidth: 40,
              background: `linear-gradient(135deg, ${beachColors.oceanBlue}, ${beachColors.teal})`,
              border: "none",
            }}
          />
        </Flex>

        {/* Pie */}
        <Flex justify="flex-start" align="center" style={{ marginTop: 2 }}>
          <Flex gap={4} align="center">
            <UserOutlined
              style={{
                fontSize: 10,
                color: "#9ca3af",
              }}
            />
            <Text
              style={{
                fontSize: 9,
                color: "#9ca3af",
              }}
            >
              Operador disponible · Respuesta rápida
            </Text>
          </Flex>
        </Flex>
      </Flex>
    </Drawer>
  );
};

export default ChatSoporte;
