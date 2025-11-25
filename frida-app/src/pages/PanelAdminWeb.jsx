// src/pages/PanelAdminWeb.jsx
import React, { useState, useEffect } from "react";
import { Layout, Card, Tabs, Alert, Space, Typography, Grid } from "antd";
import {
  CheckCircleTwoTone,
  HomeOutlined,
  CalendarOutlined,
  GiftOutlined,
  UserOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import { beachColors, neutrals } from "../theme/beachTheme";
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

const PanelAdminWeb = ({ currentUser }) => {
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

  const tabItems = [
    {
      key: "dashboard",
      label: (
        <Space size={6}>
          <HomeOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Dashboard</span>
        </Space>
      ),
    },
    {
      key: "habitaciones",
      label: (
        <Space size={6}>
          <CalendarOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Calendario</span>
        </Space>
      ),
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
    },
    //{
    //  key: "promociones",
    //  label: (
    //    <Space size={6}>
    //      <GiftOutlined />
    //      <span style={{ fontSize: isMobile ? 11 : 13 }}>Promociones</span>
    //    </Space>
    //  ),
    //},
    {
      key: "usuarios",
      label: (
        <Space size={6}>
          <UserOutlined />
          <span style={{ fontSize: isMobile ? 11 : 13 }}>Usuarios</span>
        </Space>
      ),
    },
  ];

  const renderActiveView = () => {
    switch (activeTab) {
      case "habitaciones":
        // Calendario / reservas / estancias
        return (
          <HabitacionesView isMobile={isMobile} currentUser={currentUser} />
        );

      case "gestionHabitaciones":
        // CRUD de inventario físico
        return (
          <GestionHabitacionesView
            isMobile={isMobile}
            currentUser={currentUser}
          />
        );
      //case "promociones":
      //  return (
      //    <PromocionesView isMobile={isMobile} isTablet={isTablet} currentUser={currentUser}  />
      //  );
      case "usuarios":
        return <UsuariosView isMobile={isMobile} currentUser={currentUser} />;

      case "dashboard":
      default:
        return <DashboardView isMobile={isMobile} currentUser={currentUser} />;
    }
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        background: neutrals.bg,
      }}
    >
      <AdminHeader isMobile={isMobile} currentUser={currentUser} />

      <Content
        style={{
          padding: isMobile ? "12px 10px 20px" : "18px 40px 32px",
        }}
      >


        {/* Tabs contenedor */}
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
            items={tabItems}
            tabBarGutter={isMobile ? 8 : 26}
            size={isMobile ? "small" : "middle"}
            tabBarStyle={{ marginBottom: 0 }}
            moreIcon={null}
          />
        </Card>

        {/* Vista activa con transición suave */}
        <div key={activeTab} className="view-transition-wrapper">
          {renderActiveView()}
        </div>
      </Content>
    </Layout>
  );
};

export default PanelAdminWeb;
