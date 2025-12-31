// scripts/seed-users.js
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { connectDB } = require("../config/db");
const User = require("../models/User");
const Role = require("../models/Role");

async function seed() {
  try {
    await connectDB();

    console.log("📝 Borrando usuarios y roles existentes...");
    await User.deleteMany({});
    await Role.deleteMany({});

    console.log("🧩 Creando roles...");

    const [adminRole, staffRole] = await Role.insertMany([
      {
        key: "administrador",
        name: "Administrador",
        description: "Acceso completo al panel y configuración.",
        permissions: [
          "view_dashboard",
          "manage_users",
          "view_users",
          "manage_rooms",
          "view_rooms",
          "manage_reservations",
          "view_reservations",

          // carrusel
          "view_hero_slides",
          "manage_hero_slides",

          //NUEVOS: shop / POS
          "view_shop",
          "pos_shop",
          "manage_shop",
        ],
      },
      {
        key: "staff",
        name: "Staff recepción",
        description: "Gestión operativa de reservas y habitaciones.",
        permissions: [
          "view_dashboard",
          "view_rooms",
          "manage_reservations",
          "view_reservations",

          // carrusel (solo ver)
          "view_hero_slides",

          // ✅ NUEVOS: shop / POS (staff vende, pero no administra catálogo)
          "view_shop",
          "pos_shop",
        ],
      },
    ]);

    console.log("✅ Roles creados:", [adminRole.key, staffRole.key]);

    const passwordAdmin = await bcrypt.hash("admin1234", 10);
    const passwordStaff = await bcrypt.hash("staff1234", 10);

    const users = await User.insertMany([
      {
        name: "Administrador BeachClub",
        email: "admin@beachclub.com",
        password: passwordAdmin,
        role: "administrador",
        isActive: true,
      },
      {
        name: "Recepcionista",
        email: "recepcion@beachclub.com",
        password: passwordStaff,
        role: "staff",
        isActive: true,
      },
    ]);

    console.log("✅ Usuarios creados:", users.map((u) => `${u.email} (${u.role})`));
  } catch (err) {
    console.error("❌ Error en seed-users:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
