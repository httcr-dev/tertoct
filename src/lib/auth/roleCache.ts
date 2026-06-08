const ROLE_CACHE_TTL_MS = 60_000;

type RoleCacheEntry = {
  role: string | null;
  expiresAt: number;
};

const roleCache = new Map<string, RoleCacheEntry>();

export function getCachedUserRole(uid: string): string | null | undefined {
  const entry = roleCache.get(uid);
  if (!entry) return undefined;
  if (Date.now() >= entry.expiresAt) {
    roleCache.delete(uid);
    return undefined;
  }
  return entry.role;
}

export function setCachedUserRole(uid: string, role: string | null): void {
  roleCache.set(uid, {
    role,
    expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
  });
}

/** Clears cached roles (useful in tests). */
export function clearRoleCache(): void {
  roleCache.clear();
}
