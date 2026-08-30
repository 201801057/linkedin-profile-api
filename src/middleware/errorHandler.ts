import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../logger.js";
import { InvalidLinkedInUrlError } from "../linkedin/urlUtils.js";
import {
  LinkedInAuthError,
  LinkedInRateLimitError,
  ProfileNotFoundError,
} from "../linkedin/errors.js";

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No route ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: err.issues });
    return;
  }

  if (err instanceof InvalidLinkedInUrlError) {
    res.status(400).json({ error: err.message });
    return;
  }

  if (err instanceof ProfileNotFoundError) {
    res.status(404).json({ error: err.message });
    return;
  }

  if (err instanceof LinkedInRateLimitError) {
    res.status(429).json({
      error: "Upstream (LinkedIn) is rate-limiting this server right now. Try again shortly.",
    });
    return;
  }

  if (err instanceof LinkedInAuthError) {
    logger.error({ err }, "LinkedIn auth failure");
    res.status(502).json({
      error: "This server's LinkedIn session is invalid or was challenged. The operator needs to refresh it.",
    });
    return;
  }

  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
