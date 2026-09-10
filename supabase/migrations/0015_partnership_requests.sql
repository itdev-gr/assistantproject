-- ============================================================================
-- 0015: Partnership connection requests (hotel ⇄ business).
--
--   * partnerships.guest_offer       optional perk shown to guests in the assistant.
--   * partnership_requests           "let's work together" requests sent by a hotel
--                                    to a business or by a business to a hotel.
--                                    Only the receiving side (or a super admin)
--                                    accepts/declines. Requests are history; the
--                                    live connection is always partnerships.active.
--   * create/accept/decline/cancel_partnership_request(), disconnect_partnership()
--                                    security-definer RPCs — the ONLY write path.
--                                    They validate the actor with the existing
--                                    is_hotel_member / is_business_owner /
--                                    is_approved_partner / is_super_admin helpers
--                                    and keep status + partnership changes atomic.
--
-- Error codes raised by the RPCs (errcode P0001, message = code):
--   forbidden, not_pending, already_connected, already_pending,
--   reverse_pending, target_unavailable, invalid_input
-- ============================================================================

-- ===== Enums ===============================================================
do $$ begin
  create type connection_request_status as enum ('pending', 'accepted', 'declined', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type connection_initiator as enum ('hotel', 'business');
exception when duplicate_object then null; end $$;

-- ===== partnerships.guest_offer ============================================
alter table partnerships
  add column if not exists guest_offer text
  check (guest_offer is null or char_length(guest_offer) <= 200);

-- ===== Table ===============================================================
create table if not exists partnership_requests (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references hotels(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  initiated_by connection_initiator not null,
  requested_by uuid references auth.users(id) on delete set null,
  message text not null check (char_length(message) between 1 and 1000),
  proposed_commission_pct numeric(5,2)
    check (proposed_commission_pct is null or proposed_commission_pct between 0 and 100),
  guest_offer text check (guest_offer is null or char_length(guest_offer) <= 200),
  status connection_request_status not null default 'pending',
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 500),
  partnership_id uuid references partnerships(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open request per pair, whichever side sent it.
create unique index if not exists partnership_requests_one_pending
  on partnership_requests(hotel_id, business_id) where status = 'pending';
create index if not exists partnership_requests_hotel_idx
  on partnership_requests(hotel_id, status, created_at desc);
create index if not exists partnership_requests_business_idx
  on partnership_requests(business_id, status, created_at desc);

drop trigger if exists set_updated_at on partnership_requests;
create trigger set_updated_at before update on partnership_requests
  for each row execute function set_updated_at();

drop trigger if exists audit_changes_trg on partnership_requests;
create trigger audit_changes_trg
  after insert or update or delete on partnership_requests
  for each row execute function public.audit_changes();

-- ===== RLS: reads only; every write goes through the RPCs below ===========
alter table partnership_requests enable row level security;

drop policy if exists partnership_requests_super_admin_all on partnership_requests;
create policy partnership_requests_super_admin_all on partnership_requests for all
  using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists partnership_requests_hotel_select on partnership_requests;
create policy partnership_requests_hotel_select on partnership_requests for select
  using (public.is_hotel_member(hotel_id));

drop policy if exists partnership_requests_business_select on partnership_requests;
create policy partnership_requests_business_select on partnership_requests for select
  using (public.is_business_owner(business_id));

revoke insert, update, delete on partnership_requests from authenticated, anon;

-- ===== RPCs ================================================================

-- Send a request. `p_initiated_by` says which side the caller acts for.
create or replace function public.create_partnership_request(
  p_hotel_id uuid,
  p_business_id uuid,
  p_initiated_by connection_initiator,
  p_message text,
  p_commission numeric default null,
  p_offer text default null
) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_id uuid;
  v_existing partnership_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if p_initiated_by = 'hotel' then
    if not public.is_hotel_member(p_hotel_id) and not public.is_super_admin() then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  else
    if not (public.is_business_owner(p_business_id) and public.is_approved_partner())
       and not public.is_super_admin() then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  if p_message is null or char_length(btrim(p_message)) < 1 then
    raise exception 'invalid_input' using errcode = 'P0001';
  end if;

  -- Both parties must be live: an active hotel and an active, verified business.
  if not exists (select 1 from hotels h where h.id = p_hotel_id and h.active)
     or not exists (select 1 from businesses b where b.id = p_business_id and b.active and b.verified) then
    raise exception 'target_unavailable' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from partnerships p
    where p.hotel_id = p_hotel_id and p.business_id = p_business_id and p.active
  ) then
    raise exception 'already_connected' using errcode = 'P0001';
  end if;

  select * into v_existing from partnership_requests r
  where r.hotel_id = p_hotel_id and r.business_id = p_business_id and r.status = 'pending'
  limit 1;
  if found then
    if v_existing.initiated_by <> p_initiated_by then
      raise exception 'reverse_pending' using errcode = 'P0001';
    end if;
    raise exception 'already_pending' using errcode = 'P0001';
  end if;

  insert into partnership_requests
    (hotel_id, business_id, initiated_by, requested_by, message, proposed_commission_pct, guest_offer)
  values
    (p_hotel_id, p_business_id, p_initiated_by, auth.uid(), btrim(p_message),
     p_commission, nullif(btrim(coalesce(p_offer, '')), ''))
  returning id into v_id;

  return v_id;
end;
$$;

-- Lock a pending request and verify the caller may decide it (counterparty or admin).
create or replace function public._lock_partnership_request_for_decision(p_id uuid)
returns partnership_requests
language plpgsql security definer set search_path = public, auth as $$
declare
  v_req partnership_requests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_req from partnership_requests where id = p_id for update;
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  if not public.is_super_admin() then
    if v_req.initiated_by = 'hotel' then
      if not public.is_business_owner(v_req.business_id) then
        raise exception 'forbidden' using errcode = 'P0001';
      end if;
    else
      if not public.is_hotel_member(v_req.hotel_id) then
        raise exception 'forbidden' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return v_req;
end;
$$;
revoke execute on function public._lock_partnership_request_for_decision(uuid) from anon, public, authenticated;

-- Accept: creates or re-activates the partnership and returns its id.
create or replace function public.accept_partnership_request(p_id uuid) returns uuid
language plpgsql security definer set search_path = public, auth as $$
declare
  v_req partnership_requests%rowtype;
  v_partnership_id uuid;
begin
  v_req := public._lock_partnership_request_for_decision(p_id);

  insert into partnerships (hotel_id, business_id, commission_pct, subscription_tier, active, guest_offer)
  values (
    v_req.hotel_id,
    v_req.business_id,
    coalesce(v_req.proposed_commission_pct, 0),
    'free',
    true,
    v_req.guest_offer
  )
  on conflict (hotel_id, business_id) do update set
    active = true,
    commission_pct = coalesce(v_req.proposed_commission_pct, partnerships.commission_pct),
    guest_offer = coalesce(v_req.guest_offer, partnerships.guest_offer),
    subscription_tier = case
      when partnerships.billing_status = 'canceled' then 'free'::subscription_tier
      else partnerships.subscription_tier end,
    paid_priority_score = case
      when partnerships.billing_status = 'canceled' then 0
      else partnerships.paid_priority_score end
  returning id into v_partnership_id;

  update partnership_requests set
    status = 'accepted',
    decided_by = auth.uid(),
    decided_at = now(),
    partnership_id = v_partnership_id
  where id = p_id;

  return v_partnership_id;
end;
$$;

create or replace function public.decline_partnership_request(p_id uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_req partnership_requests%rowtype;
begin
  v_req := public._lock_partnership_request_for_decision(p_id);
  update partnership_requests set
    status = 'declined',
    decided_by = auth.uid(),
    decided_at = now(),
    decline_reason = nullif(btrim(coalesce(p_reason, '')), '')
  where id = p_id;
end;
$$;

-- Cancel: only the side that sent it (or a super admin), while still pending.
create or replace function public.cancel_partnership_request(p_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_req partnership_requests%rowtype;
  v_allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select * into v_req from partnership_requests where id = p_id for update;
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  v_allowed := public.is_super_admin()
    or (v_req.initiated_by = 'hotel' and public.is_hotel_member(v_req.hotel_id))
    or (v_req.initiated_by = 'business' and public.is_business_owner(v_req.business_id));
  if not v_allowed then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  update partnership_requests set
    status = 'cancelled',
    decided_by = auth.uid(),
    decided_at = now()
  where id = p_id;
end;
$$;

-- Disconnect: hotel owner or super admin deactivates the partnership. Never
-- deletes — referrals and commission events cascade on delete.
create or replace function public.disconnect_partnership(p_partnership_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  v_hotel uuid;
begin
  if auth.uid() is null then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select hotel_id into v_hotel from partnerships where id = p_partnership_id for update;
  if not found then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if not (public.is_hotel_owner(v_hotel) or public.is_super_admin()) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  update partnerships set active = false where id = p_partnership_id;
end;
$$;

revoke execute on function public.create_partnership_request(uuid, uuid, connection_initiator, text, numeric, text) from anon, public;
grant execute on function public.create_partnership_request(uuid, uuid, connection_initiator, text, numeric, text) to authenticated;
revoke execute on function public.accept_partnership_request(uuid) from anon, public;
grant execute on function public.accept_partnership_request(uuid) to authenticated;
revoke execute on function public.decline_partnership_request(uuid, text) from anon, public;
grant execute on function public.decline_partnership_request(uuid, text) to authenticated;
revoke execute on function public.cancel_partnership_request(uuid) from anon, public;
grant execute on function public.cancel_partnership_request(uuid) to authenticated;
revoke execute on function public.disconnect_partnership(uuid) from anon, public;
grant execute on function public.disconnect_partnership(uuid) to authenticated;
