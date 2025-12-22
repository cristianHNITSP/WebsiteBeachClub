// models/Reserva.js
const mongoose = require("mongoose");

const ORIGINS = [
  "manual",
  "web",
  "seed",
  "import",
  "directo",
  "whatsapp",
  "booking",
  "expedia",
  "facebook",
];
const TYPES = ["stay"];

function genCodigoReserva({ hotel, room, startDate }) {
  const h =
    hotel === "casa_frida"
      ? "CF"
      : hotel === "cabanas_fridas"
      ? "CB"
      : String(hotel || "XX").slice(0, 2).toUpperCase();

  const r = String(room || "0").replace(/\s+/g, "");
  const d = String(startDate || "").replace(/-/g, ""); // YYYYMMDD
  const t = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${h}-${r}-${d}-${t}-${rand}`;
}

const ReservaSchema = new mongoose.Schema(
  {
    codigoReserva: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    habitacionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Habitacion",
      required: true,
      index: true,
    },

    hotel: { type: String, required: true, trim: true, index: true },
    room: { type: String, required: true, trim: true, index: true },

    type: { type: String, enum: TYPES, default: "stay", index: true },

    startDate: { type: String, required: true, trim: true, index: true },
    endDate: { type: String, required: true, trim: true, index: true },

    label: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },

    // ahora puede ser: manual / web / seed / import / directo / whatsapp / booking / expedia / facebook
    origen: { type: String, enum: ORIGINS, default: "manual", index: true },

    checkinAt: { type: String, default: null, trim: true },
    checkoutAt: { type: String, default: null, trim: true },
    paidAt: { type: String, default: null, trim: true },

    //PAPELERA (soft delete)
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    strict: true,
  }
);

// autogenera si faltara (por seguridad)
ReservaSchema.pre("validate", function (next) {
  if (!this.codigoReserva) {
    this.codigoReserva = genCodigoReserva({
      hotel: this.hotel,
      room: this.room,
      startDate: this.startDate,
    });
  }
  next();
});

ReservaSchema.index({
  hotel: 1,
  room: 1,
  startDate: 1,
  endDate: 1,
  isDeleted: 1,
});

module.exports = mongoose.model("Reserva", ReservaSchema);
