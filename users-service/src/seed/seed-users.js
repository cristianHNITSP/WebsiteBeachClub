require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const { connectDB } = require("../config/db");

const User = require("../models/User");
const Role = require("../models/Role");
const Sede = require("../models/Sede");

async function seed() {
  try {
    await connectDB();

    console.log("🧹 Limpiando datos existentes...");
    await User.deleteMany({});
    await Role.deleteMany({});
    // NO borramos sedes si ya existen en prod
    // await Sede.deleteMany({});

    console.log("Creando / verificando sedes...");

    const sedes = await Sede.insertMany(
      [
        {
          key: "casa-frida",
          name: "Casa Frida",
          description: "Casa boutique frente al mar",
        },
        {
          key: "cabanas-frida",
          name: "Cabañas Frida",
          description: "Complejo de cabañas boutique",
        },
      ],
      { ordered: false }
    ).catch(() => {
      // Si ya existen (duplicado), simplemente continuamos
    });

    // Recuperamos sedes SIEMPRE desde DB
    const casaFrida = await Sede.findOne({ key: "casa-frida" });
    const cabanasFrida = await Sede.findOne({ key: "cabanas-frida" });

    if (!casaFrida || !cabanasFrida) {
      throw new Error("No se pudieron inicializar las sedes");
    }

    console.log("Sedes listas:", [
      casaFrida.name,
      cabanasFrida.name,
    ]);

    console.log("Creando roles...");

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

          // shop / POS
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

          // shop / POS
          "view_shop",
          "pos_shop",
        ],
      },
    ]);

    console.log("Roles creados:", [
      adminRole.key,
      staffRole.key,
    ]);

    console.log("Generando contraseñas...");

    const passwordAdmin = await bcrypt.hash("admin1234", 10);
    const passwordStaff = await bcrypt.hash("staff1234", 10);

    console.log("Creando usuarios...");

    const users = await User.insertMany([
      {
        name: "Administrador BeachClub",
        email: "admin@beachclub.com",
        password: passwordAdmin,
        role: "administrador",
        sede: casaFrida._id, // referencia REAL
        isActive: true,
      },
      {
        name: "Recepcionista Casa Frida",
        email: "recepcion@beachclub.com",
        password: passwordStaff,
        role: "staff",
        sede: casaFrida._id, // se puede cambiar a cabanasFrida
        isActive: true,
      },
    ]);

    console.log(
      "Usuarios creados:",
      users.map(
        (u) =>
          `${u.email} (${u.role}) → sede: ${
            u.sede.toString()
          }`
      )
    );

    console.log("Seed completado correctamente");
  } catch (err) {
    console.error("Error en seed-users:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
