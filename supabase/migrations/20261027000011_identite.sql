-- =====================================================================
-- Lot 3 : identité visuelle (§6.9). Icônes du menu choisies par l'espace.
-- { "<clé du menu>": "<nom de l'icône dans la bibliothèque>" } ; absent = icône par défaut.
-- =====================================================================

alter table espaces add column if not exists icones_menu jsonb not null default '{}'::jsonb
  check (jsonb_typeof(icones_menu) = 'object');
