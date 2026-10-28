-- =====================================================================
-- Mot de passe oublié (spec §6.2) : lien par e-mail si le compte en a un,
-- sinon le propriétaire (ou l'administrateur, pour un propriétaire) est
-- prévenu et réinitialise le mot de passe. Appelé par l'Edge Function
-- publique `mot-de-passe-oublie` (service_role) ; limite par IP et par compte.
-- =====================================================================

set search_path = public, extensions;

create table demandes_mot_de_passe (
  id bigint generated always as identity primary key,
  saisie text not null,
  user_id uuid references profils (id) on delete cascade,
  ip inet,
  canal text,
  cree_le timestamptz not null default now()
);
create index demandes_mdp_ip_idx on demandes_mot_de_passe (ip, cree_le);
create index demandes_mdp_user_idx on demandes_mot_de_passe (user_id, cree_le);
alter table demandes_mot_de_passe enable row level security;   -- aucune politique : service_role seulement

-- Retrouve le compte (identifiant ou e-mail) et journalise la demande.
-- Renvoie { trouve, user_id, nom, email } ; ne lève une erreur que si la limite est atteinte.
create or replace function demande_mot_de_passe_oublie(p_saisie text, p_ip inet) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_saisie text := lower(trim(coalesce(p_saisie, ''))); v_p profils;
begin
  if p_ip is not null and (select count(*) from demandes_mot_de_passe
                            where ip = p_ip and cree_le > now() - interval '1 hour') >= 5 then
    raise exception 'Trop de demandes. Réessayez dans une heure.';
  end if;
  select * into v_p from profils
   where actif and (identifiant = v_saisie or (v_saisie like '%@%' and lower(email) = v_saisie))
   order by identifiant = v_saisie desc limit 1;
  if found and (select count(*) from demandes_mot_de_passe
                 where user_id = v_p.id and cree_le > now() - interval '1 hour') >= 3 then
    raise exception 'Trop de demandes. Réessayez dans une heure.';
  end if;
  insert into demandes_mot_de_passe (saisie, user_id, ip) values (left(v_saisie, 200), v_p.id, p_ip);
  if v_p.id is null then return jsonb_build_object('trouve', false); end if;
  return jsonb_build_object('trouve', true, 'user_id', v_p.id, 'nom', v_p.nom_complet, 'email', v_p.email);
end $$;

-- Pas d'e-mail (ou envoi impossible) : on prévient qui peut réinitialiser le mot de passe.
-- Gestionnaire / consultation → les propriétaires de ses espaces ; propriétaire ou sans espace → l'administrateur.
create or replace function notifier_mot_de_passe_oublie(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_p profils; v_m record; v_proprio boolean := false;
begin
  select * into v_p from profils where id = p_user;
  if not found then return; end if;
  update demandes_mot_de_passe set canal = 'notification'
   where id = (select max(id) from demandes_mot_de_passe where user_id = p_user);
  for v_m in select espace_id, role from membres where user_id = p_user and actif loop
    if v_m.role = 'proprietaire' then
      v_proprio := true;
    else
      perform notifier(proprietaires_de(v_m.espace_id), v_m.espace_id, 'compte',
        v_p.nom_complet || ' a oublié son mot de passe',
        'Ouvrez Comptes, puis « Réinitialiser le mot de passe », et transmettez-lui le mot de passe provisoire.',
        '/comptes');
    end if;
  end loop;
  if v_proprio or not exists (select 1 from membres where user_id = p_user and actif) then
    perform notifier(super_admins(), null, 'compte',
      v_p.nom_complet || ' (' || v_p.identifiant || ') a oublié son mot de passe',
      'Administration : réinitialisez le mot de passe du propriétaire et transmettez-le-lui.', '/admin');
  end if;
end $$;

create or replace function marquer_mot_de_passe_envoye(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update demandes_mot_de_passe set canal = 'email'
   where id = (select max(id) from demandes_mot_de_passe where user_id = p_user)
$$;

revoke execute on function demande_mot_de_passe_oublie(text, inet), notifier_mot_de_passe_oublie(uuid),
  marquer_mot_de_passe_envoye(uuid) from public, anon, authenticated;
grant execute on function demande_mot_de_passe_oublie(text, inet), notifier_mot_de_passe_oublie(uuid),
  marquer_mot_de_passe_envoye(uuid) to service_role;
