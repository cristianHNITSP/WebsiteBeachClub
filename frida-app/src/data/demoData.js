// Demo data extracted from App.jsx / HomePage.jsx
export const SUCURSALES = [
  {
    key: "chelem",
    name: "Cabañas Frida",
    subtitle: "Carretera Chelem",
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=2200&q=70",
  },
  {
    key: "chuburna",
    name: "Casa Frida",
    subtitle: "Carretera Chuburná",
    img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=2200&q=70",
  },
];

export const HABITACIONES_DESTACADAS = [
  {
    key: "hab-01",
    title: "Suite Frente al Mar",
    place: "Cabañas Frida · Chelem",
    rating: 4.9,
    price: 1850,
    badge: { text: "Top", color: "coral" },
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=70",
    location: "chelem",
    amenities: ["wifi", "ac", "parking"],
  },
  {
    key: "hab-02",
    title: "Habitación Familiar",
    place: "Casa Frida · Chuburná",
    rating: 4.7,
    price: 1500,
    badge: { text: "Popular", color: "teal" },
    img: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=70",
    location: "chuburna",
    amenities: ["wifi", "kitchen", "ac"],
  },
  {
    key: "hab-03",
    title: "Estancia Minimal",
    place: "Casa Frida · Chuburná",
    rating: 4.6,
    price: 1200,
    badge: { text: "Mejor precio", color: "sunset" },
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=70",
    location: "chuburna",
    amenities: ["wifi", "parking"],
  },
];

export const SEARCH_ITEMS = [
  {
    key: "sr-01",
    title: "Suite Frente al Mar",
    desc: "Amplia, luminosa, ideal para descansar. Vista y brisa marina.",
    rating: 5,
    reviews: 214,
    img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1800&q=70",
    location: "chelem",
    price: 1850,
    amenities: ["wifi", "ac", "parking"],
  },
  {
    key: "sr-02",
    title: "Habitación Familiar",
    desc: "Cómoda para 3–5 huéspedes. Perfecta para viajes en grupo.",
    rating: 4.5,
    reviews: 168,
    img: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1800&q=70",
    location: "chuburna",
    price: 1500,
    amenities: ["wifi", "kitchen", "ac"],
  },
  {
    key: "sr-03",
    title: "Estancia Minimal",
    desc: "Simple, bonita y práctica. Excelente opción para escapadas cortas.",
    rating: 4.5,
    reviews: 141,
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=70",
    location: "chuburna",
    price: 1200,
    amenities: ["wifi", "parking"],
  },
];

export default {
  SUCURSALES,
  HABITACIONES_DESTACADAS,
  SEARCH_ITEMS,
};
