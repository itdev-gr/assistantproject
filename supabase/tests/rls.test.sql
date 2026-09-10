-- pgTAP RLS tests. Run with: supabase test db
-- Verifies that cross-tenant access is rejected on every scoped table.

begin;
select plan(28);

-- Set up two hotels with separate auth users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a01', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-000000000b01', 'owner-b@example.com')
on conflict do nothing;

insert into hotels (id, slug, name) values
  ('00000000-0000-0000-0000-00000000aaaa', 'hotel-a', 'Hotel A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'hotel-b', 'Hotel B')
on conflict do nothing;

insert into hotel_users (hotel_id, auth_user_id, role, email) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-000000000a01', 'owner', 'owner-a@example.com'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-000000000b01', 'owner', 'owner-b@example.com')
on conflict do nothing;

insert into faqs (hotel_id, locale, question, answer) values
  ('00000000-0000-0000-0000-00000000aaaa', 'en', 'A check-in?', '15:00'),
  ('00000000-0000-0000-0000-00000000bbbb', 'en', 'B check-in?', '14:00')
on conflict do nothing;

-- As owner A
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000a01';

select is(
  (select count(*)::int from faqs where hotel_id = '00000000-0000-0000-0000-00000000aaaa'),
  1,
  'owner A sees own FAQ'
);

select is(
  (select count(*)::int from faqs where hotel_id = '00000000-0000-0000-0000-00000000bbbb'),
  0,
  'owner A cannot see hotel B FAQ'
);

select is(
  (select count(*)::int from hotels where id = '00000000-0000-0000-0000-00000000bbbb'),
  0,
  'owner A cannot select hotel B row'
);

-- As owner B
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000b01';

select is(
  (select count(*)::int from faqs where hotel_id = '00000000-0000-0000-0000-00000000bbbb'),
  1,
  'owner B sees own FAQ'
);

select is(
  (select count(*)::int from faqs where hotel_id = '00000000-0000-0000-0000-00000000aaaa'),
  0,
  'owner B cannot see hotel A FAQ'
);

-- Anonymous
set local role anon;
set local "request.jwt.claim.sub" = null;

select is(
  (select count(*)::int from faqs),
  0,
  'anon cannot directly read faqs'
);

select is(
  (select count(*)::int from partnerships),
  0,
  'anon cannot read partnerships (commission/priority must not leak)'
);

select is(
  (select count(*)::int from public.public_hotels where slug = 'hotel-a'),
  1,
  'anon can read public_hotels view'
);

-- ============================================================================
-- Self-serve accounts (0014): profiles, user library, business ownership.
-- ============================================================================
reset role;

-- Two visitors; the auth.users trigger seeds their profiles.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000c01', 'visitor-c@example.com', '{"role":"user","display_name":"C"}'::jsonb),
  ('00000000-0000-0000-0000-000000000d01', 'partner-d@example.com', '{"role":"partner","business_name":"D Taverna","business_phone":"123456"}'::jsonb)
on conflict do nothing;

insert into business_categories (id, slug, name_i18n) values
  ('00000000-0000-0000-0000-00000000cc01', 'test-cat', '{"en":"Test"}'::jsonb)
on conflict do nothing;

insert into businesses (id, name, category_id, lat, lng, address, verified, active) values
  ('00000000-0000-0000-0000-00000000bb01', 'Owned Place', '00000000-0000-0000-0000-00000000cc01', 37.0, 25.0, 'Somewhere', true, true),
  ('00000000-0000-0000-0000-00000000bb02', 'Other Place', '00000000-0000-0000-0000-00000000cc01', 37.0, 25.0, 'Elsewhere', true, true)
on conflict do nothing;

-- Partner D owns business bb01.
insert into business_owners (auth_user_id, business_id) values
  ('00000000-0000-0000-0000-000000000d01', '00000000-0000-0000-0000-00000000bb01')
on conflict do nothing;

select is(
  (select role::text from profiles where id = '00000000-0000-0000-0000-000000000c01'),
  'user',
  'signup trigger creates a user profile'
);

select is(
  (select count(*)::int from partner_applications where user_id = '00000000-0000-0000-0000-000000000d01' and status = 'pending'),
  1,
  'signup trigger creates a pending partner application'
);

-- As visitor C
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000c01';

insert into user_favorites (user_id, business_id) values
  ('00000000-0000-0000-0000-000000000c01', '00000000-0000-0000-0000-00000000bb01');

select is(
  (select count(*)::int from user_favorites),
  1,
  'visitor C sees own favourite'
);

select throws_ok(
  $$update profiles set role = 'partner' where id = '00000000-0000-0000-0000-000000000c01'$$,
  '42501',
  null,
  'visitor cannot change own role (column grant)'
);

