import rateLimit from "express-rate-limit";

// Tight limits for AI/email/payment endpoints — these cost real money on abuse.
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before trying again." },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === "test",
});

// Standard limits for authenticated write endpoints.
export const moderateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: () => process.env.NODE_ENV === "test",
});

// Generous limits for read endpoints.
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

// Per-user rate limiter for authenticated AI endpoints — uses user ID as key when available.
// This prevents one user from rate-limiting all users behind the same IP (corporate NAT, mobile carrier).
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer user ID for authenticated requests, fall back to IP
    if (req.isAuthenticated && req.isAuthenticated()) {
      return `user:${req.user!.id}`;
    }
    return req.ip ?? "unknown";
  },
  message: { error: "Too many AI requests. Please wait a moment." },
  skip: () => process.env.NODE_ENV === "test",
});
