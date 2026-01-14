import { Segmented, Typography, message } from "antd";
import HomeHero from "../components/website/home/HomeHero";
import DestinationCard from "../components/website/home/DestinationCard";
import FeaturedCard from "../components/website/home/FeaturedCard";
import { SUCURSALES, HABITACIONES_DESTACADAS } from "../data/demoData";

const { Title } = Typography;

// Demo data is imported from ../data/demoData

function HomePage({
  form,
  setFormPatch,
  onSearch,
  onReserveFeatured,
  onPickSucursal,
  favorites,
  onToggleFav,
}) {
  return (
    <div className="hf-pageBody hf-viewEnter">
      <HomeHero
        form={form}
        onChange={setFormPatch}
        onSearch={onSearch}
        sucursales={SUCURSALES}
      />

      <div className="hf-section hf-section--wide">
        <Title level={4} className="hf-sectionTitle">
          Sucursales
        </Title>

        <div className="hf-destsGrid">
          {SUCURSALES.map((d) => (
            <DestinationCard
              key={d.key}
              d={d}
              onClick={() => onPickSucursal(d.key)}
            />
          ))}
        </div>
      </div>

      <div className="hf-section hf-section--wide hf-section--tightTop">
        <div className="hf-sectionRow">
          <Title level={4} className="hf-sectionTitle" style={{ marginBottom: 0 }}>
            Habitaciones destacadas
          </Title>

          <Segmented
            className="hf-seg"
            size="middle"
            options={["Top", "Familia", "Mejor precio"]}
            onChange={() => message.info("Filtro (demo UI)")}
          />
        </div>

        <div className="hf-featureGrid">
          {HABITACIONES_DESTACADAS.map((f) => (
            <FeaturedCard
              key={f.key}
              item={f}
              onReserve={onReserveFeatured}
              isFav={favorites.has(f.key)}
              onToggleFav={onToggleFav}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default HomePage;
