export type CookieSyncState = {
  token: string | null;
  expiration: string | null;
};

export const initialCookieSyncState: CookieSyncState = {
  token: null,
  expiration: null,
};

export function shouldSyncCookie(
  previous: CookieSyncState,
  next: CookieSyncState,
): boolean {
  return previous.token !== next.token || previous.expiration !== next.expiration;
}
