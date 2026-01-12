// src/middlewares/loginRateLimit.js
function createLoginRateLimit({
  windowMs = 60_000,
  max = 6,
  blockMs = 60_000,
} = {}) {
  const buckets = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets.entries()) {
      if (
        now > (b.resetAt || 0) + windowMs * 2 &&
        now > (b.blockedUntil || 0) + windowMs * 2
      ) {
        buckets.delete(k);
      }
    }
  }, 60_000).unref?.();

  return function loginRateLimit(req, res, next) {
    const ip =
      (req.headers["x-forwarded-for"]?.split(",")[0] || "").trim() ||
      req.ip ||
      "unknown";

    const key = `login:${ip}`;
    const now = Date.now();

    let b = buckets.get(key);
    if (!b) {
      b = { count: 0, resetAt: now + windowMs, blockedUntil: 0 };
      buckets.set(key, b);
    }

    if (b.blockedUntil && now < b.blockedUntil) {
      const retryAfter = Math.ceil((b.blockedUntil - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "RATE_LIMIT",
        message: `Demasiados intentos. Intenta de nuevo en ${retryAfter}s.`,
      });
    }

    if (now > b.resetAt) {
      b.count = 0;
      b.resetAt = now + windowMs;
      b.blockedUntil = 0;
    }

    b.count += 1;

    res.setHeader("X-RateLimit-Limit", String(max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - b.count)));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(b.resetAt / 1000)));

    if (b.count > max) {
      b.blockedUntil = now + blockMs;
      const retryAfter = Math.ceil(blockMs / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "RATE_LIMIT",
        message: `Demasiados intentos. Intenta de nuevo en ${retryAfter}s.`,
      });
    }

    next();
  };
}

module.exports = createLoginRateLimit;