select lives_ok(
  $$update profiles set display_name = 'Visitor C' where id = '00000000-0000-0000-0000-000000000c01'$$,
  'visitor can update own display name'
);

-- As partner D
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000d01';

select is(
  (select count(*)::int from user_favorites),
  0,
  'partner D cannot see visitor C favourites'
);

select lives_ok(
  $$update businesses set name = 'Owned Place (edited)' where id = '00000000-0000-0000-0000-00000000bb01'$$,
  'owner can update own business name'
);

select throws_ok(
  $$update businesses set verified = false where id = '00000000-0000-0000-0000-00000000bb01'$$,
  '42501',
  null,
  'owner cannot flip verified (column grant)'
);

select is(
  (with u as (
     update businesses set name = 'hijack' where id = '00000000-0000-0000-0000-00000000bb02' returning 1
   ) select count(*)::int from u),
  0,
  'owner cannot update a business they do not own'
);

-- Anonymous
set local role anon;
set local "request.jwt.claim.sub" = null;

select is(
  (select count(*)::int from partner_applications),
  0,
  'anon cannot read partner applications'
);

-- ============================================================================
-- Partnership connection requests (0015).
-- ============================================================================
reset role;

-- Partner D becomes an approved partner so the business side can send too.
update profiles set partner_status = 'approved' where id = '00000000-0000-0000-0000-000000000d01';

-- As owner A: send hotel A -> business bb01 with a proposed commission.
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000a01';

select lives_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bb01',
      'hotel', 'Would love to recommend you to our guests.', 12, '10% off with the hotel QR')$$,
  'owner A can send a hotel -> business request'
);

select throws_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bb01',
      'hotel', 'Again please', null, null)$$,
  'P0001', 'already_pending',
  'second pending request for the same pair is rejected'
);

select throws_ok(
  $$select public.accept_partnership_request(
      (select id from partnership_requests where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and status = 'pending'))$$,
  'P0001', 'forbidden',
  'the sender cannot accept their own request'
);

select throws_ok(
  $$insert into partnership_requests (hotel_id, business_id, initiated_by, message)
    values ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bb02', 'hotel', 'direct insert')$$,
  '42501', null,
  'direct inserts into partnership_requests are not allowed'
);

-- As owner B: cannot see hotel A's request.
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000b01';

select is(
  (select count(*)::int from partnership_requests),
  0,
  'owner B cannot see hotel A requests'
);

-- As partner D (owner of bb01): sees it, cannot accept one for bb02, and accepts it.
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000d01';

select is(
  (select count(*)::int from partnership_requests where business_id = '00000000-0000-0000-0000-00000000bb01' and status = 'pending'),
  1,
  'partner D sees the incoming request for their business'
);

select throws_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bb01',
      'business', 'Let us work together', null, null)$$,
  'P0001', 'reverse_pending',
  'the receiving side is told a request is already waiting for them'
);

select lives_ok(
  $$select public.accept_partnership_request(
      (select id from partnership_requests where business_id = '00000000-0000-0000-0000-00000000bb01' and status = 'pending'))$$,
  'partner D can accept the hotel request'
);

reset role;
select is(
  (select active from partnerships where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and business_id = '00000000-0000-0000-0000-00000000bb01'),
  true,
  'accepting creates an active partnership'
);
select is(
  (select commission_pct::numeric from partnerships where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and business_id = '00000000-0000-0000-0000-00000000bb01'),
  12::numeric,
  'accepting applies the proposed commission'
);
select is(
  (select status::text from partnership_requests where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and business_id = '00000000-0000-0000-0000-00000000bb01'),
  'accepted',
  'the request is marked accepted'
);

-- As partner D again: cannot re-request while connected; can send business -> hotel B.
set local role authenticated;
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000d01';

select throws_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-00000000bb01',
      'business', 'Connect again?', null, null)$$,
  'P0001', 'already_connected',
  'no new request while a partnership is active'
);

select lives_ok(
  $$select public.create_partnership_request(
      '00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-00000000bb01',
      'business', 'We would love to be recommended to your guests.', null, null)$$,
  'approved partner can send a business -> hotel request'
);

-- Owner A disconnects; the partnership row survives but is inactive.
set local "request.jwt.claim.sub" = '00000000-0000-0000-0000-000000000a01';
select lives_ok(
  $$select public.disconnect_partnership(
      (select id from partnerships where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and business_id = '00000000-0000-0000-0000-00000000bb01'))$$,
  'hotel owner can disconnect'
);
reset role;
select is(
  (select active from partnerships where hotel_id = '00000000-0000-0000-0000-00000000aaaa' and business_id = '00000000-0000-0000-0000-00000000bb01'),
  false,
  'disconnect deactivates instead of deleting'
);

select * from finish();
rollback;
