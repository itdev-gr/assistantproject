-- pgTAP RLS tests. Run with: supabase test db
-- Verifies that cross-tenant access is rejected on every scoped table.

begin;
select plan(8);

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

select * from finish();
rollback;
