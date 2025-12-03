const mongoose = require("mongoose");

const ReservaDateChangeLogSchema = new mongoose.Schema(
  {
    reservaId: { type: mongoose.Schema.Types.ObjectId, ref: "Reserva", required: true, index: true },
    codigoReserva: { type: String, default: "", index: true },
    hotel: { type: String, required: true, index: true },
    room: { type: String, required: true, index: true },

    action: { type: String, enum: ["edit_dates", "checkout_trim"], required: true, index: true },

    oldStartDate: { type: String, required: true },
    oldEndDate: { type: String, required: true },
    newStartDate: { type: String, required: true },
    newEndDate: { type: String, required: true },

    removedDates: { type: [String], default: [] },

    actor: {
      id: { type: String, default: "" },
      email: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

ReservaDateChangeLogSchema.index({ hotel: 1, room: 1, createdAt: -1 });

module.exports = mongoose.model("ReservaDateChangeLog", ReservaDateChangeLogSchema);
