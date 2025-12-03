// src/components/habitaciones/HabitacionesFilters.jsx
import { Flex, Input, Select, Button, Space } from "antd";
import { FilterOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { SEDES, INVENTORY_STATES, PAPELERA_OPTIONS, beachTheme as beachColors } from "./helpers";

const { Search } = Input;

const HabitacionesFilters = ({
  busqueda,
  setBusqueda,
  filtroSede,
  setFiltroSede,
  filtroEstado,
  setFiltroEstado,
  filtroPromo,
  setFiltroPromo,
  filtroFavoritos,
  setFiltroFavoritos,
  filtroPapelera,
  setFiltroPapelera,
  onClearFilters,
}) => {
  return (
    <Flex wrap gap={10} align="center" style={{ marginTop: 10 }}>
      <Search
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por código, título, tipo o ubicación…"
        allowClear
        style={{ width: 280 }}
      />

      <Select value={filtroSede} onChange={setFiltroSede} style={{ width: 170 }}>
        <Select.Option value="todas">Todas las sedes</Select.Option>
        {SEDES.map((s) => (
          <Select.Option key={s.value} value={s.value}>
            {s.label}
          </Select.Option>
        ))}
      </Select>

      <Select value={filtroEstado} onChange={setFiltroEstado} style={{ width: 190 }}>
        <Select.Option value="todas">Todos los estados</Select.Option>
        {INVENTORY_STATES.map((st) => (
          <Select.Option key={st} value={st}>
            {st}
          </Select.Option>
        ))}
      </Select>

      <Select value={filtroPromo} onChange={setFiltroPromo} style={{ width: 150 }}>
        <Select.Option value="todas">Promo: Todas</Select.Option>
        <Select.Option value="con_promo">Con promo</Select.Option>
        <Select.Option value="sin_promo">Sin promo</Select.Option>
      </Select>

      <Select value={filtroFavoritos} onChange={setFiltroFavoritos} style={{ width: 160 }}>
        <Select.Option value="todas">Favoritos: Todos</Select.Option>
        <Select.Option value="con_favs">Con favoritos</Select.Option>
        <Select.Option value="sin_favs">Sin favoritos</Select.Option>
      </Select>

      <Select value={filtroPapelera} onChange={setFiltroPapelera} style={{ width: 190 }}>
        {PAPELERA_OPTIONS.map((o) => (
          <Select.Option key={o.value} value={o.value}>
            {o.label}
          </Select.Option>
        ))}
      </Select>

      <Space>
        <Button
          icon={<FilterOutlined />}
          style={{ borderRadius: 10, borderColor: beachColors.turquoise, color: beachColors.deepBlue }}
          onClick={onClearFilters}
        >
          Limpiar
        </Button>
        <Button
          icon={<CloseCircleOutlined />}
          type="text"
          onClick={onClearFilters}
          style={{ color: "#64748b" }}
        >
          Reset
        </Button>
      </Space>
    </Flex>
  );
};

export default HabitacionesFilters;
