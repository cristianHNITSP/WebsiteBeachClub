// seed/seed-habitaciones.js
require("dotenv").config();
const mongoose = require("mongoose");
const { connectDB } = require("../config/db");
const Habitacion = require("../models/Habitacion");
const Reserva = require("../models/Reserva");
const HeroSlide = require("../models/HeroSlide"); // 👈 NUEVO

async function seed() {
  try {
    await connectDB();

    console.log("🧹 Borrando colecciones de reservas, habitaciones y heroSlides...");
    await Reserva.deleteMany({});
    await Habitacion.deleteMany({});
    await HeroSlide.deleteMany({}); // 👈 limpiamos carrusel

    console.log("🛏 Creando habitaciones demo...");

    const rooms = await Habitacion.insertMany([
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Activa",
        offer: {
          isSpecial: true,
          description: "Promo temporada baja",
          discountPercent: 12, // ~2200 sobre 2500
        },
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Activa",
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "3 adultos",
        inventoryStatus: "Activa",
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Mantenimiento",
        availability: {
          available: false,
          nextAvailableDate: new Date(),
        },
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
        capacityLabel: "Familia",
        inventoryStatus: "Activa",
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Activa",
        offer: {
          isSpecial: true,
          description: "Fin de semana romántico",
          discountPercent: 9, // ~2100 sobre 2300
        },
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "Familia",
        inventoryStatus: "Activa",
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Activa",
        availability: {
          available: true,
          nextAvailableDate: null,
        },
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
        capacityLabel: "2 adultos",
        inventoryStatus: "Fuera de servicio",
        availability: {
          available: false,
          nextAvailableDate: null,
        },
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
        capacityLabel: "3 adultos",
        inventoryStatus: "Bloqueada",
        availability: {
          available: false,
          nextAvailableDate: null,
        },
        favoritesCount: 6,
      },
    ]);

    console.log("✅ Habitaciones creadas:", rooms.map((r) => r.codigo));

    // ===============================
    // 🎡 Semilla del carrusel (Hero)
    // ===============================

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

    console.log(
      "✅ HeroSlides creados:",
      heroSlides.map((s) => s.title)
    );
  } catch (err) {
    console.error("❌ Error seed-data:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
