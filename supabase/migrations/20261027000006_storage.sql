-- =====================================================================
-- Lot 1 - Stockage des fichiers (logos, cachets, signatures) + RPC de
-- connexion par e-mail.
-- Chemins : espaces/{espace_id}/logo.png|cachet.png|signature.png
--           profils/{user_id}/signature.png
-- =====================================================================

set search_path = public, extensions;

create or replace function uuid_ou_null(p text) returns uuid
language plpgsql immutable as $$
begin
  return p::uuid;
exception when others then
  return null;
end $$;

insert into storage.buckets (id, name, public) values ('espaces', 'espaces', false), ('profils', 'profils', false)
on conflict (id) do nothing;

create policy espaces_fichiers_lecture on storage.objects for select to authenticated using (
  bucket_id = 'espaces' and (est_super_admin() or role_dans(uuid_ou_null((storage.foldername(name))[1])) is not null));
create policy espaces_fichiers_ajout on storage.objects for insert to authenticated with check (
  bucket_id = 'espaces' and peut_gerer_espace(uuid_ou_null((storage.foldername(name))[1])));
create policy espaces_fichiers_maj on storage.objects for update to authenticated using (
  bucket_id = 'espaces' and peut_gerer_espace(uuid_ou_null((storage.foldername(name))[1])));
create policy espaces_fichiers_suppr on storage.objects for delete to authenticated using (
  bucket_id = 'espaces' and peut_gerer_espace(uuid_ou_null((storage.foldername(name))[1])));

-- Signatures personnelles : lisibles par les membres des mêmes espaces (pour les reçus)
create policy profils_fichiers_lecture on storage.objects for select to authenticated using (
  bucket_id = 'profils' and (
    (storage.foldername(name))[1] = auth.uid()::text or est_super_admin()
    or exists (select 1 from membres a join membres b on a.espace_id = b.espace_id
               where a.user_id = auth.uid() and b.user_id = uuid_ou_null((storage.foldername(name))[1]))));
create policy profils_fichiers_ajout on storage.objects for insert to authenticated with check (
  bucket_id = 'profils' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profils_fichiers_maj on storage.objects for update to authenticated using (
  bucket_id = 'profils' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profils_fichiers_suppr on storage.objects for delete to authenticated using (
  bucket_id = 'profils' and ((storage.foldername(name))[1] = auth.uid()::text or est_super_admin()));

-- Connexion avec l'e-mail réel : retrouve l'identifiant
create or replace function identifiant_pour_email(p_email citext) returns text
language sql stable security definer set search_path = public, extensions as $$
  select identifiant::text from profils where email = p_email and actif limit 1
$$;

revoke execute on function identifiant_pour_email(citext) from public;
grant execute on function identifiant_pour_email(citext) to anon, authenticated;
revoke execute on function uuid_ou_null(text) from public, anon;
grant execute on function uuid_ou_null(text) to authenticated;
