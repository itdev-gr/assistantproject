-- Demo seed for local development. Idempotent: re-running clears the demo
-- hotel and reinserts. Real production data is loaded via the admin UI.

begin;

-- Clean previous demo
delete from hotels where slug = 'aegean-blue';
-- (cascades take care of content, sessions, partnerships referencing it)

-- ============================================================================
-- Demo hotel (Naxos, Greece)
-- ============================================================================
with h as (
  insert into hotels (id, slug, name, timezone, lat, lng, default_locale, subscription_tier, brand_json)
  values (
    '00000000-0000-0000-0000-00000000aaaa',
    'aegean-blue',
    'Aegean Blue Suites',
    'Europe/Athens',
    37.1036, 25.3756,
    'el',
    'standard',
    '{"primaryColor":"#0c8ec5","logoUrl":null}'::jsonb
  )
  returning id
)
select * from h;

-- ============================================================================
-- Hours (check-in 15:00, check-out 11:00, breakfast 07:30–10:30 daily)
-- ============================================================================
insert into hours (hotel_id, entity_type, weekday, opens, closes)
select '00000000-0000-0000-0000-00000000aaaa', 'checkin', d, '15:00', '23:00'
  from generate_series(0,6) d
union all
select '00000000-0000-0000-0000-00000000aaaa', 'checkout', d, '07:00', '11:00'
  from generate_series(0,6) d
union all
select '00000000-0000-0000-0000-00000000aaaa', 'breakfast', d, '07:30', '10:30'
  from generate_series(0,6) d
union all
select '00000000-0000-0000-0000-00000000aaaa', 'pool', d, '08:00', '20:00'
  from generate_series(0,6) d
union all
select '00000000-0000-0000-0000-00000000aaaa', 'reception', d, '00:00', '23:59'
  from generate_series(0,6) d;

-- ============================================================================
-- Amenities
-- ============================================================================
insert into amenities (hotel_id, name, description, location_on_property, state) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Πισίνα / Pool', 'Outdoor heated pool with sea view', 'Roof terrace', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'Pool Bar', 'Snacks and cocktails by the pool', 'Pool deck', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'Parking', 'Free private parking', 'Ground level', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'Wi-Fi', 'High-speed Wi-Fi throughout the property', 'All areas', 'published');

-- ============================================================================
-- Policies
-- ============================================================================
insert into policies (hotel_id, kind, locale, body, state) values
  ('00000000-0000-0000-0000-00000000aaaa', 'pets', 'en', 'Small pets up to 8kg are welcome at no extra charge.', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'pets', 'el', 'Δεχόμαστε μικρά κατοικίδια έως 8 κιλά χωρίς επιπλέον χρέωση.', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'smoking', 'en', 'Non-smoking property. Smoking is allowed on private balconies.', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'smoking', 'el', 'Δεν επιτρέπεται το κάπνισμα στους εσωτερικούς χώρους. Επιτρέπεται στα ιδιωτικά μπαλκόνια.', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'cancellation', 'en', 'Free cancellation up to 7 days before arrival.', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'cancellation', 'el', 'Δωρεάν ακύρωση έως 7 ημέρες πριν την άφιξη.', 'published');

-- ============================================================================
-- Rooms
-- ============================================================================
insert into rooms (hotel_id, code, floor, view, wifi_password_secret) values
  ('00000000-0000-0000-0000-00000000aaaa', '101', 1, 'sea', 'aegean2026'),
  ('00000000-0000-0000-0000-00000000aaaa', '102', 1, 'sea', 'aegean2026'),
  ('00000000-0000-0000-0000-00000000aaaa', '201', 2, 'sea', 'aegean2026'),
  ('00000000-0000-0000-0000-00000000aaaa', '202', 2, 'garden', 'aegean2026'),
  ('00000000-0000-0000-0000-00000000aaaa', '301', 3, 'sea', 'aegean2026');

