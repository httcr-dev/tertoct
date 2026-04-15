import type { DecodedIdToken } from "firebase-admin/auth";

type PathRoleRule = {
  prefix: string;
  allowedRoles: string[];
};

const PATH_ROLE_RULES: PathRoleRule[] = [
  { prefix: "/dashboard/admin", allowedRoles: ["admin"] },
  { prefix: "/dashboard/coach", allowedRoles: ["coach", "admin"] },
  { prefix: "/api/private/admin", allowedRoles: ["admin"] },
  { prefix: "/api/private/coach", allowedRoles: ["coach", "admin"] },
];

export function getUserRoles(session: DecodedIdToken): string[] {
  const roles = new Set<string>();

  if (typeof session.role === "string" && session.role.length > 0) {
    roles.add(session.role);
  }

  for (const [claim, value] of Object.entries(session)) {
    if (value === true) {
      roles.add(claim);
    }
  }

  return [...roles];
}

export function isAuthorizedForPath(
  pathname: string,
  session: DecodedIdToken,
): boolean {
  const matchingRule = PATH_ROLE_RULES.find((rule) =>
    pathname.startsWith(rule.prefix),
  );

  if (!matchingRule) {
    if (pathname.startsWith("/api/private")) {
      return false;
    }
    return true;
  }

  const roles = getUserRoles(session);
  return matchingRule.allowedRoles.some((role) => roles.includes(role));
}
