import { useState, useEffect } from "react";
import { Input, DatePicker, Select, Button, Space, Card, Flex } from "antd";
import { EnvironmentOutlined, SearchOutlined, ReloadOutlined } from "@ant-design/icons";

const { Option } = Select;

const BuscadorMovil = ({
  beachColors,
  open,
  onclose,
  initialQuery = "",
  initialDates = { startDate: null, endDate: null },
  initialGuests = "2",
  onSearch,
  onClear,
}) => {
  const [visible, setVisible] = useState(open);
  const [showAnimation, setShowAnimation] = useState(false);

  const [q, setQ] = useState(initialQuery || "");
  const [start, setStart] = useState(initialDates?.startDate || null);
  const [end, setEnd] = useState(initialDates?.endDate || null);
  const [guests, setGuests] = useState(initialGuests || "2");

  useEffect(() => setQ(initialQuery || ""), [initialQuery]);

  useEffect(() => {
    setStart(initialDates?.startDate || null);
    setEnd(initialDates?.endDate || null);
  }, [initialDates?.startDate, initialDates?.endDate]);

  useEffect(() => setGuests(initialGuests || "2"), [initialGuests]);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setTimeout(() => setShowAnimation(true), 10);
    } else {
      setShowAnimation(false);
      setTimeout(() => setVisible(false), 250);
    }
  }, [open]);

  if (!visible) return null;

  const handleBuscar = () => {
    onSearch?.({
      q,
      startDate: start ? start.format("YYYY-MM-DD") : null,
      endDate: end ? end.format("YYYY-MM-DD") : null,
      guests,
    });
  };

  const handleLimpiar = () => {
    setQ("");
    setStart(null);
    setEnd(null);
    setGuests("2");

    onClear?.();
    onSearch?.({ q: "", startDate: null, endDate: null, guests: "2" });
  };

  return (
    <>
      <div
        onClick={onclose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 999,
          opacity: showAnimation ? 1 : 0,
          transition: "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />

      <Card
        style={{
          position: "fixed",
          top: "10%",
          left: "50%",
          transform: `translateX(-50%) translateY(${showAnimation ? "0" : "-16px"})`,
          width: "90%",
          maxWidth: 420,
          zIndex: 1000,
          padding: 14,
          borderRadius: 14,
          background: "#fff",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: "0 18px 60px rgba(15,23,42,0.25)",
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={handleBuscar}
            allowClear
            prefix={<EnvironmentOutlined style={{ color: beachColors.turquoise }} />}
            placeholder="Destino, ciudad o hotel"
            size="middle"
          />

          <Space direction="vertical" size="middle" style={{ width: "100%" }}>
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Fecha inicio"
              size="middle"
              value={start}
              onChange={(v) => setStart(v)}
              allowClear
            />
            <DatePicker
              style={{ width: "100%" }}
              placeholder="Fecha fin"
              size="middle"
              value={end}
              onChange={(v) => setEnd(v)}
              allowClear
            />
          </Space>

          <Select value={guests} onChange={setGuests} size="middle" style={{ width: "100%" }}>
            <Option value="1">1 adulto</Option>
            <Option value="2">2 adultos</Option>
            <Option value="3">3 adultos</Option>
            <Option value="4">Familia</Option>
          </Select>

          <Button
            type="primary"
            icon={<SearchOutlined />}
            size="middle"
            block
            style={{ borderRadius: 10, background: beachColors.oceanBlue, borderColor: beachColors.oceanBlue }}
            onClick={handleBuscar}
          >
            Buscar
          </Button>

          <Flex gap={8}>
            <Button block icon={<ReloadOutlined />} onClick={handleLimpiar} style={{ borderRadius: 10 }}>
              Limpiar
            </Button>
            <Button block onClick={onclose} style={{ borderRadius: 10 }}>
              Cerrar
            </Button>
          </Flex>
        </Space>
      </Card>
    </>
  );
};

export default BuscadorMovil;
