import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { testAuthMiddleware } from "./middlewares/testAuthMiddleware";
import { readLimiter } from "./middlewares/rateLimit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop (Replit / Cloudflare) so req.ip reflects the real client IP.
// Required for rate limiting to work correctly behind a proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security headers. contentSecurityPolicy is disabled here because the API serves JSON only;
// a CSP for the web app belongs in Netlify config (see Section 4).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS — locked down to known origins. Add new origins via ALLOWED_ORIGINS env var (comma-separated).
const allowedOrigins = [
  "https://healthplanfactory.com",
  "https://www.healthplanfactory.com",
  "https://staging.healthplanfactory.com",
  // Mobile app uses native fetch — no Origin header — so CORS doesn't apply there.
  // Add localhost for dev:
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081"]
    : []),
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn({ origin }, "CORS rejected origin");
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(cookieParser());

// Raw body required for Stripe webhook signature verification — must come before express.json()
app.use(
  "/api/employer/billing/webhook",
  express.raw({ type: "application/json" })
);
app.use(
  "/api/providers/stripe-webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "test") {
  app.use(testAuthMiddleware);
}
app.use(authMiddleware);

// Global baseline rate limit — applies to all /api routes.
// Individual routes can add stricter limits on top of this.
app.use("/api", readLimiter);

// Health check — must be registered before the main router so it responds
// even if auth middleware or DB isn't fully ready.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

export default app;
