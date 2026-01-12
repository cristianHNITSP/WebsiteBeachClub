// src/routes/auth.routes.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const validator = require("validator");

const User = require("../models/User");
const Role = require("../models/Role");

const createLoginRateLimit = require("../middlewares/loginRateLimit");
const {
  hasEmoji,
  normalizeText,
  ensurePlainString,
} = require("../utils/inputSanitizers");

const router = express.Router();

/* =========================================================
   HELPERS
   ========================================================= */
function getTokenFromRequest(req) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

  const cookieToken = req.cookies?.auth_token;

  return (
    (typeof tokenFromHeader === "string" && tokenFromHeader) ||
    (typeof cookieToken === "string" && cookieToken) ||
    null
  );
}

function sendValidationError(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return null;

  return res.status(400).json({
    error: "VALIDATION_ERROR",
    message: "Datos inválidos. Revisa el formulario.",
    details: errors.array().map((e) => ({ field: e.path, msg: e.msg })),
  });
}

/* =========================================================
   VALIDATORS
   ========================================================= */
const loginValidators = [
  body("email")
    .custom((v) => ensurePlainString(v))
    .withMessage("El correo debe ser texto.")
    .bail()
    .customSanitizer((v) => normalizeText(String(v)).trim())
    .isLength({ min: 6, max: 254 })
    .withMessage("Correo fuera de rango.")
    .bail()
    .custom((v) => !hasEmoji(v))
    .withMessage("El correo no puede contener emojis.")
    .bail()
    .custom((v) => validator.isEmail(v))
    .withMessage("Formato de correo no válido.")
    .bail()
    .customSanitizer(
      (v) => validator.normalizeEmail(v, { gmail_remove_dots: false }) || v
    ),

  body("password")
    .custom((v) => ensurePlainString(v))
    .withMessage("La contraseña debe ser texto.")
    .bail()
    .customSanitizer((v) => normalizeText(String(v)))
    .isLength({ min: 6, max: 72 })
    .withMessage("La contraseña debe tener entre 6 y 72 caracteres.")
    .bail()
    .custom((v) => !hasEmoji(v))
    .withMessage("La contraseña no puede contener emojis."),
];

/* =========================================================
   POST /api/auth/login
   ========================================================= */
router.post(
  "/login",
  createLoginRateLimit({ windowMs: 60_000, max: 6, blockMs: 60_000 }),
  loginValidators,
  async (req, res) => {
    try {
      const vErr = sendValidationError(req, res);
      if (vErr) return vErr;

      const email = req.body.email;
      const password = req.body.password;

      const user = await User.findOne({ email })
        .populate("sede", "key name")
        .select("+password +tokens");

      if (!user) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        return res.status(401).json({ error: "INVALID_CREDENTIALS" });
      }

      if (!user.isActive) {
        return res.status(403).json({ error: "USER_INACTIVE" });
      }

      const roleDoc = await Role.findOne({ key: user.role });
      const permissions = roleDoc?.permissions || [];

      const payload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        permissions,
        sedeId: user.sede?._id,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h",
      });

      user.tokens.push({ token });
      user.tokens = user.tokens.slice(-10);
      user.lastLogin = new Date();
      await user.save();

      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60 * 1000,
      });

      return res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sede: user.sede,
        permissions,
        token,
      });
    } catch (err) {
      console.error("[auth/login]", err);
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  }
);

/* =========================================================
   GET /api/auth/me
   ========================================================= */
router.get("/me", async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ error: "NO_TOKEN" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      if (e?.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "TOKEN_EXPIRED",
          message: "La sesión ha expirado. Inicia sesión nuevamente.",
        });
      }
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Token inválido o manipulado.",
      });
    }

    const user = await User.findById(decoded.id)
      .populate("sede", "key name")
      .select("+tokens");

    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    const tokenInStore = user.tokens.some((t) => t.token === token);

    if (!tokenInStore) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "La sesión no es válida o fue cerrada. Inicia sesión nuevamente.",
      });
    }

    const roleDoc = await Role.findOne({ key: user.role });
    const permissions = roleDoc?.permissions || [];

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      sede: user.sede,
      permissions,
      lastLogin: user.lastLogin,
      tokenInStore: true,
    });
  } catch (err) {
    console.error("[auth/me]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

/* =========================================================
   POST /api/auth/logout
   ========================================================= */
router.post("/logout", async (req, res) => {
  try {
    const token = getTokenFromRequest(req);

    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });

    if (!token) {
      return res.json({ message: "Sesión cerrada correctamente" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.json({ message: "Sesión cerrada correctamente" });
    }

    const user = await User.findById(decoded.id).select("+tokens");
    if (user) {
      user.tokens = user.tokens.filter((t) => t.token !== token);
      await user.save();
    }

    return res.json({ message: "Sesión cerrada correctamente" });
  } catch (err) {
    console.error("[auth/logout]", err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});

module.exports = router;
