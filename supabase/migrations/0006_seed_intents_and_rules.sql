-- Seed the intent taxonomy. Keywords mirror the TS DEFAULT_INTENTS but the DB
-- copy is what runs in production once the admin UI lets it be edited per hotel.

insert into intents (slug, description, keywords_el, keywords_en, requires_partner_search, is_out_of_scope) values
  ('ask_checkin', 'Check-in time', '{τσεκ ιν,check in,αφιξη}', '{check in,check-in,arrival,arrive}', false, false),
  ('ask_checkout', 'Check-out time', '{τσεκ αουτ,check out,αναχωρηση}', '{check out,check-out,departure,leave}', false, false),
  ('ask_wifi', 'Wi-Fi password', '{wifi,ασυρματο,ιντερνετ,κωδικος}', '{wifi,wi-fi,internet,password,network}', false, false),
  ('ask_breakfast', 'Breakfast hours', '{πρωινο,breakfast}', '{breakfast,morning meal}', false, false),
  ('ask_amenity_hours', 'Amenity hours', '{πισινα,σπα,γυμναστηριο,μπαρ ξενοδοχειου}', '{pool,spa,gym,hotel bar,opening hours}', false, false),
  ('ask_policy', 'Property policies', '{καπνισμα,κατοικιδια,σκυλο,ακυρωση,πληρωμη}', '{smoking,pets,dog,cancellation,cancel,payment method}', false, false),
  ('ask_room_info', 'Room info', '{δωματιο,θεα,οροφος}', '{room,view,floor}', false, false),
  ('recommend_restaurant', 'Restaurant recommendation', '{εστιατοριο,ταβερνα,φαγητο,γευμα,δειπνο}', '{restaurant,tavern,food,eat,dinner,lunch}', true, false),
  ('recommend_bar', 'Bar/cafe recommendation', '{μπαρ,καφε,ποτο,cocktail}', '{bar,cafe,coffee,drink,cocktail,pub}', true, false),
  ('recommend_activity', 'Activity recommendation', '{εκδρομη,βαρκα,κρουαζιερα,δραστηριοτητα,περιηγηση,αξιοθεατο}', '{tour,excursion,boat,cruise,activity,sightseeing}', true, false),
  ('recommend_taxi', 'Taxi/transfer', '{ταξι,μεταφορα,αεροδρομιο}', '{taxi,transfer,airport,ride}', true, false),
  ('recommend_shop', 'Shop recommendation', '{μαγαζι,καταστημα,σουπερ μαρκετ,ψωνια}', '{shop,store,supermarket,shopping,buy}', true, false),
  ('recommend_event', 'Event recommendation', '{εκδηλωση,γιορτη,φεστιβαλ,συναυλια}', '{event,festival,concert,celebration}', true, false),
  ('staff_request', 'Wants to talk to staff', '{ρεσεψιον,υπαλληλος,βοηθεια,προβλημα}', '{reception,staff,help,problem,human}', false, false),
  ('smalltalk', 'Greeting / thanks', '{γεια,καλημερα,ευχαριστω}', '{hi,hello,hey,thanks,thank you}', false, false),
  ('out_of_scope', 'Outside assistant scope', '{}', '{}', false, true)
on conflict (slug) do nothing;

-- Global default rules row (hotel_id = null)
insert into recommendation_rules
  (hotel_id, semantic_weight, proximity_weight, time_match_weight, category_weight,
   preference_weight, partner_bias_weight, distance_penalty_per_km, proximity_scale_km,
   tier_multipliers, max_results)
values
  (null, 1.0, 1.5, 1.0, 0.8, 0.5, 0.5, 0.05, 2.0,
   '{"free":1.0,"standard":1.15,"featured":1.4,"exclusive":1.7}'::jsonb, 5)
on conflict (hotel_id) do nothing;

-- Seed root business categories
insert into business_categories (slug, name_i18n, parent_id) values
  ('restaurants', '{"el":"Εστιατόρια","en":"Restaurants"}', null),
  ('bars-cafes', '{"el":"Μπαρ & Καφέ","en":"Bars & Cafés"}', null),
  ('activities', '{"el":"Δραστηριότητες","en":"Activities"}', null),
  ('boat-trips', '{"el":"Εκδρομές με βάρκα","en":"Boat Trips"}', null),
  ('taxis', '{"el":"Ταξί & Μεταφορές","en":"Taxis & Transfers"}', null),
  ('shops', '{"el":"Καταστήματα","en":"Shops"}', null),
  ('events', '{"el":"Εκδηλώσεις","en":"Events"}', null)
on conflict (slug) do nothing;
