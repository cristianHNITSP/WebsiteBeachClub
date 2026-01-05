import { Segmented, Typography, message } from "antd";
import HomeHero from "../components/website/home/HomeHero";
import DestinationCard from "../components/website/home/DestinationCard";
import FeaturedCard from "../components/website/home/FeaturedCard";

const { Title } = Typography;

// ✅ HARDCOODED AQUÍ (sin data file)
const SUCURSALES = [
  {
    key: "casa",
    name: "Casa Frida",
    subtitle: "Chelem",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=70",
  },
  {
    key: "cabanas",
    name: "Cabañas Frida",
    subtitle: "Chuburná",
    img: "https://images.unsplash.com/photo-1501117716987-c8e1ecb210ff?auto=format&fit=crop&w=1400&q=70",
  },
];

const HABITACIONES_DESTACADAS = [
  {
    key: "feat-1",
    title: "Suite frente al mar",
    place: "Chelem",
    rating: 4.8,
    price: 1890,
    img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=70",
    badge: { text: "Top", color: "teal" },
  },
  {
    key: "feat-2",
    title: "Cabaña familiar",
    place: "Chuburná",
    rating: 4.7,
    price: 1590,
    img: "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1400&q=70",
    badge: { text: "Familia", color: "sunset" },
  },
  {
    key: "feat-3",
    title: "Mejor precio",
    place: "Chelem",
    rating: 4.6,
    price: 1290,
    img: "https://images.unsplash.com/photo-1444201983204-c43cbd584d93?auto=format&fit=crop&w=1400&q=70",
    badge: { text: "Deal", color: "coral" },
  },
];

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
