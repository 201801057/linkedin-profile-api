import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { fetchProfileByUrl } from "../linkedin/profileService.js";

export const profileRouter = Router();

const querySchema = z.object({
  url: z.string().min(1, "Query parameter `url` is required"),
  includeRaw: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  refresh: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const bodySchema = z.object({
  url: z.string().min(1, "Body field `url` is required"),
  includeRaw: z.boolean().optional(),
  refresh: z.boolean().optional(),
});

async function handleProfileRequest(
  url: string,
  opts: { includeRaw?: boolean; refresh?: boolean },
) {
  const result = await fetchProfileByUrl(url, {
    includeRaw: opts.includeRaw && config.enableRawDebug,
    bypassCache: opts.refresh,
  });

  return {
    profile: result.profile,
    meta: { cached: result.cached, ...(result.raw ? { raw: result.raw } : {}) },
  };
}

profileRouter.get("/profile", async (req, res, next) => {
  try {
    const parsed = querySchema.parse(req.query);
    const result = await handleProfileRequest(parsed.url, {
      includeRaw: parsed.includeRaw,
      refresh: parsed.refresh,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

profileRouter.post("/profile", async (req, res, next) => {
  try {
    const parsed = bodySchema.parse(req.body);
    const result = await handleProfileRequest(parsed.url, {
      includeRaw: parsed.includeRaw,
      refresh: parsed.refresh,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
