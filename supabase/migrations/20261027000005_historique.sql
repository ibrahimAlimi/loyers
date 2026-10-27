-- =====================================================================
-- Lot 1 - Historique des modifications (avant / après, champ par champ),
-- capté par déclencheurs. Lecture : super admin uniquement.
-- =====================================================================

set search_path = public, extensions;

create table historique_modifications (
  id bigserial primary key,
  table_nom text not null,
  ligne_id text not null,
  operation text not null,
  avant jsonb,
  apres jsonb,
  champs_modifies text[],
  par uuid default auth.uid(),
  le timestamptz not null default now(),
  espace_id uuid
);
create index historique_ligne_idx on historique_modifications (table_nom, ligne_id);
create index historique_espace_idx on historique_modifications (espace_id, le desc);
alter table historique_modifications enable row level security;
create policy historique_select on historique_modifications for select using (est_super_admin());

create or replace function tracer_modification() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_avant jsonb; v_apres jsonb; v_champs text[]; v_id text; v_esp text;
begin
  if tg_op = 'DELETE' then
    v_avant := to_jsonb(old);
  elsif tg_op = 'INSERT' then
    v_apres := to_jsonb(new);
  else
    v_avant := to_jsonb(old);
    v_apres := to_jsonb(new);
    v_champs := array(select k from jsonb_object_keys(v_apres) k
                      where k <> 'modifie_le' and (v_apres -> k) is distinct from (v_avant -> k));
    if coalesce(array_length(v_champs, 1), 0) = 0 then return null; end if;
    v_avant := (select jsonb_object_agg(k, v_avant -> k) from unnest(v_champs) k);
    v_apres := (select jsonb_object_agg(k, v_apres -> k) from unnest(v_champs) k);
  end if;

  v_id := coalesce(to_jsonb(coalesce(new, old)) ->> 'id', to_jsonb(coalesce(new, old)) ->> 'user_id', '?');
  v_esp := case when tg_table_name = 'espaces' then v_id
                else to_jsonb(coalesce(new, old)) ->> 'espace_id' end;

  insert into historique_modifications (table_nom, ligne_id, operation, avant, apres, champs_modifies, espace_id)
  values (tg_table_name, v_id, lower(tg_op), v_avant, v_apres, v_champs, v_esp::uuid);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profils','espaces','membres','membre_maisons','maisons','logements','locataires','baux',
                           'revisions_loyer','paiements','imputations','mouvements_caution','recus','reimpressions',
                           'demandes']
  loop
    execute format('create trigger %I_historique after insert or update or delete on %I
                    for each row execute function tracer_modification()', t, t);
  end loop;
end $$;

-- Purge (super admin) : avant une date, ou par identifiants
create or replace function purger_historique(p_avant date default null, p_ids bigint[] default null) returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  if p_avant is null and p_ids is null then raise exception 'Indiquez une date ou des entrées.'; end if;
  delete from historique_modifications
   where (p_avant is not null and le < p_avant) or (p_ids is not null and id = any (p_ids));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function emettre_recu(type_recu, uuid, uuid) from authenticated;
revoke execute on function tracer_modification() from authenticated;
grant execute on function verifier_recu(text) to anon;
