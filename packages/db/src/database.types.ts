// AUTO-GENERATED placeholder. Run `pnpm db:types` after migrations are applied
// to overwrite this file with the real generated types.
//
// This minimal stub exists so the rest of the monorepo compiles before the
// Supabase project is provisioned.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
