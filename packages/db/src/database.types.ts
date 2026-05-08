export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      amenities: {
        Row: {
          created_at: string
          description: string | null
          hotel_id: string
          hours_json: Json
          id: string
          location_on_property: string | null
          name: string
          state: Database["public"]["Enums"]["publish_state"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          hotel_id: string
          hours_json?: Json
          id?: string
          location_on_property?: string | null
          name: string
          state?: Database["public"]["Enums"]["publish_state"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          hotel_id?: string
          hours_json?: Json
          id?: string
          location_on_property?: string | null
          name?: string
          state?: Database["public"]["Enums"]["publish_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "amenities_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amenities_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          diff_jsonb: Json | null
          entity_id: string | null
          entity_type: string
          hotel_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          diff_jsonb?: Json | null
          entity_id?: string | null
          entity_type: string
          hotel_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          diff_jsonb?: Json | null
          entity_id?: string | null
          entity_type?: string
          hotel_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          confirmation_source:
            | Database["public"]["Enums"]["confirmation_source"]
            | null
          confirmed_at: string | null
          created_at: string
          currency: string
          gross_amount: number | null
          id: string
          notes: string | null
          referral_id: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          confirmation_source?:
            | Database["public"]["Enums"]["confirmation_source"]
            | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          referral_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          confirmation_source?:
            | Database["public"]["Enums"]["confirmation_source"]
            | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          gross_amount?: number | null
          id?: string
          notes?: string | null
          referral_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      business_categories: {
        Row: {
          created_at: string
          id: string
          name_i18n: Json
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_i18n?: Json
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name_i18n?: Json
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_offerings: {
        Row: {
          active: boolean
          available_days: number[]
          business_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          price_from: number | null
          price_to: number | null
          title: string
        }
        Insert: {
          active?: boolean
          available_days?: number[]
          business_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          price_from?: number | null
          price_to?: number | null
          title: string
        }
        Update: {
          active?: boolean
          available_days?: number[]
          business_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          price_from?: number | null
          price_to?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_offerings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          active: boolean
          address: string
          category_id: string
          created_at: string
          description_i18n: Json
          id: string
          images: Json
          lat: number
          lng: number
          name: string
          opening_hours_json: Json
          phone: string | null
          price_band: number | null
          search_tsv: unknown
          tags: string[]
          updated_at: string
          verified: boolean
          webhook_secret: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          active?: boolean
          address: string
          category_id: string
          created_at?: string
          description_i18n?: Json
          id?: string
          images?: Json
          lat: number
          lng: number
          name: string
          opening_hours_json?: Json
          phone?: string | null
          price_band?: number | null
          search_tsv?: unknown
          tags?: string[]
          updated_at?: string
          verified?: boolean
          webhook_secret?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          active?: boolean
          address?: string
          category_id?: string
          created_at?: string
          description_i18n?: Json
          id?: string
          images?: Json
          lat?: number
          lng?: number
          name?: string
          opening_hours_json?: Json
          phone?: string | null
          price_band?: number | null
          search_tsv?: unknown
          tags?: string[]
          updated_at?: string
          verified?: boolean
          webhook_secret?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_events: {
        Row: {
          booking_id: string
          commission_amount: number
          created_at: string
          id: string
          partnership_id: string
          payable_to: string
          state: Database["public"]["Enums"]["commission_state"]
        }
        Insert: {
          booking_id: string
          commission_amount: number
          created_at?: string
          id?: string
          partnership_id: string
          payable_to: string
          state?: Database["public"]["Enums"]["commission_state"]
        }
        Update: {
          booking_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          partnership_id?: string
          payable_to?: string
          state?: Database["public"]["Enums"]["commission_state"]
        }
        Relationships: [
          {
            foreignKeyName: "commission_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_events_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      events_internal: {
        Row: {
          capacity: number | null
          created_at: string
          description: string | null
          ends_at: string
          hotel_id: string
          id: string
          starts_at: string
          state: Database["public"]["Enums"]["publish_state"]
          title: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at: string
          hotel_id: string
          id?: string
          starts_at: string
          state?: Database["public"]["Enums"]["publish_state"]
          title: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          description?: string | null
          ends_at?: string
          hotel_id?: string
          id?: string
          starts_at?: string
          state?: Database["public"]["Enums"]["publish_state"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_internal_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_internal_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          created_at: string
          hotel_id: string
          id: string
          intent_slug: string | null
          locale: string
          question: string
          search_tsv: unknown
          state: Database["public"]["Enums"]["publish_state"]
          tags: string[]
          updated_at: string
          version: number
        }
        Insert: {
          answer: string
          created_at?: string
          hotel_id: string
          id?: string
          intent_slug?: string | null
          locale: string
          question: string
          search_tsv?: unknown
          state?: Database["public"]["Enums"]["publish_state"]
          tags?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          answer?: string
          created_at?: string
          hotel_id?: string
          id?: string
          intent_slug?: string | null
          locale?: string
          question?: string
          search_tsv?: unknown
          state?: Database["public"]["Enums"]["publish_state"]
          tags?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "faqs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faqs_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag: string
          hotel_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag: string
          hotel_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag?: string
          hotel_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          device_fingerprint: string | null
          hotel_id: string
          id: string
          last_seen_at: string
          locale_detected: string | null
          meta_json: Json
          room_id: string | null
          started_at: string
        }
        Insert: {
          device_fingerprint?: string | null
          hotel_id: string
          id?: string
          last_seen_at?: string
          locale_detected?: string | null
          meta_json?: Json
          room_id?: string | null
          started_at?: string
        }
        Update: {
          device_fingerprint?: string | null
          hotel_id?: string
          id?: string
          last_seen_at?: string
          locale_detected?: string | null
          meta_json?: Json
          room_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guest_sessions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sessions_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_users: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          hotel_id: string
          id: string
          role: Database["public"]["Enums"]["hotel_role"]
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          hotel_id: string
          id?: string
          role?: Database["public"]["Enums"]["hotel_role"]
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          hotel_id?: string
          id?: string
          role?: Database["public"]["Enums"]["hotel_role"]
        }
        Relationships: [
          {
            foreignKeyName: "hotel_users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_users_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      hotels: {
        Row: {
          active: boolean
          brand_json: Json
          created_at: string
          default_locale: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          slug: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          brand_json?: Json
          created_at?: string
          default_locale?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          brand_json?: Json
          created_at?: string
          default_locale?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      hours: {
        Row: {
          closes: string
          created_at: string
          entity_ref: string | null
          entity_type: Database["public"]["Enums"]["hours_entity_type"]
          hotel_id: string
          id: string
          opens: string
          seasonal_end: string | null
          seasonal_start: string | null
          weekday: number
        }
        Insert: {
          closes: string
          created_at?: string
          entity_ref?: string | null
          entity_type: Database["public"]["Enums"]["hours_entity_type"]
          hotel_id: string
          id?: string
          opens: string
          seasonal_end?: string | null
          seasonal_start?: string | null
          weekday: number
        }
        Update: {
          closes?: string
          created_at?: string
          entity_ref?: string | null
          entity_type?: Database["public"]["Enums"]["hours_entity_type"]
          hotel_id?: string
          id?: string
          opens?: string
          seasonal_end?: string | null
          seasonal_start?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "hours_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hours_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      intents: {
        Row: {
          description: string | null
          id: string
          is_out_of_scope: boolean
          keywords_el: string[]
          keywords_en: string[]
          requires_partner_search: boolean
          slug: string
        }
        Insert: {
          description?: string | null
          id?: string
          is_out_of_scope?: boolean
          keywords_el?: string[]
          keywords_en?: string[]
          requires_partner_search?: boolean
          slug: string
        }
        Update: {
          description?: string | null
          id?: string
          is_out_of_scope?: boolean
          keywords_el?: string[]
          keywords_en?: string[]
          requires_partner_search?: boolean
          slug?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          intent_slug: string | null
          needs_staff: boolean
          retrieved_context_ids: Json
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          intent_slug?: string | null
          needs_staff?: boolean
          retrieved_context_ids?: Json
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          intent_slug?: string | null
          needs_staff?: boolean
          retrieved_context_ids?: Json
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      partnerships: {
        Row: {
          active: boolean
          business_id: string
          commission_pct: number
          contract_ends: string | null
          contract_starts: string | null
          created_at: string
          hotel_id: string
          id: string
          notes: string | null
          paid_priority_score: number
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          business_id: string
          commission_pct?: number
          contract_ends?: string | null
          contract_starts?: string | null
          created_at?: string
          hotel_id: string
          id?: string
          notes?: string | null
          paid_priority_score?: number
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          business_id?: string
          commission_pct?: number
          contract_ends?: string | null
          contract_starts?: string | null
          created_at?: string
          hotel_id?: string
          id?: string
          notes?: string | null
          paid_priority_score?: number
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnerships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnerships_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          body: string
          created_at: string
          hotel_id: string
          id: string
          kind: Database["public"]["Enums"]["policy_kind"]
          locale: string
          state: Database["public"]["Enums"]["publish_state"]
        }
        Insert: {
          body: string
          created_at?: string
          hotel_id: string
          id?: string
          kind: Database["public"]["Enums"]["policy_kind"]
          locale: string
          state?: Database["public"]["Enums"]["publish_state"]
        }
        Update: {
          body?: string
          created_at?: string
          hotel_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["policy_kind"]
          locale?: string
          state?: Database["public"]["Enums"]["publish_state"]
        }
        Relationships: [
          {
            foreignKeyName: "policies_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_rules: {
        Row: {
          category_weight: number
          created_at: string
          distance_penalty_per_km: number
          hotel_id: string | null
          id: string
          max_results: number
          partner_bias_weight: number
          preference_weight: number
          proximity_scale_km: number
          proximity_weight: number
          semantic_weight: number
          tier_multipliers: Json
          time_match_weight: number
          updated_at: string
        }
        Insert: {
          category_weight?: number
          created_at?: string
          distance_penalty_per_km?: number
          hotel_id?: string | null
          id?: string
          max_results?: number
          partner_bias_weight?: number
          preference_weight?: number
          proximity_scale_km?: number
          proximity_weight?: number
          semantic_weight?: number
          tier_multipliers?: Json
          time_match_weight?: number
          updated_at?: string
        }
        Update: {
          category_weight?: number
          created_at?: string
          distance_penalty_per_km?: number
          hotel_id?: string | null
          id?: string
          max_results?: number
          partner_bias_weight?: number
          preference_weight?: number
          proximity_scale_km?: number
          proximity_weight?: number
          semantic_weight?: number
          tier_multipliers?: Json
          time_match_weight?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: true
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_rules_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: true
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          clicked_at: string | null
          expires_at: string
          id: string
          offering_id: string | null
          partnership_id: string
          session_id: string
          shown_at: string
          utm_json: Json
        }
        Insert: {
          clicked_at?: string | null
          expires_at?: string
          id?: string
          offering_id?: string | null
          partnership_id: string
          session_id: string
          shown_at?: string
          utm_json?: Json
        }
        Update: {
          clicked_at?: string | null
          expires_at?: string
          id?: string
          offering_id?: string | null
          partnership_id?: string
          session_id?: string
          shown_at?: string
          utm_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "referrals_offering_id_fkey"
            columns: ["offering_id"]
            isOneToOne: false
            referencedRelation: "business_offerings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          floor: number | null
          hotel_id: string
          id: string
          notes: string | null
          view: string | null
          wifi_password_secret: string | null
        }
        Insert: {
          code: string
          created_at?: string
          floor?: number | null
          hotel_id: string
          id?: string
          notes?: string | null
          view?: string | null
          wifi_password_secret?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          floor?: number | null
          hotel_id?: string
          id?: string
          notes?: string | null
          view?: string | null
          wifi_password_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "public_hotels"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_hotels: {
        Row: {
          brand_json: Json | null
          default_locale: string | null
          id: string | null
          name: string | null
          slug: string | null
          timezone: string | null
        }
        Insert: {
          brand_json?: Json | null
          default_locale?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Update: {
          brand_json?: Json | null
          default_locale?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          timezone?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      current_hotel_ids: { Args: never; Returns: string[] }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      earth: { Args: never; Returns: number }
      is_hotel_member: { Args: { h: string }; Returns: boolean }
      is_hotel_owner: { Args: { h: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "no_show"
      commission_state: "accrued" | "invoiced" | "paid"
      confirmation_source: "partner_webhook" | "manual" | "self_reported"
      hotel_role: "owner" | "manager" | "staff"
      hours_entity_type:
        | "reception"
        | "breakfast"
        | "lunch"
        | "dinner"
        | "pool"
        | "bar"
        | "spa"
        | "gym"
        | "checkin"
        | "checkout"
        | "amenity"
      message_role: "guest" | "assistant" | "system"
      policy_kind: "pets" | "smoking" | "cancellation" | "payment" | "noise"
      publish_state: "draft" | "published" | "archived"
      subscription_tier: "free" | "standard" | "featured" | "exclusive"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      booking_status: ["pending", "confirmed", "cancelled", "no_show"],
      commission_state: ["accrued", "invoiced", "paid"],
      confirmation_source: ["partner_webhook", "manual", "self_reported"],
      hotel_role: ["owner", "manager", "staff"],
      hours_entity_type: [
        "reception",
        "breakfast",
        "lunch",
        "dinner",
        "pool",
        "bar",
        "spa",
        "gym",
        "checkin",
        "checkout",
        "amenity",
      ],
      message_role: ["guest", "assistant", "system"],
      policy_kind: ["pets", "smoking", "cancellation", "payment", "noise"],
      publish_state: ["draft", "published", "archived"],
      subscription_tier: ["free", "standard", "featured", "exclusive"],
    },
  },
} as const
