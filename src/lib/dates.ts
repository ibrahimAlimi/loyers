import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/fr';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('fr');

export const FUSEAU = 'Africa/Porto-Novo';

/** Date du jour à Cotonou, au format YYYY-MM-DD. */
export const aujourdhui = (): string => dayjs().tz(FUSEAU).format('YYYY-MM-DD');

export const premierDuMois = (d: string | Date): string => dayjs(d).startOf('month').format('YYYY-MM-DD');

export const ajouterMois = (d: string | Date, n: number): string =>
  dayjs(d).add(n, 'month').startOf('month').format('YYYY-MM-DD');

export const finDuMois = (d: string | Date): string => dayjs(d).endOf('month').format('YYYY-MM-DD');

export { dayjs };
