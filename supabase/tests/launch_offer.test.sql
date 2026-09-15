-- pgTAP tests for the 2026 pricing migration (0018). Run with: supabase test db
--   * launch offer: first 50 hotels, atomic claim / release, ranks 1..50
--   * commission cap: partnership requests above 10% are rejected

begin;
select plan(11);

-- 51 hotels, none claimed yet.
insert into hotels (id, slug, name)
select
  ('00000000-0000-0000-0000-0000000010' || lpad(to_hex(i), 2, '0'))::uuid,
  'launch-hotel-' || i,
  'Launch Hotel ' || i
from generate_series(1, 51) as i
on conflict do nothing;

select is(
  (select public.launch_offer_remaining()),
  50,
  '50 launch slots available before any claim'
);

-- Claim for the first 50 hotels → ranks 1..50.
select is(
  (select array_agg(public.claim_launch_offer(('00000000-0000-0000-0000-0000000010' || lpad(to_hex(i), 2, '0'))::uuid) order by i)
     from generate_series(1, 50) as i),
  (select array_agg(i) from generate_series(1, 50) as i),
  'first 50 hotels get ranks 1..50'
);

select is(
  (select public.claim_launch_offer('00000000-0000-0000-0000-000000001033'::uuid)),
  null,
  'the 51st hotel gets no slot'
);

select is(
  (select public.launch_offer_remaining()),
  0,
  'no slots remain after 50 claims'
);

select is(
  (select public.claim_launch_offer('00000000-0000-0000-0000-000000001003'::uuid)),
  3,
  're-claiming returns the existing rank (idempotent)'
);

-- Release an unpaid claim, then the 51st hotel takes the freed rank.
select is(
  (select public.release_launch_offer('00000000-0000-0000-0000-000000001003'::uuid)),
  true,
  'an unpaid claim can be released'
);

select is(
  (select public.claim_launch_offer('00000000-0000-0000-0000-000000001033'::uuid)),
  3,
  'the freed rank is handed to the next hotel'
);

-- A paying hotel keeps its slot.
update hotels set billing_status = 'active' where id = '00000000-0000-0000-0000-000000001005'::uuid;
select is(
  (select public.release_launch_offer('00000000-0000-0000-0000-000000001005'::uuid)),
  false,
  'a paying hotel cannot lose its slot'
);

select is(
  (select count(*)::int from hotels where launch_offer_applied),
  50,
  'exactly 50 hotels hold a slot'
);

-- ===== Commission cap ======================================================
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001a01', 'owner-launch@example.com')
on conflict do nothing;
insert into hotel_users (hotel_id, auth_user_id, role, email) values
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001a01', 'owner', 'owner-launch@example.com')
on conflict do nothing;
insert into business_categories (id, slug, name_i18n) values
  ('00000000-0000-0000-0000-000000001c01', 'launch-cat', '{"en":"Test"}'::jsonb)
on conflict do nothing;
insert into businesses (id, name, category_id, lat, lng, address, verified, active, billing_exempt) values
  ('00000000-0000-0000-0000-000000001b01', 'Capped Place', '00000000-0000-0000-0000-000000001c01', 37.0, 25.0, 'Somewhere', true, true, true)
on conflict do nothing;

set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000001a01';

select throws_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001b01',
      'hotel', 'Let us work together please', 15, null)$$,
  'P0001',
  'invalid_input',
  'a 15% commission proposal is rejected'
);

select lives_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001b01',
      'hotel', 'Let us work together please', 10, null)$$,
  'a 10% commission proposal is accepted'
);

select * from finish();
rollback;
