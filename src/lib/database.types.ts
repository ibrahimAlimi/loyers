// Typage volontairement souple : le client utilise ses propres types (src/lib/types.ts).
// `npm run types:db` écrit les types générés de Supabase dans database.generated.ts, à titre de référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
