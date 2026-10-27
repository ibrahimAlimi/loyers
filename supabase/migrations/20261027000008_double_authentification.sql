-- =====================================================================
-- Double authentification (TOTP) exigée par la base :
-- 1. Les pouvoirs de super admin ne s'appliquent qu'avec une session aal2 (code vérifié).
-- 2. Tout utilisateur qui a activé la double authentification doit l'avoir validée
--    pour lire ou écrire quoi que ce soit (politiques restrictives) : un mot de passe
--    volé seul ne suffit plus, même en appelant l'API directement.
-- =====================================================================

set search_path = public, extensions;

create or replace function niveau_session() returns text
language sql stable as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1')
$$;

-- Vrai si la session respecte la double authentification de l'utilisateur
create or replace function mfa_respectee() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select niveau_session() = 'aal2'
      or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified')
$$;

create or replace function est_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.est_super_admin from profils p where p.id = auth.uid() and p.actif), false)
     and niveau_session() = 'aal2'
$$;

-- Politiques restrictives (s'ajoutent en ET aux politiques existantes)
do $$
declare t text;
begin
  foreach t in array array['espaces','membres','membre_maisons','maisons','logements','locataires','baux',
                           'revisions_loyer','paiements','imputations','mouvements_caution','recus','reimpressions',
                           'demandes','lots_suppression','historique_modifications']
  loop
    execute format('create policy %I on %I as restrictive for all to authenticated using (mfa_respectee()) with check (mfa_respectee())',
                   t || '_mfa', t);
  end loop;
end $$;

-- Son propre profil reste lisible (pour afficher l'écran de saisie du code)
create policy profils_mfa on profils as restrictive for all to authenticated
  using (id = auth.uid() or mfa_respectee()) with check (mfa_respectee());

-- Fichiers
create policy objets_mfa on storage.objects as restrictive for all to authenticated
  using (mfa_respectee()) with check (mfa_respectee());

revoke execute on function niveau_session() from public, anon;
revoke execute on function mfa_respectee() from public, anon;
grant execute on function niveau_session() to authenticated;
grant execute on function mfa_respectee() to authenticated;
