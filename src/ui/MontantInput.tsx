import { useEffect, useState } from 'react';
import { TextInput, type TextInputProps } from '@mantine/core';
import { formatNombre, parseMontant } from '@/lib/format';

type Props = Omit<TextInputProps, 'value' | 'onChange'> & {
  value: number | null;
  onChange: (v: number | null) => void;
  /** Autorise 0 (ex. premier mois offert). */
  zeroAutorise?: boolean;
};

const MESSAGE = 'Saisissez un montant en francs, par exemple 70 000';

/** Champ de montant FCFA : accepte « 70.000 », « 70 000 », « 70000F » ; refuse 0, négatif, décimales. */
export function MontantInput({ value, onChange, zeroAutorise, error, ...reste }: Props) {
  const [texte, setTexte] = useState(value != null ? formatNombre(value) : '');
  const [invalide, setInvalide] = useState(false);

  useEffect(() => {
    if (value == null) return;
    if (parseMontant(texte) !== value && !(zeroAutorise && value === 0 && texte.trim() === '0')) {
      setTexte(formatNombre(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextInput
      inputMode="numeric"
      rightSection="FCFA"
      rightSectionWidth={56}
      {...reste}
      value={texte}
      error={error ?? (invalide ? MESSAGE : undefined)}
      onChange={(e) => {
        const brut = e.currentTarget.value;
        if (zeroAutorise && brut.trim() === '0') {
          setTexte('0');
          setInvalide(false);
          onChange(0);
          return;
        }
        const n = parseMontant(brut);
        setInvalide(brut.trim() !== '' && n == null);
        setTexte(n != null ? formatNombre(n) : brut);
        onChange(n);
      }}
    />
  );
}
