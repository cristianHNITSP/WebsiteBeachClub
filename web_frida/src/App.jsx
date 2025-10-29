import React from "react";
import {
  Button, Card, Dropdown, Flex, Input, Space, Splitter, Typography, theme, Carousel,
  Rate, Tag, Avatar, Tree, Select, Badge, DatePicker
} from "antd";
import {
  DownOutlined, SearchOutlined, UserOutlined, EnvironmentOutlined, HeartOutlined,
  FilterOutlined, HomeOutlined, GiftOutlined, CompassOutlined, StarFilled, FireFilled
} from "@ant-design/icons";

import CardsInfoCenter from '../src/components/cards_info_center.jsx';

import dayjs from "dayjs";

const { useToken } = theme;
const { Option } = Select;

function App() {

  const { token } = useToken();

  const beachColors = {
    turquoise: '#2dd4bf', oceanBlue: '#0ea5e9', sand: '#fef3c7',
    coral: '#fb7185', deepBlue: '#1e40af', teal: '#14b8a6', sunset: '#f59e0b'
  };

  const backgroundColor = '#f8fafc', borderColor = '#e2e8f0';

  const headerStyle = {
    padding: "14px 32px",
    background: `linear-gradient(135deg, ${beachColors.deepBlue}, ${beachColors.oceanBlue})`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
    position: "sticky", top: 0, zIndex: 100,
    borderBottom: `3px solid ${beachColors.turquoise}`
  };

  const carouselSlide = (text, img) => ({
    height: "300px", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    backgroundImage: `linear-gradient(135deg, rgba(30,64,175,.4), rgba(20,184,166,.4)), url(${img})`,
    backgroundSize: "cover", backgroundPosition: "center",
    fontSize: "2rem", fontWeight: "bold", textShadow: "0 4px 12px rgba(0,0,0,.6)",
    borderRadius: "16px", margin: "0 8px"
  });

  const menuItems = [{ key: "1", label: "Casa Frida" }, { key: "2", label: "Cabañas Frida" }];

  const panelStyles = {
    left: { background: '#f1f5f9', borderRight: `1px solid ${borderColor}` },
    center: { background: '#fff', padding: 4 },
    right: { background: '#f8fafc', borderLeft: `1px solid ${borderColor}` }
  };

  const treeData = [
    {
      title: <Flex align="center" gap={8}><HomeOutlined style={{ color: beachColors.turquoise }} /><b>Tipo de alojamiento</b></Flex>,
      key: "1", children: ["Habitación", "Suite", "Cabaña", "Villa"].map((t, i) => ({ title: t, key: `1-${i + 1}` }))
    },
    {
      title: <Flex align="center" gap={8}><GiftOutlined style={{ color: beachColors.coral }} /><b>Servicios</b></Flex>,
      key: "2", children: ["WiFi", "Piscina", "Estacionamiento", "Spa", "Pet Friendly"].map((t, i) => ({ title: t, key: `2-${i + 1}` }))
    },
    {
      title: <Flex align="center" gap={8}><CompassOutlined style={{ color: beachColors.sunset }} /><b>Ubicación</b></Flex>,
      key: "3", children: ["Playa", "Centro", "Montaña", "Selva"].map((t, i) => ({ title: t, key: `3-${i + 1}` }))
    }
  ];

  const cardsData = [
    {
      title: "Casa Frida - Suite Premium Vista al Mar", location: "Centro de Tulum", rating: 4.8, price: 2200,
      img: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
      amenities: ["WiFi", "Desayuno", "A/C", "Estacionamiento", "Piscina", "Spa"],
      badge: "MÁS POPULAR", featured: true
    },
    {
      title: "Cabaña Frida - Bosque Encantado", location: "Valle de Bravo", rating: 4.6, price: 1850,
      img: "https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800",
      amenities: ["WiFi", "Cafetera", "Pet Friendly", "Terraza"], badge: "ECO-FRIENDLY"
    },
    {
      title: "Casa Frida - Habitación Deluxe Ocean View", location: "Playa del Carmen", rating: 4.9, price: 2600,
      img: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
      amenities: ["WiFi", "Vista al mar", "Piscina", "Bar", "Desayuno"], badge: "LUJO"
    }
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(135deg, ${backgroundColor}, ${beachColors.sand}20 50%, ${beachColors.turquoise}08)`
    }}>
      {/* HEADER */}
      <header style={headerStyle}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={16} style={{ maxWidth: 1400, margin: "0 auto" }}>
          <Dropdown menu={{ items: menuItems }}>
            <Typography.Title level={3} style={{ color: '#fff', cursor: "pointer", fontWeight: 800, margin: 0 }}>
              Beach Club <DownOutlined style={{ fontSize: 14, color: beachColors.turquoise }} />
            </Typography.Title>
          </Dropdown>

          <Flex align="center" gap={12} style={{
            flex: 1, justifyContent: "center", minWidth: 450, background: 'rgba(255,255,255,0.15)',
            padding: '12px 16px', borderRadius: '16px', backdropFilter: 'blur(10px)'
          }}>
            <Input prefix={<EnvironmentOutlined style={{ color: beachColors.turquoise }} />}
              placeholder="Destino, ciudad o hotel"
              style={{ flex: "1", borderRadius: 12, border: 'none', height: 40, background: 'rgba(255,255,255,0.9)' }} />
            <DatePicker.RangePicker style={{ width: 220, borderRadius: 12, height: 40 }} format="DD/MM/YYYY"
              defaultValue={[dayjs(), dayjs().add(2, 'day')]} />
            <Select defaultValue="2 adultos" style={{ width: 140, borderRadius: 12, height: 40 }}>
              <Option value="1">1 adulto</Option><Option value="2">2 adultos</Option>
              <Option value="3">3 adultos</Option><Option value="4">Familia</Option>
            </Select>
            <Button type="primary" icon={<SearchOutlined />} style={{
              borderRadius: 12, background: beachColors.turquoise, fontWeight: 600,
              boxShadow: '0 4px 12px rgba(45,212,191,0.4)', height: 40
            }}>Buscar</Button>
          </Flex>

          <Flex align="center" gap={12}>
            <Button type="text" style={{ color: '#fff', fontWeight: 500 }}>Iniciar sesión</Button>
            <Avatar size="large" icon={<UserOutlined />} style={{ background: beachColors.turquoise }} />
          </Flex>
        </Flex>
      </header>

      {/* MAIN */}
      <main style={{ flex: 1 }}>
        <Splitter style={{ height: "100%", border: "none" }}>
          {/* PANEL IZQ */}
          <Splitter.Panel defaultSize="20%" style={panelStyles.left}>
            <Flex vertical style={{ padding: 20 }}>
              <Flex align="center" gap={8}><FilterOutlined style={{ color: beachColors.deepBlue }} />
                <Typography.Title level={4} style={{ margin: 0, color: beachColors.deepBlue }}>Filtros</Typography.Title>
              </Flex>
              <Tree checkable defaultExpandAll treeData={treeData} />
              <div style={{ marginTop: 24 }}>
                <Typography.Text strong>Precio por noche</Typography.Text>
                <div style={{ background: beachColors.turquoise, height: 4, borderRadius: 2, margin: '12px 0', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: -6, left: '20%', right: '20%', height: 16, background: beachColors.deepBlue, borderRadius: 8 }} />
                </div>
                <Flex justify="space-between"><span>$800</span><span>$3,200</span></Flex>
              </div>
            </Flex>
          </Splitter.Panel>

          {/* PANEL CENTRAL */}
          <Splitter.Panel defaultSize="55%" style={panelStyles.center}>

            <Carousel arrows autoplay={{ dotDuration: true }} autoplaySpeed={5000}>
              <div><div style={carouselSlide("✨ Escápate al Paraíso en Casa Frida ✨", "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200")} /></div>
              <div><div style={carouselSlide("🌴 Vive la Magia de Cabañas Frida", "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200")} /></div>
              <div><div style={carouselSlide("🌅 Tu Sueño Vacacional Comienza Aquí", "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200")} /></div>
            </Carousel>

            <CardsInfoCenter beachColors={beachColors} cardsData={cardsData} />

          </Splitter.Panel>

          {/* PANEL DER */}
          <Splitter.Panel defaultSize="25%" style={panelStyles.right}>
            <Flex vertical style={{ padding: 20, }}>
              <Typography.Title level={4} style={{ color: beachColors.deepBlue }}>
                <FireFilled style={{ color: beachColors.sunset }} /> Destinos Populares
              </Typography.Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                {[
                  { name: "Tulum", desc: "Playas de ensueño", img: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=300" },
                  { name: "Valle de Bravo", desc: "Naturaleza y aventura", img: "https://images.unsplash.com/photo-1597076876931-6d43ab0cc36c?w=300" },
                  { name: "Oaxaca", desc: "Cultura y tradición", img: "https://images.unsplash.com/photo-1583531352361-9eeae2cabee7?w=300" },
                  { name: "Playa del Carmen", desc: "Vida nocturna vibrante", img: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=300" }
                ].map((city, i) => (
                  <Card key={i} hoverable cover={<img src={city.img} alt={city.name} style={{ height: 120, objectFit: "cover" }} />}
                    style={{ borderRadius: 12, overflow: 'hidden' }}>
                    <Flex justify="space-between" align="center">
                      <div>
                        <Typography.Text strong>{city.name}</Typography.Text>
                        <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>{city.desc}</Typography.Paragraph>
                      </div>
                      <div style={{ background: beachColors.turquoise, color: 'white', borderRadius: 6, padding: '2px 8px', fontSize: 12 }}>-20%</div>
                    </Flex>
                  </Card>
                ))}
              </Space>

              <div style={{
                marginTop: 32, padding: 20, background: `linear-gradient(135deg, ${beachColors.deepBlue}15, ${beachColors.turquoise}15)`,
                borderRadius: 16
              }}>
                <Typography.Title level={5}>📧 Ofertas Exclusivas</Typography.Title>
                <Typography.Text>Suscríbete y recibe promociones especiales</Typography.Text>
                <Input placeholder="Tu email" style={{ marginTop: 12, borderRadius: 8 }} />
                <Button type="primary" block style={{
                  marginTop: 8, borderRadius: 8,
                  background: `linear-gradient(135deg, ${beachColors.turquoise}, ${beachColors.oceanBlue})`
                }}>Suscribirme</Button>
              </div>
            </Flex>
          </Splitter.Panel>
        </Splitter>
      </main>

      {/* FOOTER */}
      <footer style={{
        textAlign: "center", padding: 24,
        background: `linear-gradient(135deg, ${beachColors.deepBlue}, ${beachColors.oceanBlue})`,
        color: 'white'
      }}>
        <Typography.Text>© 2025 Casa Frida — Donde los sueños de playa se hacen realidad 🌊🌸</Typography.Text>
        <div style={{ marginTop: 8 }}>
          {['Términos', 'Privacidad', 'Contacto', 'Nosotros'].map((t, i) =>
            <Typography.Text key={i} style={{ margin: '0 12px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}>{t}</Typography.Text>
          )}
        </div>
      </footer>
    </div>
  );
}

export default App;
