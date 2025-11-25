// src/components/habitaciones/HabitacionesFilters.jsx
import React from "react";
import { Row, Col, Input, Select, Button, Space } from "antd";
import { SEDES, INVENTORY_STATES } from "./helpers";

const { Option } = Select;

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
  filtroEstadoReserva,
  setFiltroEstadoReserva,
  onClearFilters,
}) => {
  return (
    <>
      {/* Filtros principales */}
      <Row gutter={[10, 10]} style={{ marginTop: 10 }} align="middle">
        <Col xs={24} md={10}>
          <Input
            size="small"
            placeholder="Buscar por código, nombre, tipo o ubicación..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            allowClear
            style={{ fontSize: 11 }}
          />
        </Col>
        <Col xs={12} md={7}>
          <Select
            size="small"
            value={filtroSede}
            onChange={setFiltroSede}
            style={{ width: "100%", fontSize: 11 }}
          >
            <Option value="todas">Todas las sedes</Option>
            {SEDES.map((s) => (
              <Option key={s.value} value={s.value}>
                {s.label}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} md={7}>
          <Select
            size="small"
            value={filtroEstado}
            onChange={setFiltroEstado}
            style={{ width: "100%", fontSize: 11 }}
          >
            <Option value="todas">Todos los estados</Option>
            {INVENTORY_STATES.map((e) => (
              <Option key={e} value={e}>
                {e}
              </Option>
            ))}
          </Select>
        </Col>
      </Row>

      {/* Filtros nuevos: promo, favoritos y estado de reserva */}
      <Row
        gutter={[10, 10]}
        style={{ marginTop: 8, marginBottom: 4 }}
        align="middle"
      >
        <Col xs={12} md={6}>
          <Select
            size="small"
            value={filtroPromo}
            onChange={setFiltroPromo}
            style={{ width: "100%", fontSize: 11 }}
          >
            <Option value="todas">Promo: Todas</Option>
            <Option value="con_promo">Solo con promo</Option>
            <Option value="sin_promo">Sin promo</Option>
          </Select>
        </Col>
        <Col xs={12} md={6}>
          <Select
            size="small"
            value={filtroFavoritos}
            onChange={setFiltroFavoritos}
            style={{ width: "100%", fontSize: 11 }}
          >
            <Option value="todas">Favoritos: Todos</Option>
            <Option value="con_favs">Con favoritos</Option>
            <Option value="sin_favs">Sin favoritos</Option>
          </Select>
        </Col>
        <Col xs={24} md={12}>
          <Space
            size={6}
            style={{
              width: "100%",
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Select
              size="small"
              value={filtroEstadoReserva}
              onChange={setFiltroEstadoReserva}
              style={{ flex: 1, minWidth: 180, fontSize: 11 }}
            >
              <Option value="todos">Estado reserva: Todos</Option>
              <Option value="no_reservada">No reservada</Option>
              <Option value="reservada">Reservada</Option>
              <Option value="en_espera">En espera</Option>
            </Select>

            <Button
              size="small"
              onClick={onClearFilters}
              style={{
                borderRadius: 999,
                fontSize: 11,
              }}
            >
              Limpiar filtros
            </Button>
          </Space>
        </Col>
      </Row>
    </>
  );
};

export default HabitacionesFilters;
