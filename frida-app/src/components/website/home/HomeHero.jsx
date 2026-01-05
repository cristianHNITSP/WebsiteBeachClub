import { Button, DatePicker, Select, Typography } from "antd";
import {
  CalendarOutlined,
  DownOutlined,
  SearchOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;

// Mini “wave” inline (sin archivo extra)
function SoftWaveTop() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: -1,
        height: 46,
        pointerEvents: "none",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.92))",
      }}
    />
  );
}

function HomeHero({ form, onChange, onSearch, sucursales = [] }) {
  return (
    <div className="hf-hero">
      <div className="hf-heroBg" />
      <div className="hf-heroOverlay" />
      <div className="hf-heroGlow" />

      <div className="hf-heroContent">
        <Title level={2} className="hf-heroTitle">
          Reserva tu estancia
          <br />
          en Hoteles Frida
        </Title>
        <div className="hf-heroSub">
          Casa Frida - Cabañas Frida · A unos clics de tu próxima escapada
        </div>
      </div>

      <div className="hf-heroSearchWrap">
        <div className="hf-heroSearchCard">
          <div className="hf-searchRow">
            <div className="hf-searchItem">
              <Select
                value={form.branch}
                onChange={(v) => onChange({ branch: v })}
                placeholder="Sucursal"
                size="large"
                suffixIcon={<DownOutlined />}
                className="hf-select"
                options={sucursales.map((s) => ({
                  label: `${s.name} · ${s.subtitle}`,
                  value: s.key,
                }))}
              />
            </div>

            <div className="hf-searchItem">
              <DatePicker.RangePicker
                value={form.range}
                onChange={(v) => onChange({ range: v })}
                size="large"
                className="hf-range"
                placeholder={["Check-in", "Check-out"]}
                suffixIcon={<CalendarOutlined />}
              />
            </div>

            <Button
              className="hf-searchGo"
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={onSearch}
            >
              Buscar
            </Button>
          </div>

          <div className="hf-searchHint">
            <Text className="hf-searchHintText">
              Tip: selecciona una sucursal y fechas para ver disponibilidad ✨
            </Text>
          </div>
        </div>
      </div>

      <SoftWaveTop />
    </div>
  );
}

export default HomeHero;
