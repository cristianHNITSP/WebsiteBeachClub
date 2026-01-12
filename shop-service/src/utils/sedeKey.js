// shop-service/src/utils/sedeKey.js
const SEDE_ALIASES = {
  // Mantén compatibilidad con legacy
  cabanas_fridas: "cabanas_frida",
};

function normalizeSedeKey(input) {
  return (
    String(input || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || ""
  );
}

function normalizeAndAliasSedeKey(input) {
  const k = normalizeSedeKey(input);
  return SEDE_ALIASES[k] || k;
}

function humanizeKey(k) {
  return String(k || "")
    .replace(/_/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

module.exports = {
  normalizeSedeKey,
  normalizeAndAliasSedeKey,
  humanizeKey,
  SEDE_ALIASES,
};
