-- ============================================================================
-- Enable RLS on every tenant-scoped table.
-- Anonymous guests have NO direct table access; all guest-facing reads happen
-- through Edge Functions using service-role and the signed session token, which
-- enforces tenant scope at the application layer. RLS here protects against
-- accidental SELECTs from an authenticated dashboard user crossing tenants.
-- ============================================================================

alter table hotels enable row level security;
alter table hotel_users enable row level security;
alter table super_admins enable row level security;
alter table faqs enable row level security;
alter table amenities enable row level security;
alter table hours enable row level security;
alter table policies enable row level security;
alter table events_internal enable row level security;
alter table rooms enable row level security;
alter table guest_sessions enable row level security;
alter table messages enable row level security;
alter table business_categories enable row level security;
alter table businesses enable row level security;
alter table business_offerings enable row level security;
alter table partnerships enable row level security;
alter table referrals enable row level security;
alter table bookings enable row level security;
alter table commission_events enable row level security;
alter table recommendation_rules enable row level security;
alter table intents enable row level security;
alter table feature_flags enable row level security;
alter table audit_log enable row level security;

-- ====== hotels ======
drop policy if exists hotels_super_admin_all on hotels;
create policy hotels_super_admin_all on hotels for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists hotels_member_select on hotels;
create policy hotels_member_select on hotels for select
  using (public.is_hotel_member(id));

drop policy if exists hotels_owner_update on hotels;
create policy hotels_owner_update on hotels for update
  using (public.is_hotel_owner(id)) with check (public.is_hotel_owner(id));

-- ====== hotel_users ======
drop policy if exists hotel_users_super_admin_all on hotel_users;
create policy hotel_users_super_admin_all on hotel_users for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists hotel_users_self_select on hotel_users;
create policy hotel_users_self_select on hotel_users for select
  using (auth_user_id = auth.uid() or public.is_hotel_owner(hotel_id));

drop policy if exists hotel_users_owner_manage on hotel_users;
create policy hotel_users_owner_manage on hotel_users for all
  using (public.is_hotel_owner(hotel_id))
  with check (public.is_hotel_owner(hotel_id));

-- ====== super_admins ======
drop policy if exists super_admins_self on super_admins;
create policy super_admins_self on super_admins for select
  using (auth_user_id = auth.uid());

-- ====== Property content (faqs, amenities, hours, policies, events_internal, rooms) ======
do $$
declare t text;
begin
  for t in select unnest(array['faqs','amenities','hours','policies','events_internal','rooms']) loop
    execute format($p$
      drop policy if exists %1$s_member_select on %1$s;
      create policy %1$s_member_select on %1$s for select using (public.is_hotel_member(hotel_id));
      drop policy if exists %1$s_member_write on %1$s;
      create policy %1$s_member_write on %1$s for all
        using (public.is_hotel_member(hotel_id))
        with check (public.is_hotel_member(hotel_id));
      drop policy if exists %1$s_super_admin on %1$s;
      create policy %1$s_super_admin on %1$s for all
        using (public.is_super_admin()) with check (public.is_super_admin());
    $p$, t);
  end loop;
end$$;

-- ====== Guests & messages ======
-- Direct table access restricted to staff/super-admin. Edge Function uses service role.
drop policy if exists guest_sessions_member_select on guest_sessions;
create policy guest_sessions_member_select on guest_sessions for select
  using (public.is_hotel_member(hotel_id) or public.is_super_admin());

drop policy if exists messages_member_select on messages;
create policy messages_member_select on messages for select
  using (
    public.is_super_admin() or
    exists (
      select 1 from guest_sessions s
      where s.id = messages.session_id and public.is_hotel_member(s.hotel_id)
    )
  );

-- ====== Partner network ======
-- Curated centrally; super-admin owns mutations. Hotel members read.
drop policy if exists business_categories_read_all on business_categories;
create policy business_categories_read_all on business_categories for select using (true);
drop policy if exists business_categories_super_admin on business_categories;
create policy business_categories_super_admin on business_categories for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists businesses_read_active on businesses;
create policy businesses_read_active on businesses for select
  using (active = true and verified = true or public.is_super_admin());
drop policy if exists businesses_super_admin on businesses;
create policy businesses_super_admin on businesses for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists offerings_read on business_offerings;
create policy offerings_read on business_offerings for select
  using (active = true or public.is_super_admin());
drop policy if exists offerings_super_admin on business_offerings;
create policy offerings_super_admin on business_offerings for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Partnerships: hotel members can read OWN partnerships. Mutations: super-admin only.
drop policy if exists partnerships_member_select on partnerships;
create policy partnerships_member_select on partnerships for select
  using (public.is_hotel_member(hotel_id) or public.is_super_admin());
drop policy if exists partnerships_super_admin on partnerships;
create policy partnerships_super_admin on partnerships for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- ====== Revenue ======
-- Hotel members read referrals/bookings/commission for their hotel via partnership.
drop policy if exists referrals_member_select on referrals;
create policy referrals_member_select on referrals for select
  using (
    public.is_super_admin() or
    exists (
      select 1 from partnerships p
      where p.id = referrals.partnership_id and public.is_hotel_member(p.hotel_id)
    )
  );

drop policy if exists bookings_member_select on bookings;
create policy bookings_member_select on bookings for select
  using (
    public.is_super_admin() or
    exists (
      select 1 from referrals r
      join partnerships p on p.id = r.partnership_id
      where r.id = bookings.referral_id and public.is_hotel_member(p.hotel_id)
    )
  );

drop policy if exists commission_member_select on commission_events;
create policy commission_member_select on commission_events for select
  using (
    public.is_super_admin() or
    exists (
      select 1 from partnerships p
      where p.id = commission_events.partnership_id and public.is_hotel_member(p.hotel_id)
    )
  );

-- ====== Configuration & ops ======
drop policy if exists rules_member on recommendation_rules;
create policy rules_member on recommendation_rules for select
  using (hotel_id is null or public.is_hotel_member(hotel_id) or public.is_super_admin());
drop policy if exists rules_super_admin on recommendation_rules;
create policy rules_super_admin on recommendation_rules for all
  using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists rules_owner on recommendation_rules;
create policy rules_owner on recommendation_rules for all
  using (public.is_hotel_owner(hotel_id)) with check (public.is_hotel_owner(hotel_id));

drop policy if exists intents_read_all on intents;
create policy intents_read_all on intents for select using (true);
drop policy if exists intents_super_admin on intents;
create policy intents_super_admin on intents for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists flags_read on feature_flags;
create policy flags_read on feature_flags for select
  using (hotel_id is null or public.is_hotel_member(hotel_id) or public.is_super_admin());
drop policy if exists flags_super_admin on feature_flags;
create policy flags_super_admin on feature_flags for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists audit_member_select on audit_log;
create policy audit_member_select on audit_log for select
  using (public.is_hotel_member(hotel_id) or public.is_super_admin());
