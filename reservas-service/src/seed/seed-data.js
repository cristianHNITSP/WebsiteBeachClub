require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const Habitacion = require('../models/Habitacion');
const Reserva = require('../models/Reserva');

async function seed() {
  try {
    await connectDB();

    console.log('🧹 Borrando colecciones...');
    await Reserva.deleteMany({});
    await Habitacion.deleteMany({});

    console.log('🛏 Creando habitaciones demo...');
    const rooms = await Habitacion.insertMany([
      {
        codigo: 'CF-101',
        hotelCode: 'casa_frida',
        roomNumber: '101',
        title: 'Suite Vista al Mar',
        location: 'Casa Frida • Frente al mar',
        img: 'https://example.com/img/cf-101.jpg',
        price: 2500,
        rating: 4.8,
        amenities: ['WiFi', 'A/C', 'TV', 'Desayuno incluido'],
        badge: 'Popular',
        featured: true,
        size: 35,
        roomType: 'Suite',
        capacityLabel: '2 adultos',
        inventoryStatus: 'Activa',
        offer: {
          isSpecial: true,
          description: 'Promo temporada baja',
          specialPrice: 2200
        },
        availability: {
          available: true,
          nextAvailableDate: null
        },
        favoritesCount: 12
      },
      {
        codigo: 'CF-102',
        hotelCode: 'casa_frida',
        roomNumber: '102',
        title: 'Habitación Estándar',
        location: 'Casa Frida • Planta baja',
        img: 'https://example.com/img/cf-102.jpg',
        price: 1800,
        rating: 4.5,
        amenities: ['WiFi', 'A/C'],
        badge: '',
        featured: false,
        size: 25,
        roomType: 'Estándar',
        capacityLabel: '2 adultos',
        inventoryStatus: 'Activa',
        availability: {
          available: true,
          nextAvailableDate: null
        }
      }
    ]);

    console.log('✅ Habitaciones creadas:', rooms.map(r => r.codigo));
  } catch (err) {
    console.error('❌ Error seed-data:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
