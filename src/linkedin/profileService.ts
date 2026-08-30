import { config } from "../config.js";
import { TtlCache } from "../cache/memoryCache.js";
import { extractPublicIdentifier } from "./urlUtils.js";
import { voyagerGet } from "./voyagerClient.js";
import { mapProfileView } from "./mapper.js";
import type { RawProfileView } from "./rawTypes.js";
import type { LinkedInProfile } from "../types/profile.js";

const cache = new TtlCache<LinkedInProfile>(config.linkedin.profileCacheTtlMs);

export interface FetchProfileResult {
  profile: LinkedInProfile;
  cached: boolean;
  raw?: RawProfileView;
}

export async function fetchProfileByUrl(
  urlOrIdentifier: string,
  options: { includeRaw?: boolean; bypassCache?: boolean } = {},
): Promise<FetchProfileResult> {
  const publicIdentifier = extractPublicIdentifier(urlOrIdentifier);

  if (!options.bypassCache) {
    const cached = cache.get(publicIdentifier);
    if (cached) {
      return { profile: cached, cached: true };
    }
  }

  const raw = await voyagerGet<RawProfileView>({
    path: `/identity/profiles/${encodeURIComponent(publicIdentifier)}/profileView`,
  });

  const profile = mapProfileView(raw, publicIdentifier);
  cache.set(publicIdentifier, profile);

  return { profile, cached: false, raw: options.includeRaw ? raw : undefined };
}
