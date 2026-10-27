-- =====================================================================
-- Lot 7 : vitrine et ouverture (§6.1, §6.13).
-- - demandes d'accès des propriétaires (formulaire public, via l'Edge Function « demande-acces ») ;
-- - écran de connexion aux couleurs de l'espace (nom, couleur, logo lisibles sans connexion) ;
-- - tableau de bord du super admin : place utilisée et activité des espaces.
-- =====================================================================

set search_path = public, extensions;

create table demandes_acces (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 2 and 120),
  telephone text not null check (length(telephone) between 6 and 30),
  email citext check (email is null or length(email) <= 200),
  ville text check (ville is null or length(ville) <= 80),
  nb_logements int check (nb_logements is null or nb_logements between 1 and 10000),
  message text check (message is null or length(message) <= 1000),
  statut statut_demande not null default 'en_attente',
  reponse text,
  espace_id uuid references espaces (id) on delete set null,
  ip inet,
  cree_le timestamptz not null default now(),
  traite_par uuid references profils (id) on delete set null,
  traite_le timestamptz
);
create index demandes_acces_statut_idx on demandes_acces (statut, cree_le desc);
create index demandes_acces_ip_idx on demandes_acces (ip, cree_le desc);
alter table demandes_acces enable row level security;
create policy demandes_acces_select on demandes_acces for select using (est_super_admin());
create policy demandes_acces_mfa on demandes_acces as restrictive for all to authenticated
  using (mfa_respectee()) with check (mfa_respectee());

/**
 * Enregistre une demande (appelée uniquement par l'Edge Function, après le CAPTCHA).
 * Au plus 3 demandes par heure et par adresse IP, 50 par jour au total.
 */
create or replace function enregistrer_demande_acces(
  p_nom text, p_telephone text, p_email text, p_ville text, p_nb_logements int, p_message text, p_ip inet
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if (select count(*) from demandes_acces where ip is not distinct from p_ip and cree_le > now() - interval '1 hour') >= 3
     or (select count(*) from demandes_acces where cree_le > now() - interval '1 day') >= 50 then
    raise exception 'Trop de demandes. Réessayez plus tard.';
  end if;
  insert into demandes_acces (nom, telephone, email, ville, nb_logements, message, ip)
  values (trim(p_nom), trim(p_telephone), nullif(lower(trim(p_email)), ''), nullif(trim(p_ville), ''),
          p_nb_logements, nullif(trim(p_message), ''), p_ip)
  returning id into v_id;
  perform notifier(super_admins(), null, 'demande_acces', 'Nouvelle demande d''accès : ' || trim(p_nom),
    trim(p_telephone) || coalesce(' · ' || nullif(trim(p_ville), ''), '')
    || coalesce(' · environ ' || p_nb_logements || ' logements', ''), '/admin', true);
  return v_id;
end $$;

create or replace function traiter_demande_acces(p_id uuid, p_accepter boolean, p_espace uuid default null, p_reponse text default null)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  update demandes_acces
     set statut = case when p_accepter then 'acceptee'::statut_demande else 'refusee'::statut_demande end,
         espace_id = p_espace, reponse = nullif(trim(p_reponse), ''), traite_par = auth.uid(), traite_le = now()
   where id = p_id and statut = 'en_attente';
  if not found then raise exception 'Cette demande a déjà été traitée.'; end if;
  perform auditer('demande_acces', p_espace, 'demandes_acces', p_id::text,
                  (select nom from demandes_acces where id = p_id), jsonb_build_object('accepte', p_accepter));
end $$;

-- ---------- Écran de connexion d'un espace ----------
create or replace function espace_public(p_cle text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', id, 'nom', nom, 'couleur', couleur_primaire, 'logo_path', logo_path)
  from espaces
  where actif and supprime_le is null
    and (slug = p_cle or (p_cle ~ '^[0-9a-f-]{36}$' and id = p_cle::uuid))
  limit 1
$$;

-- Les logos sont publics (ils s'affichent sur l'écran de connexion de l'espace) ; rien d'autre ne l'est.
create policy espaces_logo_public on storage.objects for select to anon using (
  bucket_id = 'espaces' and name ~ '^[0-9a-f-]{36}/logo\.png$');

-- Adresse de connexion personnalisée : minuscules, chiffres et tirets
alter table espaces drop constraint if exists espaces_slug_format;
alter table espaces add constraint espaces_slug_format check (slug is null or slug ~ '^[a-z0-9-]{3,40}$');

-- ---------- Tableau de bord du super admin ----------
create or replace function utilisation_plateforme() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not est_super_admin() then raise exception 'Réservé à l''administrateur.'; end if;
  return jsonb_build_object(
    'base_octets', pg_database_size(current_database()),
    'base_limite', 500 * 1024 * 1024,
    'stockage_octets', (select coalesce(sum((metadata->>'size')::bigint), 0) from storage.objects),
    'stockage_limite', 1024 * 1024 * 1024,
    'nb_espaces', (select count(*) from espaces where supprime_le is null),
    'nb_comptes', (select count(*) from profils where actif),
    'nb_logements', (select count(*) from logements where supprime_le is null),
    'demandes_en_attente', (select count(*) from demandes_acces where statut = 'en_attente'),
    'activite', coalesce((
      select jsonb_object_agg(e.id, greatest(
        (select max(le) from journal_audit j where j.espace_id = e.id),
        (select max(le) from historique_modifications h where h.espace_id = e.id)))
      from espaces e where e.supprime_le is null), '{}'::jsonb));
end $$;

-- ---------- Droits ----------
revoke execute on function enregistrer_demande_acces(text, text, text, text, int, text, inet) from public, anon, authenticated;
grant execute on function enregistrer_demande_acces(text, text, text, text, int, text, inet) to service_role;
revoke execute on function traiter_demande_acces(uuid, boolean, uuid, text), utilisation_plateforme() from public, anon;
grant execute on function traiter_demande_acces(uuid, boolean, uuid, text), utilisation_plateforme() to authenticated;
revoke execute on function espace_public(text) from public;
grant execute on function espace_public(text) to anon, authenticated;
