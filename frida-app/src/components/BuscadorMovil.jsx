import { useState, useEffect } from "react";
import { Input, DatePicker, Select, Button, Space, Card } from "antd";
import { EnvironmentOutlined, SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
const { Option } = Select;

const BuscadorMovil = ({ beachColors, open, onclose }) => {
    const [visible, setVisible] = useState(open);
    const [showAnimation, setShowAnimation] = useState(false);

    useEffect(() => {
        if (open) {
            setVisible(true);
            setTimeout(() => setShowAnimation(true), 10); // trigger fade in
        } else {
            setShowAnimation(false); // trigger fade out
            setTimeout(() => setVisible(false), 300); // remove from DOM after fade out
        }
    }, [open]);

    if (!visible) return null;

    return (
        <>
            {/* Overlay */}
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

            {/* Contenedor tipo modal */}
            <Card
                style={{
                    position: "fixed",
                    top: "10%",
                    left: "50%",
                    transform: `translateX(-50%) translateY(${showAnimation ? "0" : "-16px"})`, width: "90%",
                    maxWidth: 400,
                    zIndex: 1000,
                    padding: 16,
                    borderRadius: 12,
                    background: "#fff",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
            >
                <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                    <Input
                        prefix={<EnvironmentOutlined style={{ color: beachColors.turquoise }} />}
                        placeholder="Destino, ciudad o hotel"
                        size="middle"
                    />

                    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
                        <DatePicker
                            style={{ width: "100%" }}
                            placeholder="Fecha inicio"
                            size="middle"
                            defaultValue={dayjs()}
                        />
                        <DatePicker
                            style={{ width: "100%" }}
                            placeholder="Fecha fin"
                            size="middle"
                            defaultValue={dayjs().add(2, "day")}
                        />
                    </Space>

                    <Select defaultValue="2 adultos" size="middle" style={{ width: "100%" }}>
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
                        style={{ borderRadius: 8 }}
                    >
                        Buscar
                    </Button>
                </Space>
            </Card>
        </>
    );
};

export default BuscadorMovil;
