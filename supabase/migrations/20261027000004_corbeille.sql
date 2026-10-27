-- =====================================================================
-- Lot 1 - Corbeille : suppression douce en cascade, restauration par lot,
-- suppression définitive (super admin), aperçu de l'impact.
-- =====================================================================

set search_path = public, extensions;

-- Un lot = une action « mettre à la corbeille » (racine + descendants)
create table lots_suppression (
  id uuid primary key default gen_random_uuid(),
  espace_id uuid references espaces (id) on delete cascade,
  racine_table text not null,
  racine_id uuid not null,
  libelle text not null,
  nb_elements int not null default 1,
  supprime_le timestamptz not null default now(),
  supprime_par uuid references profils (id) on delete set null
);
create index lots_suppression_espace_idx on lots_suppression (espace_id);
alter table lots_suppression enable row level security;
create policy lots_select on lots_suppression for select using (
  est_super_admin() or (espace_id is not null and peut_gerer_espace(espace_id)));

create or replace function tables_corbeille() returns text[]
language sql immutable as $$
  select array['espaces','maisons','logements','locataires','baux','paiements','mouvements_caution','demandes']
$$;

create or replace function espace_de(p_table text, p_id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  if not (p_table = any (tables_corbeille())) then raise exception 'Type d''élément non pris en charge.'; end if;
  if p_table = 'espaces' then return p_id; end if;
  execute format('select espace_id from %I where id = $1', p_table) into v using p_id;
  return v;
end $$;

create or replace function libelle_de(p_table text, p_id uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare v text;
begin
  case p_table
    when 'espaces' then select nom into v from espaces where id = p_id;
    when 'maisons' then select nom into v from maisons where id = p_id;
    when 'logements' then select m.nom || ' · ' || l.designation into v from logements l join maisons m on m.id = l.maison_id where l.id = p_id;
    when 'locataires' then select trim(nom || ' ' || coalesce(prenoms, '')) into v from locataires where id = p_id;
    when 'baux' then select coalesce(b.reference, 'Bail') || ' · ' || trim(lo.nom || ' ' || coalesce(lo.prenoms, ''))
                       into v from baux b join locataires lo on lo.id = b.locataire_id where b.id = p_id;
    when 'paiements' then select 'Paiement de ' || montant || ' FCFA du ' || to_char(date_paiement, 'DD/MM/YYYY') into v from paiements where id = p_id;
    when 'mouvements_caution' then select 'Caution ' || type || ' de ' || montant || ' FCFA' into v from mouvements_caution where id = p_id;
    when 'demandes' then select 'Demande : ' || coalesce(cible_libelle, type) into v from demandes where id = p_id;
  end case;
  return coalesce(v, '(sans nom)');
end $$;

-- Ensemble des éléments touchés par une suppression de (p_table, p_id)
create or replace function collecter_cascade(p_table text, p_id uuid)
returns table (tbl text, ids uuid[])
language plpgsql stable security definer set search_path = public as $$
declare
  v_maisons uuid[] := '{}'; v_logements uuid[] := '{}'; v_locataires uuid[] := '{}'; v_baux uuid[] := '{}';
  v_paiements uuid[] := '{}'; v_mvts uuid[] := '{}'; v_revs uuid[] := '{}'; v_imput uuid[] := '{}';
  v_recus uuid[] := '{}'; v_demandes uuid[] := '{}';
begin
  case p_table
    when 'espaces' then
      v_maisons := array(select id from maisons where espace_id = p_id);
      v_locataires := array(select id from locataires where espace_id = p_id);
      v_demandes := array(select id from demandes where espace_id = p_id);
    when 'maisons' then v_maisons := array[p_id];
    when 'logements' then v_logements := array[p_id];
    when 'locataires' then v_locataires := array[p_id];
    when 'baux' then v_baux := array[p_id];
    when 'paiements' then v_paiements := array[p_id];
    when 'mouvements_caution' then v_mvts := array[p_id];
    when 'demandes' then v_demandes := array[p_id];
    else raise exception 'Type d''élément non pris en charge.';
  end case;
  v_logements := v_logements || array(select id from logements where maison_id = any (v_maisons));
  v_baux := v_baux || array(select id from baux where logement_id = any (v_logements) or locataire_id = any (v_locataires));
  v_paiements := v_paiements || array(select id from paiements where bail_id = any (v_baux));
  v_mvts := v_mvts || array(select id from mouvements_caution where bail_id = any (v_baux));
  v_revs := array(select id from revisions_loyer where bail_id = any (v_baux));
  v_imput := array(select id from imputations where paiement_id = any (v_paiements));
  v_recus := array(select id from recus where paiement_id = any (v_paiements) or mouvement_caution_id = any (v_mvts));

  return query values
    ('espaces', case when p_table = 'espaces' then array[p_id] else '{}'::uuid[] end),
    ('maisons', v_maisons), ('logements', v_logements), ('locataires', v_locataires), ('baux', v_baux),
    ('revisions_loyer', v_revs), ('paiements', v_paiements), ('imputations', v_imput),
    ('mouvements_caution', v_mvts), ('recus', v_recus), ('demandes', v_demandes);
end $$;

create or replace function verifier_droit_suppression(p_table text, p_id uuid) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_espace uuid;
begin
  v_espace := espace_de(p_table, p_id);
  if v_espace is null then raise exception 'Élément introuvable.'; end if;
  if p_table = 'espaces' and not est_super_admin() then
    raise exception 'Seul l''administrateur peut supprimer un espace.';
  end if;
  if not peut_gerer_espace(v_espace) then
    raise exception 'Seul le propriétaire peut supprimer. Faites une demande de suppression.';
  end if;
  return v_espace;
end $$;

-- Aperçu de l'impact (éléments non encore supprimés)
create or replace function apercu_suppression(p_table text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  c record; v_res jsonb := '{}'::jsonb; v_n int; v_baux uuid[]; v_noms jsonb; v_actifs int; v_fichiers int := 0;
begin
  perform verifier_droit_suppression(p_table, p_id);
  for c in select * from collecter_cascade(p_table, p_id) loop
    if c.tbl = p_table then continue; end if;
    execute format('select count(*) from %I where id = any ($1) and supprime_le is null', c.tbl) into v_n using c.ids;
    v_res := v_res || jsonb_build_object(c.tbl, v_n);
    if c.tbl = 'baux' then v_baux := c.ids; end if;
  end loop;
  select count(*), coalesce(jsonb_agg(distinct trim(lo.nom || ' ' || coalesce(lo.prenoms, ''))), '[]'::jsonb)
    into v_actifs, v_noms
    from baux b join locataires lo on lo.id = b.locataire_id
   where b.id = any (coalesce(v_baux, '{}')) and b.date_fin is null and b.supprime_le is null;
  if p_table = 'maisons' then
    select count(*) into v_fichiers from maisons where id = p_id and photo_path is not null;
  elsif p_table = 'espaces' then
    select (logo_path is not null)::int + (cachet_path is not null)::int + (signature_path is not null)::int
      into v_fichiers from espaces where id = p_id;
  end if;
  return v_res || jsonb_build_object('libelle', libelle_de(p_table, p_id), 'baux_actifs', v_actifs,
                                     'locataires_concernes', v_noms, 'fichiers', v_fichiers);
end $$;

-- Mise à la corbeille en cascade ; renvoie l'identifiant du lot
create or replace function mettre_a_la_corbeille(p_table text, p_id uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_espace uuid; v_lot uuid := gen_random_uuid(); c record; v_n int; v_total int := 0; v_deja timestamptz;
begin
  v_espace := verifier_droit_suppression(p_table, p_id);
  execute format('select supprime_le from %I where id = $1', p_table) into v_deja using p_id;
  if v_deja is not null then raise exception 'Cet élément est déjà dans la corbeille.'; end if;

  for c in select * from collecter_cascade(p_table, p_id) loop
    continue when coalesce(array_length(c.ids, 1), 0) = 0;
    execute format('update %I set supprime_le = now(), supprime_par = auth.uid(), lot_suppression = $1
                    where id = any ($2) and supprime_le is null', c.tbl) using v_lot, c.ids;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;
  end loop;

  insert into lots_suppression (id, espace_id, racine_table, racine_id, libelle, nb_elements, supprime_par)
  values (v_lot, case when p_table = 'espaces' then null else v_espace end, p_table, p_id,
          libelle_de(p_table, p_id), v_total, auth.uid());
  return v_lot;
end $$;

-- Restauration d'un lot (et uniquement de ce lot)
create or replace function restaurer(p_lot uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_l lots_suppression; t text; v_parent text;
begin
  select * into v_l from lots_suppression where id = p_lot;
  if not found then raise exception 'Élément introuvable dans la corbeille.'; end if;
  if v_l.racine_table = 'espaces' then
    if not est_super_admin() then raise exception 'Seul l''administrateur peut restaurer un espace.'; end if;
  elsif not peut_gerer_espace(v_l.espace_id) then
    raise exception 'Seul le propriétaire peut restaurer.';
  end if;

  -- Le parent de la racine doit être actif
  case v_l.racine_table
    when 'logements' then
      select m.nom into v_parent from logements l join maisons m on m.id = l.maison_id
       where l.id = v_l.racine_id and m.supprime_le is not null;
      if v_parent is not null then raise exception 'Restaurez d''abord la maison « % ».', v_parent; end if;
    when 'baux' then
      select coalesce((select 'le logement « ' || l.designation || ' »' from logements l
                        where l.id = b.logement_id and l.supprime_le is not null),
                      (select 'le locataire « ' || lo.nom || ' »' from locataires lo
                        where lo.id = b.locataire_id and lo.supprime_le is not null))
        into v_parent from baux b where b.id = v_l.racine_id;
      if v_parent is not null then raise exception 'Restaurez d''abord %.', v_parent; end if;
    when 'paiements', 'mouvements_caution' then
      execute format('select 1 from %I x join baux b on b.id = x.bail_id where x.id = $1 and b.supprime_le is not null',
                     v_l.racine_table) into v_parent using v_l.racine_id;
      if v_parent is not null then raise exception 'Restaurez d''abord le bail concerné.'; end if;
    else null;
  end case;

  begin
    foreach t in array array['espaces','maisons','logements','locataires','baux','revisions_loyer','paiements',
                             'imputations','mouvements_caution','recus','demandes'] loop
      execute format('update %I set supprime_le = null, supprime_par = null, lot_suppression = null
                      where lot_suppression = $1', t) using p_lot;
    end loop;
  exception when unique_violation then
    raise exception 'Impossible de restaurer : le logement a déjà un bail en cours. Terminez d''abord ce bail.';
  end;
  delete from lots_suppression where id = p_lot;
end $$;

-- Suppression définitive (super admin) ; renvoie les chemins Storage à effacer
create or replace function supprimer_definitivement(p_table text, p_id uuid) returns text[]
language plpgsql security definer set search_path = public as $$
declare
  v_chemins text[] := '{}'; v_ids uuid[] := '{}'; c record;
begin
  if not est_super_admin() then raise exception 'Seul l''administrateur peut supprimer définitivement.'; end if;
  if not (p_table = any (tables_corbeille())) then raise exception 'Type d''élément non pris en charge.'; end if;

  for c in select * from collecter_cascade(p_table, p_id) loop
    v_ids := v_ids || c.ids;
  end loop;
  v_chemins := v_chemins || array(select photo_path from maisons where id = any (v_ids) and photo_path is not null);
  if p_table = 'espaces' then
    v_chemins := v_chemins || array(select unnest(array[logo_path, cachet_path, signature_path])
                                     from espaces where id = p_id) ;
  end if;

  execute format('delete from %I where id = $1', p_table) using p_id;   -- les FK « on delete cascade » font le reste
  delete from lots_suppression where racine_id = any (v_ids || p_id);
  return array(select x from unnest(v_chemins) x where x is not null);
end $$;

create or replace view v_corbeille with (security_invoker = on) as
select l.id as lot_suppression, l.espace_id, l.racine_table as "table", l.racine_id as id, l.libelle,
       l.supprime_le, p.nom_complet as supprime_par_nom, l.nb_elements as nb_elements_du_lot
from lots_suppression l left join profils p on p.id = l.supprime_par;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function emettre_recu(type_recu, uuid, uuid) from authenticated;
grant execute on function verifier_recu(text) to anon;
grant select on v_corbeille to authenticated;