-- ============================================================================
-- FAQs (30 entries, EL + EN mixed)
-- ============================================================================
insert into faqs (hotel_id, locale, question, answer, intent_slug, tags, state) values
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'What time is check-in?', 'Check-in starts at 15:00.', 'ask_checkin', '{checkin}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Τι ώρα είναι το check-in;', 'Το check-in ξεκινά στις 15:00.', 'ask_checkin', '{checkin}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'What time is check-out?', 'Check-out is by 11:00.', 'ask_checkout', '{checkout}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Τι ώρα είναι το check-out;', 'Το check-out είναι μέχρι τις 11:00.', 'ask_checkout', '{checkout}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'What is the Wi-Fi password?', 'Network: AegeanBlue. Password: aegean2026.', 'ask_wifi', '{wifi}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Ποιος είναι ο κωδικός Wi-Fi;', 'Δίκτυο: AegeanBlue. Κωδικός: aegean2026.', 'ask_wifi', '{wifi}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'When is breakfast served?', 'Breakfast is served from 07:30 to 10:30.', 'ask_breakfast', '{breakfast}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Τι ώρα είναι το πρωινό;', 'Το πρωινό σερβίρεται από τις 07:30 έως τις 10:30.', 'ask_breakfast', '{breakfast}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Is there a pool?', 'Yes, there is a heated outdoor pool open 08:00–20:00.', 'ask_amenity_hours', '{pool}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Υπάρχει πισίνα;', 'Ναι, υπάρχει θερμαινόμενη πισίνα ανοιχτή 08:00–20:00.', 'ask_amenity_hours', '{pool}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Is parking available?', 'Yes, free private parking is available on-site.', 'ask_amenity_hours', '{parking}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Υπάρχει πάρκινγκ;', 'Ναι, διαθέτουμε δωρεάν ιδιωτικό πάρκινγκ.', 'ask_amenity_hours', '{parking}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Are pets allowed?', 'Small pets up to 8kg are welcome at no extra charge.', 'ask_policy', '{pets}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Επιτρέπονται κατοικίδια;', 'Δεχόμαστε μικρά κατοικίδια έως 8 κιλά χωρίς επιπλέον χρέωση.', 'ask_policy', '{pets}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Can I smoke in the room?', 'Smoking is not permitted indoors. Private balconies are fine.', 'ask_policy', '{smoking}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Επιτρέπεται το κάπνισμα στο δωμάτιο;', 'Το κάπνισμα δεν επιτρέπεται στους εσωτερικούς χώρους. Επιτρέπεται στα ιδιωτικά μπαλκόνια.', 'ask_policy', '{smoking}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'How do I cancel?', 'Free cancellation up to 7 days before arrival.', 'ask_policy', '{cancellation}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Πώς ακυρώνω την κράτηση;', 'Δωρεάν ακύρωση έως 7 ημέρες πριν την άφιξη.', 'ask_policy', '{cancellation}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Do you accept credit cards?', 'Yes, we accept all major credit cards.', 'ask_policy', '{payment}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Δέχεστε πιστωτικές κάρτες;', 'Ναι, δεχόμαστε όλες τις βασικές πιστωτικές κάρτες.', 'ask_policy', '{payment}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Can I have an early check-in?', 'Early check-in depends on availability — please contact reception.', 'ask_checkin', '{checkin,early}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Μπορώ να κάνω νωρίς check-in;', 'Το νωρίς check-in εξαρτάται από τη διαθεσιμότητα — επικοινωνήστε με τη ρεσεψιόν.', 'ask_checkin', '{checkin,early}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Is there a gym?', 'We do not have a gym, but reception can recommend nearby options.', 'ask_amenity_hours', '{gym}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Έχετε γυμναστήριο;', 'Δεν διαθέτουμε γυμναστήριο, αλλά η ρεσεψιόν μπορεί να σας προτείνει επιλογές κοντά μας.', 'ask_amenity_hours', '{gym}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Is there a beach nearby?', 'Yes, Agios Prokopios beach is a 10-minute walk.', 'ask_room_info', '{beach}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Υπάρχει παραλία κοντά;', 'Ναι, η παραλία του Αγίου Προκοπίου απέχει 10 λεπτά με τα πόδια.', 'ask_room_info', '{beach}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'Do you offer airport transfers?', 'Yes — we work with a trusted local taxi partner. Ask me to arrange one.', 'recommend_taxi', '{transfer}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Έχετε μεταφορά από/προς το αεροδρόμιο;', 'Ναι — συνεργαζόμαστε με αξιόπιστο τοπικό ταξί. Ζητήστε μου να κανονίσω.', 'recommend_taxi', '{transfer}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'How far is the town centre?', 'Naxos Town (Chora) is approximately 4 km away.', 'ask_room_info', '{location}', 'published'),
  ('00000000-0000-0000-0000-00000000aaaa', 'el', 'Πόσο μακριά είναι η Χώρα;', 'Η Χώρα της Νάξου απέχει περίπου 4 χιλιόμετρα.', 'ask_room_info', '{location}', 'published');

