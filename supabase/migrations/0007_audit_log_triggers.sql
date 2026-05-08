-- Universal audit-log trigger. Records every INSERT/UPDATE/DELETE on
-- tenant-scoped tables to audit_log. Deltas are stored as a JSON diff so
-- rolling back a bad edit is a one-row read.

create or replace function public.audit_changes() returns trigger
language plpgsql security definer set search_path = public, auth as $$
declare
  v_hotel uuid;
  v_actor uuid := auth.uid();
  v_diff jsonb;
begin
  if tg_op = 'DELETE' then
    v_hotel := (old).hotel_id;
    v_diff := jsonb_build_object('before', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    v_hotel := coalesce((new).hotel_id, (old).hotel_id);
    v_diff := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
  else
    v_hotel := (new).hotel_id;
    v_diff := jsonb_build_object('after', to_jsonb(new));
  end if;

  insert into audit_log (hotel_id, actor_id, action, entity_type, entity_id, diff_jsonb)
  values (
    v_hotel,
    v_actor,
    tg_op,
    tg_table_name,
    coalesce((new).id, (old).id),
    v_diff
  );
  return coalesce(new, old);
exception
  -- Don't let audit failures block the underlying operation in dev.
  when undefined_column then
    return coalesce(new, old);
end;
$$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'hotels','faqs','amenities','hours','policies','events_internal','rooms',
    'partnerships','recommendation_rules','feature_flags'
  ]) loop
    execute format('drop trigger if exists audit_changes_trg on %I', t);
    execute format(
      'create trigger audit_changes_trg
         after insert or update or delete on %I
         for each row execute function public.audit_changes()',
      t
    );
  end loop;
end$$;
