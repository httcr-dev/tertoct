import type { AppUserProfile } from "./types";

/**
 * Data Transfer Object (DTO) shaper for an authenticated User.
 * Removes heavily sensitive or internal state data (e.g., payment due days, phone)
 * and returns only the necessary fields for standard UI consuming.
 */
export function toUserDto(user: AppUserProfile) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    photoURL: user.photoURL,
    active: user.active,
  };
}

/**
 * Data Transfer Object (DTO) shaper for purely public representation.
 * Strict minimum exposure (e.g. for listing students for others without showing emails or roles).
 */
export function toPublicUserDto(user: AppUserProfile) {
  return {
    id: user.id,
    name: user.name,
    photoURL: user.photoURL,
  };
}
