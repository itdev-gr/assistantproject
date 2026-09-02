/**
 * Role vocabulary shared by server and client code (no server-only imports).
 *
 * `aga_role` is injected into the JWT by `custom_access_token_hook`:
 *   super_admin            → membership in `super_admins`
 *   owner|manager|staff    → `hotel_users` (scoped to one hotel)
 *   partner|user           → `profiles.role` for self-serve accounts
 */
export type AgaRole = 'super_admin' | 'owner' | 'manager' | 'staff' | 'partner' | 'user';

export const HOTEL_ROLES: readonly AgaRole[] = ['owner', 'manager', 'staff'];

/** Where a signed-in user lands by default. */
export function homeForRole(role: AgaRole | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return '/admin';
    case 'owner':
    case 'manager':
    case 'staff':
      return '/owner';
    case 'partner':
      return '/partner';
    default:
      return '/account';
  }
}
