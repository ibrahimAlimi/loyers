-- =====================================================================
-- Correctif : modifier un logement, un locataire ou un bail échouait avec
-- « record "old" has no field "date_fin" » (ou « gestionnaire_id »).
-- notif_fiche lisait des champs propres aux baux / maisons dans une condition
-- « and » que PL/pgSQL évalue en entier : conditions désormais imbriquées.
-- =====================================================================

set search_path = public, extensions;

create or replace function notif_fiche() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_maisons uuid[]; v_libelle text; v_lien text; v_quoi text; v_dest uuid[]; m uuid;
  v_avant jsonb; v_apres jsonb;
begin
  if auth.uid() is null then return null; end if;
  if tg_op = 'UPDATE' then
    -- Corbeille et restauration : notifiées une seule fois par lot (voir lots_suppression)
    if new.supprime_le is distinct from old.supprime_le or new.lot_suppression is distinct from old.lot_suppression then
      return null;
    end if;
    v_avant := to_jsonb(old) - 'modifie_le';
    v_apres := to_jsonb(new) - 'modifie_le';
    if v_avant = v_apres then return null; end if;
  end if;

  case tg_table_name
    when 'maisons' then
      v_maisons := array[new.id]; v_libelle := 'la maison « ' || new.nom || ' »'; v_lien := '/maisons/' || new.id;
    when 'logements' then
      v_maisons := array[new.maison_id];
      v_libelle := 'le logement « ' || new.designation || ' » (' || (select nom from maisons where id = new.maison_id) || ')';
      v_lien := '/maisons/' || new.maison_id;
    when 'locataires' then
      select coalesce(array_agg(distinct l.maison_id), '{}') into v_maisons
        from baux b join logements l on l.id = b.logement_id where b.locataire_id = new.id and b.supprime_le is null;
      v_libelle := 'le locataire « ' || trim(new.nom || ' ' || coalesce(new.prenoms, '')) || ' »';
      v_lien := '/locataires/' || new.id;
    when 'baux' then
      select array[l.maison_id], 'le bail de ' || trim(lo.nom || ' ' || coalesce(lo.prenoms, '')) || ' (' || mm.nom || ' · ' || l.designation || ')'
        into v_maisons, v_libelle
        from logements l join maisons mm on mm.id = l.maison_id join locataires lo on lo.id = new.locataire_id
        where l.id = new.logement_id;
      v_lien := '/locataires/' || new.locataire_id;
  end case;

  v_dest := proprietaires_de(new.espace_id);
  foreach m in array coalesce(v_maisons, '{}') loop v_dest := v_dest || gestionnaire_de(m); end loop;

  -- Départ d'un locataire : le logement est libéré
  -- (conditions imbriquées : PL/pgSQL n'arrête pas un « and » au premier faux, et old.date_fin
  --  n'existe que pour les baux)
  if tg_table_name = 'baux' and tg_op = 'UPDATE' then
    if old.date_fin is null and new.date_fin is not null then
      perform notifier(v_dest, new.espace_id, 'logement_libere', 'Logement libéré',
        initcap(substr(v_libelle, 4, 1)) || substr(v_libelle, 5) || ' se termine le ' || to_char(new.date_fin, 'DD/MM/YYYY') || '.', v_lien);
      return null;
    end if;
  end if;

  v_quoi := case when tg_op = 'INSERT' then 'ajouté' else 'modifié' end;
  perform notifier(v_dest, new.espace_id, 'modification',
    nom_de(auth.uid()) || ' a ' || v_quoi || ' ' || v_libelle, null, v_lien);

  -- Nouveau gestionnaire d'une maison
  if tg_table_name = 'maisons' then
    if new.gestionnaire_id is not null then
      if tg_op = 'INSERT' then
        perform notifier(array[new.gestionnaire_id], new.espace_id, 'compte',
          'Vous gérez maintenant la maison « ' || new.nom || ' »', null, v_lien);
      elsif new.gestionnaire_id is distinct from old.gestionnaire_id then
        perform notifier(array[new.gestionnaire_id], new.espace_id, 'compte',
          'Vous gérez maintenant la maison « ' || new.nom || ' »', null, v_lien);
      end if;
    end if;
  end if;
  return null;
end $$;
