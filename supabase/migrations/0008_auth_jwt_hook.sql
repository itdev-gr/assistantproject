-- Custom Auth Hook that injects role and hotel_id claims into the user JWT.
-- Wire it up in Supabase: Auth → Hooks → "Custom Access Token" → public.custom_access_token_hook.
-- Docs: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  v_user_id uuid := (event->>'user_id')::uuid;
  v_claims jsonb := coalesce(event->'claims', '{}'::jsonb);
  v_role text;
  v_hotel uuid;
begin
  if exists (select 1 from public.super_admins where auth_user_id = v_user_id) then
    v_claims := v_claims || jsonb_build_object('aga_role', 'super_admin');
  end if;

  select role::text, hotel_id
    into v_role, v_hotel
  from public.hotel_users
  where auth_user_id = v_user_id
  order by created_at asc
  limit 1;

  if v_role is not null then
    v_claims := v_claims || jsonb_build_object('aga_role', v_role, 'hotel_id', v_hotel);
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
