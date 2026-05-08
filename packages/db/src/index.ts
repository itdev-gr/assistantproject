export type { Database, Json } from './database.types.js';

export const TABLES = {
  hotels: 'hotels',
  hotelUsers: 'hotel_users',
  superAdmins: 'super_admins',
  faqs: 'faqs',
  amenities: 'amenities',
  hours: 'hours',
  policies: 'policies',
  eventsInternal: 'events_internal',
  rooms: 'rooms',
  guestSessions: 'guest_sessions',
  messages: 'messages',
  businessCategories: 'business_categories',
  businesses: 'businesses',
  businessOfferings: 'business_offerings',
  partnerships: 'partnerships',
  referrals: 'referrals',
  bookings: 'bookings',
  commissionEvents: 'commission_events',
  recommendationRules: 'recommendation_rules',
  intents: 'intents',
  featureFlags: 'feature_flags',
  auditLog: 'audit_log',
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
