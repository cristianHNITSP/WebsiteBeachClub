// seed/seed-habitaciones.js
require("dotenv").config();

if (process.env.SEED !== 'true') {
  console.log('SEED not enabled — skipping seed-data.js');
  process.exit(0);
}
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva");
const HeroSlide = require("../models/HeroSlide");

function defaultOffer() {
  return { isSpecial: false, description: "", discountPercent: null };
}

function enforceSeedConsistency(room) {
  return {
    ...room,
    offer: room.offer ? room.offer : defaultOffer(),
    isDeleted: room.isDeleted === true ? true : false,
    deletedAt: room.isDeleted ? room.deletedAt || new Date() : null,
  };
}

async function seed() {
  try {
    await connectDB();

    console.log("🧹 Borrando colecciones de reservas, habitaciones y heroSlides...");
    await Reserva.deleteMany({});
    await Habitacion.deleteMany({});
    await HeroSlide.deleteMany({});

    console.log("🛏 Creando habitaciones demo...");

    const rawRooms = [
      {
        codigo: "CF-101",
        hotelCode: "casa_frida",
        roomNumber: "101",
        title: "Suite Vista al Mar",
        location: "Casa Frida • Frente al mar",
        img: "https://example.com/img/cf-101.jpg",
        price: 2500,
        rating: 4.8,
        amenities: ["WiFi", "A/C", "TV", "Desayuno incluido"],
        badge: "Popular",
        featured: true,
        size: 2,
        roomType: "Suite",
        inventoryStatus: "Activa",
        offer: { isSpecial: true, description: "Promo temporada baja", discountPercent: 12 },
        favoritesCount: 12,
      },
      {
        codigo: "CF-102",
        hotelCode: "casa_frida",
        roomNumber: "102",
        title: "Suite Jardín Privado",
        location: "Casa Frida • Área jardín",
        img: "https://example.com/img/cf-102.jpg",
        price: 2100,
        rating: 4.6,
        amenities: ["WiFi", "A/C", "Terraza"],
        badge: "Recomendada",
        featured: false,
        size: 2,
        roomType: "Suite Jardín",
        inventoryStatus: "Activa",
        favoritesCount: 8,
      },
      {
        codigo: "CF-103",
        hotelCode: "casa_frida",
        roomNumber: "103",
        title: "Loft Vista Jardín",
        location: "Casa Frida • Nivel superior",
        img: "https://example.com/img/cf-103.jpg",
        price: 1900,
        rating: 4.4,
        amenities: ["WiFi", "A/C", "TV"],
        badge: "",
        featured: false,
        size: 3,
        roomType: "Loft",
        inventoryStatus: "Activa",
        favoritesCount: 5,
      },
      {
        codigo: "CF-104",
        hotelCode: "casa_frida",
        roomNumber: "104",
        title: "Doble Interior",
        location: "Casa Frida • Planta baja interior",
        img: "https://example.com/img/cf-104.jpg",
        price: 1600,
        rating: 4.2,
        amenities: ["WiFi", "A/C"],
        badge: "Económica",
        featured: false,
        size: 2,
        roomType: "Doble",
        inventoryStatus: "Mantenimiento",
        favoritesCount: 3,
      },
      {
        codigo: "CF-105",
        hotelCode: "casa_frida",
        roomNumber: "105",
        title: "Suite Familiar",
        location: "Casa Frida • Zona familiar",
        img: "https://example.com/img/cf-105.jpg",
        price: 2800,
        rating: 4.7,
        amenities: ["WiFi", "A/C", "TV", "Cocina pequeña"],
        badge: "Familiar",
        featured: true,
        size: 4,
        roomType: "Suite",
        inventoryStatus: "Activa",
        favoritesCount: 10,
      },

      // CABAÑAS FRIDA
      {
        codigo: "CB-201",
        hotelCode: "cabanas_fridas",
        roomNumber: "201",
        title: "Cabaña Frente al Río",
        location: "Cabañas Frida • Frente al río",
        img: "https://example.com/img/cb-201.jpg",
        price: 2300,
        rating: 4.9,
        amenities: ["WiFi", "Ventilador", "Terraza", "Hamaca"],
        badge: "Top",
        featured: true,
        size: 2,
        roomType: "Cabaña",
        inventoryStatus: "Activa",
        offer: { isSpecial: true, description: "Fin de semana romántico", discountPercent: 9 },
        favoritesCount: 20,
      },
      {
        codigo: "CB-202",
        hotelCode: "cabanas_fridas",
        roomNumber: "202",
        title: "Cabaña Familiar",
        location: "Cabañas Frida • Zona familiar",
        img: "https://example.com/img/cb-202.jpg",
        price: 2600,
        rating: 4.5,
        amenities: ["WiFi", "Ventilador", "Cocina", "Terraza"],
        badge: "Familiar",
        featured: false,
        size: 4,
        roomType: "Cabaña",
        inventoryStatus: "Activa",
        favoritesCount: 9,
      },
      {
        codigo: "CB-203",
        hotelCode: "cabanas_fridas",
        roomNumber: "203",
        title: "King Vista Selva",
        location: "Cabañas Frida • Vista selva",
        img: "https://example.com/img/cb-203.jpg",
        price: 2000,
        rating: 4.3,
        amenities: ["WiFi", "A/C", "Balcón"],
        badge: "",
        featured: false,
        size: 2,
        roomType: "King",
        inventoryStatus: "Activa",
        favoritesCount: 4,
      },
      {
        codigo: "CB-204",
        hotelCode: "cabanas_fridas",
        roomNumber: "204",
        title: "Doble Selva",
        location: "Cabañas Frida • Zona alta",
        img: "https://example.com/img/cb-204.jpg",
        price: 1700,
        rating: 4.0,
        amenities: ["WiFi", "Ventilador"],
        badge: "",
        featured: false,
        size: 2,
        roomType: "Doble",
        inventoryStatus: "Fuera de servicio",
        favoritesCount: 2,
      },
      {
        codigo: "CB-205",
        hotelCode: "cabanas_fridas",
        roomNumber: "205",
        title: "Loft Panorámico",
        location: "Cabañas Frida • Mirador",
        img: "https://example.com/img/cb-205.jpg",
        price: 2400,
        rating: 4.6,
        amenities: ["WiFi", "A/C", "Vista panorámica"],
        badge: "Vista premium",
        featured: true,
        size: 3,
        roomType: "Loft",
        inventoryStatus: "Bloqueada",
        favoritesCount: 6,
      },
    ];

    const roomsToInsert = rawRooms.map(enforceSeedConsistency);
    const rooms = await Habitacion.insertMany(roomsToInsert);
    console.log("✅ Habitaciones creadas:", rooms.map((r) => r.codigo));

    // 🎡 Hero
    const heroImg =
      "https://scontent.fmid1-3.fna.fbcdn.net/v/t39.30808-6/487996831_1226933259437418_1477921974834808949_n.jpg?_nc_cat=103&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=cQHYQExC3vwQ7kNvwFGHLbA&_nc_oc=AdlxWdChNxbYkumI2nH7QiON6SapBgC8KkjhN00wOL2N1mmLu0O6hOTd7E6VYswlwzRNHdiSUuxrnm3tA6Dn6FUo&_nc_zt=23&_nc_ht=scontent.fmid1-3.fna&_nc_gid=yhS2InLir0CyuUQMxBWDbA&oh=00_AfhZgogfliEuO5dyXGUIik3AkK05VkwJHPmctl7V8W5BqA&oe=6929ED41";

    console.log("🎠 Creando slides del hero...");

    const heroSlides = await HeroSlide.insertMany([
      {
        title: "Escápate frente al mar",
        subtitle: "Alojamientos seleccionados para disfrutar como en casa.",
        img: heroImg,
        badgeText: "Reservas directas · Mejor atención",
        order: 1,
        isActive: true,
      },
      {
        title: "Cabañas con encanto",
        subtitle: "Naturaleza, diseño y comodidad en un solo lugar.",
        img: heroImg,
        badgeText: "Relájate en medio de la naturaleza",
        order: 2,
        isActive: true,
      },
      {
        title: "Experiencias inolvidables",
        subtitle: "Reserva directo con quienes te atienden de verdad.",
        img: heroImg,
        badgeText: "Atención cercana y humana",
        order: 3,
        isActive: true,
      },
    ]);

    console.log("✅ HeroSlides creados:", heroSlides.map((s) => s.title));
  } catch (err) {
    console.error("❌ Error seed-data:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
