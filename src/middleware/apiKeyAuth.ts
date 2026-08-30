import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";
import { logger } from "../logger.js";

if (config.apiKeys.length === 0) {
  logger.warn(
    "No API_KEYS configured - the /v1/profile endpoint is unauthenticated. Set API_KEYS " +
      "(comma-separated) before exposing this publicly.",
  );
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (config.apiKeys.length === 0) {
    next();
    return;
  }

  const provided = req.header("x-api-key");
  if (!provided || !config.apiKeys.includes(provided)) {
    res.status(401).json({ error: "Missing or invalid API key. Send it via the X-Api-Key header." });
    return;
  }

  next();
}
