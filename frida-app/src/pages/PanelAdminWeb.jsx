// src/pages/PanelAdminWeb.jsx
import React, { useState, useEffect } from "react";
import { Layout, Card, Tabs, Space, Typography, Grid } from "antd";
import {
  HomeOutlined,
  CalendarOutlined,
  UserOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { neutrals } from "../theme/beachTheme";
import AdminHeader from "../layout/AdminHeader";
import DashboardView from "../views/DashboardView";
import HabitacionesView from "../views/HabitacionesReservaView";
import PromocionesView from "../views/PromocionesView";
import UsuariosView from "../views/UsuariosView";
import GestionHabitacionesView from "../views/GestionHabitacionesView";
import "./PanelAdminWeb.css";

const { Content } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const TAB_STORAGE_KEY = "panelAdminActiveTab";

const VALID_TABS = [
  "dashboard",
  "habitaciones",
  "gestionHabitaciones",
  "promociones",
  "usuarios",
];

// Lee la pestaña inicial desde localStorage
const getInitialTab = () => {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  }
  return "dashboard";
};

const PanelAdminWeb = ({ currentUser, onCurrentUserUpdated }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  const [activeTab, setActiveTab] = useState(getInitialTab);

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, key);
    }
  };

  // Relee pestaña almacenada si cambia externamente
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (saved && VALID_TABS.includes(saved) && saved !== activeTab) {
        setActiveTab(saved);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ==========================
     PERMISOS DEL USUARIO
     ========================== */

  const role = currentUser?.role;
  const isAdmin = role === "administrador";

  // Normalizamos permissions: puede venir como array o como string CSV
  const rawPerms = currentUser?.permissions;
  const permissions = Array.isArray(rawPerms)
    ? rawPerms
    : typeof rawPerms === "string"
    ? rawPerms
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  // 🔥 Reglas de visibilidad:
  // - Dashboard y Usuarios SOLO admin (como habíamos definido).
  // - Habitaciones / Gestión según permisos, con admin como fallback.
  const canViewDashboard = isAdmin;
  const canViewUsuarios = isAdmin;

  const canViewHabitaciones =
    permissions.includes("view_rooms") ||
    permissions.includes("view_reservations") ||
    isAdmin;

  // 👉 Staff tiene `view_rooms`, admin y quien tenga `manage_rooms`
  // también; dentro de la vista tú decides si puede editar o solo ver.
  const canViewGestionHabitaciones =
    permissions.includes("view_rooms") ||
    permissions.includes("manage_rooms") ||
    isAdmin;

  const canViewPromociones =
    permissions.includes("view_hero_slides") || isAdmin;

  /* ==========================
     TABS FILTRADAS POR PERMISO
     ========================== */

  const baseTabItems = [
    {
      key: "dashboard",
      label: (
        <Space size={6}>
          <HomeOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Dashboard</span>
        </Space>
      ),
      allowed: canViewDashboard,
    },
    {
      key: "habitaciones",
      label: (
        <Space size={6}>
          <CalendarOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Calendario</span>
        </Space>
      ),
      allowed: canViewHabitaciones,
    },
    {
      key: "gestionHabitaciones",
      label: (
        <Space size={6}>
          <AppstoreOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>
            Config. habitaciones
          </span>
        </Space>
      ),
      allowed: canViewGestionHabitaciones,
    },
    // {
    //   key: "promociones",
    //   label: (
    //     <Space size={6}>
    //       <GiftOutlined />
    //       <span style={{ fontSize: isMobile ? 11 : 13 }}>Promociones</span>
    //     </Space>
    //   ),
    //   allowed: canViewPromociones,
    // },
    {
      key: "usuarios",
      label: (
        <Space size={6}>
          <UserOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Usuarios</span>
        </Space>
      ),
      allowed: canViewUsuarios,
    },
  ];

  const availableTabItems = baseTabItems
    .filter((t) => t.allowed)
    .map(({ allowed, ...rest }) => rest);

  // Si la pestaña activa no está permitida -> saltar a la primera permitida
  useEffect(() => {
    if (!availableTabItems.length) return;

    const exists = availableTabItems.some((t) => t.key === activeTab);
    if (!exists) {
      const fallbackKey = availableTabItems[0].key;
      setActiveTab(fallbackKey);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TAB_STORAGE_KEY, fallbackKey);
      }
    }
  }, [activeTab, availableTabItems]);

  const canSeeTab = (key) => {
    switch (key) {
      case "dashboard":
        return canViewDashboard;
      case "habitaciones":
        return canViewHabitaciones;
      case "gestionHabitaciones":
        return canViewGestionHabitaciones;
      case "usuarios":
        return canViewUsuarios;
      case "promociones":
        return canViewPromociones;
      default:
        return false;
    }
  };

  const renderActiveView = () => {
    if (!canSeeTab(activeTab)) {
      return (
        <Card
          bordered={false}
          style={{
            borderRadius: 16,
            boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
            background: "#ffffff",
          }}
        >
          <Text style={{ fontSize: 13, color: neutrals.textMuted }}>
            No tienes permisos para ver esta sección del panel.
          </Text>
        </Card>
      );
    }

    switch (activeTab) {
      case "habitaciones":
        return (
          <HabitacionesView isMobile={isMobile} currentUser={currentUser} />
        );

      case "gestionHabitaciones":
        return (
          <GestionHabitacionesView
            isMobile={isMobile}
            currentUser={currentUser}
          />
        );

      // case "promociones":
      //   return (
      //     <PromocionesView
      //       isMobile={isMobile}
      //       isTablet={isTablet}
      //       currentUser={currentUser}
      //     />
      //   );

      case "usuarios":
        return <UsuariosView isMobile={isMobile} currentUser={currentUser} />;

      case "dashboard":
      default:
        return <DashboardView isMobile={isMobile} currentUser={currentUser} />;
    }
  };

  const noTabsAvailable = availableTabItems.length === 0;

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: neutrals.bg,
      }}
    >
      <AdminHeader
        isMobile={isMobile}
        currentUser={currentUser}
        onCurrentUserUpdated={onCurrentUserUpdated}
      />

      <Content
        style={{
          padding: isMobile ? "12px 10px 20px" : "18px 40px 32px",
        }}
      >
        {noTabsAvailable ? (
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              boxShadow: "0 4px 12px rgba(148,163,253,0.10)",
              background: "#ffffff",
            }}
          >
            <Text style={{ fontSize: 13, color: neutrals.textMuted }}>
              Tu usuario no tiene permisos para ver secciones del panel de
              administración. Contacta a un administrador para revisar tus
              permisos.
            </Text>
          </Card>
        ) : (
          <>
            <Card
              bordered={false}
              style={{
                borderRadius: 16,
                marginBottom: 16,
                boxShadow: "0 4px 12px rgba(148,163,253,0.10)",
                background: "#ffffff",
              }}
              bodyStyle={{ padding: "4px 8px 0" }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                items={availableTabItems}
                tabBarGutter={isMobile ? 8 : 26}
                size={isMobile ? "small" : "middle"}
                tabBarStyle={{ marginBottom: 0 }}
                moreIcon={null}
              />
            </Card>

            <div key={activeTab} className="view-transition-wrapper">
              {renderActiveView()}
            </div>
          </>
        )}
      </Content>
    </Layout>
  );
};

export default PanelAdminWeb;
