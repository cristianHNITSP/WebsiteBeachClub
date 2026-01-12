// src/utils/inputSanitizers.js
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function hasEmoji(s) {
  if (typeof s !== "string") return false;
  return EMOJI_RE.test(s);
}

function normalizeText(s) {
  if (typeof s !== "string") return s;
  return s.normalize("NFKC");
}

// Evita NoSQL injection por “objetos” donde esperas string
function ensurePlainString(v) {
  return typeof v === "string";
}

module.exports = {
  hasEmoji,
  normalizeText,
  ensurePlainString,
};