-- ============================================================================
-- 25 partner businesses across categories
-- ============================================================================
with cats as (
  select slug, id from business_categories
)
insert into businesses (id, name, category_id, description_i18n, lat, lng, address, phone, website, price_band, tags, opening_hours_json, images, verified, active)
select gen_random_uuid(), b.name, c.id, b.descr, b.lat, b.lng, b.address, b.phone, b.website, b.pb, b.tags, '{}'::jsonb, '[]'::jsonb, true, true
from (values
  -- Restaurants (8)
  ('Taverna Apolafsi',       'restaurants', '{"el":"Παραδοσιακή ταβέρνα με ψάρι και θαλασσινά","en":"Traditional tavern with fresh seafood"}'::jsonb,         37.1051, 25.3779, 'Agios Prokopios, Naxos', '+302285023456', 'https://example.com/apolafsi', 2, '{seafood,traditional,family}'),
  ('Mezedopolio Pelagos',    'restaurants', '{"el":"Μεζεδοπωλείο δίπλα στη θάλασσα","en":"Seaside meze bar"}'::jsonb,                                            37.1042, 25.3768, 'Beach road, Naxos',     '+302285023111', null, 2, '{meze,seafood,sea-view}'),
  ('La Pasta Italiana',      'restaurants', '{"el":"Ιταλική κουζίνα και χειροποίητα ζυμαρικά","en":"Authentic Italian and fresh handmade pasta"}'::jsonb,         37.1078, 25.3812, 'Naxos Town centre',    '+302285023222', null, 3, '{italian,pasta,vegetarian}'),
  ('Souvlaki Spot',          'restaurants', '{"el":"Σουβλάκι και γρήγορο φαγητό","en":"Quick souvlaki and Greek street food"}'::jsonb,                              37.1080, 25.3815, 'Naxos Town',           '+302285023333', null, 1, '{souvlaki,quick,casual}'),
  ('Sunset Grill',           'restaurants', '{"el":"Grill με θέα στο ηλιοβασίλεμα","en":"Grill house with sunset views"}'::jsonb,                                 37.1095, 25.3833, 'Plaka, Naxos',         '+302285023444', null, 3, '{grill,romantic,sunset}'),
  ('Veggie Garden',          'restaurants', '{"el":"Vegetarian και vegan επιλογές","en":"Vegetarian & vegan focused"}'::jsonb,                                    37.1060, 25.3790, 'Naxos Town',           '+302285023555', null, 2, '{vegetarian,vegan,healthy}'),
  ('Bakaliko Naxos',         'restaurants', '{"el":"Τοπικά προϊόντα και ντόπια κουζίνα","en":"Local products and home cooking"}'::jsonb,                          37.1071, 25.3801, 'Old Market, Naxos',    '+302285023666', null, 2, '{local,traditional}'),
  ('Sushi Aegean',           'restaurants', '{"el":"Σύγχρονο sushi με μεσογειακό άρωμα","en":"Modern sushi with Mediterranean twist"}'::jsonb,                    37.1085, 25.3820, 'Marina, Naxos',        '+302285023777', null, 4, '{sushi,modern}'),
  -- Bars & cafes (5)
  ('Cafe Plateia',           'bars-cafes',  '{"el":"Καφέ στην πλατεία της Χώρας","en":"Cafe on the main square"}'::jsonb,                                          37.1075, 25.3805, 'Main Square, Naxos',   '+302285024111', null, 1, '{coffee,breakfast,wifi}'),
  ('Sea & Bar',              'bars-cafes',  '{"el":"Cocktail bar μπροστά στη θάλασσα","en":"Cocktail bar by the sea"}'::jsonb,                                    37.1040, 25.3760, 'Beach road, Naxos',    '+302285024222', null, 3, '{cocktails,sea-view,sunset}'),
  ('Naxos Roastery',          'bars-cafes',  '{"el":"Specialty coffee από τοπικό roaster","en":"Specialty coffee from local roaster"}'::jsonb,                     37.1080, 25.3810, 'Naxos Town',           '+302285024333', null, 2, '{coffee,specialty,wifi}'),
  ('Wine & Olive',            'bars-cafes',  '{"el":"Wine bar με τοπικά κρασιά","en":"Wine bar featuring local Aegean wines"}'::jsonb,                              37.1083, 25.3818, 'Old Town',             '+302285024444', null, 3, '{wine,local,romantic}'),
  ('Beach Lounge 33',         'bars-cafes',  '{"el":"Beach lounge bar με ξαπλώστρες","en":"Beach lounge with sunbeds"}'::jsonb,                                     37.1035, 25.3755, 'Agios Prokopios beach','+302285024555', null, 2, '{beach,lounge,music}'),
  -- Activities (5)
  ('Naxos Hiking Tours',     'activities',  '{"el":"Πεζοπορίες σε Ζα και Φιλώτι","en":"Guided hikes including Mt Zas and Filoti"}'::jsonb,                          37.0700, 25.4900, 'Pickup at hotel',      '+302285025111', null, 2, '{hiking,nature,outdoor}'),
  ('Aegean Diving',          'activities',  '{"el":"Σχολή κατάδυσης για όλα τα επίπεδα","en":"Diving school for all levels"}'::jsonb,                              37.1010, 25.3700, 'Agia Anna',            '+302285025222', null, 3, '{diving,water,adventure}'),
  ('Olive Press Tour',       'activities',  '{"el":"Επίσκεψη σε παραδοσιακό ελαιοτριβείο","en":"Visit a traditional olive press"}'::jsonb,                          37.0500, 25.4500, 'Damalas village',      '+302285025333', null, 2, '{cultural,family,food}'),
  ('Pottery Workshop',       'activities',  '{"el":"Μάθημα κεραμικής","en":"Hands-on pottery workshop"}'::jsonb,                                                    37.0850, 25.4200, 'Halki village',        '+302285025444', null, 2, '{art,family,indoor}'),
  ('Naxos Wine Tasting',     'activities',  '{"el":"Γευσιγνωσία τοπικών κρασιών","en":"Tasting of indigenous Naxian wines"}'::jsonb,                              37.1070, 25.3805, 'Naxos Town',           '+302285025555', null, 3, '{wine,cultural,romantic}'),
  -- Boat trips (3)
  ('Sunset Sail Naxos',      'boat-trips',  '{"el":"Ιστιοπλοϊκές κρουαζιέρες ηλιοβασιλέματος","en":"Sailing sunset cruises"}'::jsonb,                              37.1100, 25.3700, 'Naxos Marina',         '+302285026111', null, 4, '{sailing,sunset,romantic}'),
  ('Small Cyclades Day Trip','boat-trips',  '{"el":"Ημερήσια εκδρομή στις Μικρές Κυκλάδες","en":"Day trip to the Small Cyclades"}'::jsonb,                         37.1100, 25.3700, 'Naxos Marina',         '+302285026222', null, 3, '{day-trip,islands,family}'),
  ('Speedboat Adventure',    'boat-trips',  '{"el":"Ταχύπλοο σε απομονωμένες παραλίες","en":"Speedboat to hidden beaches"}'::jsonb,                                37.1100, 25.3700, 'Naxos Marina',         '+302285026333', null, 4, '{speedboat,beach,private}'),
  -- Taxis (2)
  ('Naxos Taxi Express',     'taxis',       '{"el":"24ωρες μεταφορές, αεροδρόμιο και λιμάνι","en":"24/7 transfers, airport and port"}'::jsonb,                     37.1060, 25.3790, 'Pickup anywhere',      '+302285027111', null, 2, '{taxi,airport,24-7}'),
  ('Premium Transfers',      'taxis',       '{"el":"Πολυτελή οχήματα και ιδιωτικοί οδηγοί","en":"Premium vehicles and private drivers"}'::jsonb,                  37.1060, 25.3790, 'Pickup anywhere',      '+302285027222', null, 3, '{premium,private,airport}'),
  -- Shops (2)
  ('Cycladic Crafts',        'shops',       '{"el":"Χειροποίητα κυκλαδίτικα δώρα","en":"Handmade Cycladic souvenirs"}'::jsonb,                                     37.1080, 25.3810, 'Old Market, Naxos',    '+302285028111', null, 2, '{souvenirs,handmade,gifts}'),
  ('Mini Market 24/7',       'shops',       '{"el":"Σούπερ μάρκετ ανοιχτό 24 ώρες","en":"24-hour mini market"}'::jsonb,                                            37.1078, 25.3808, 'Naxos Town',           '+302285028222', null, 1, '{groceries,24-7}')
) as b(name, cat_slug, descr, lat, lng, address, phone, website, pb, tags)
join cats c on c.slug = b.cat_slug;

-- ============================================================================
-- 5 partnerships across all 4 tiers
-- ============================================================================
with picked as (
  select id, row_number() over (order by name) rn from businesses
)
insert into partnerships (hotel_id, business_id, commission_pct, paid_priority_score, subscription_tier, active, contract_starts)
select '00000000-0000-0000-0000-00000000aaaa', id, c, p, t::subscription_tier, true, current_date
from picked
join (values
  (1, 15.0, 90, 'exclusive'),
  (2, 12.0, 70, 'featured'),
  (3, 10.0, 50, 'featured'),
  (5,  8.0, 30, 'standard'),
  (8,  0.0,  0, 'free')
) as p(rn, c, p, t) on p.rn = picked.rn;

commit;
