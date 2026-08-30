import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { config, assertLinkedInCredentialsConfigured } from "./config.js";
import { logger } from "./logger.js";
import { profileRouter } from "./routes/profile.route.js";
import { apiKeyAuth } from "./middleware/apiKeyAuth.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

try {
  assertLinkedInCredentialsConfigured();
} catch (err) {
  logger.error(
    { err },
    "No LinkedIn credentials configured yet - the server will start, but every /v1/profile " +
      "request will fail until LINKEDIN_LI_AT (or LINKEDIN_EMAIL/LINKEDIN_PASSWORD) is set.",
  );
}

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(pinoHttp({ logger }));

// Protects LinkedIn (and this server) from being hammered: callers of our API
// are capped well below anything that would make LinkedIn suspicious of the
// backing account.
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/v1", apiKeyAuth, profileRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`linkedin-profile-api listening on port ${config.port}`);
});
