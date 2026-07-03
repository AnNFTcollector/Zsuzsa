// Közös segédfüggvények a felülethez.

export function magyarDatum(iso) {
  if (!iso) return '–';
  const [ev, ho, nap] = iso.split('-');
  return `${ev}. ${ho}. ${nap}.`;
}

export function maISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function aktualisHonap() {
  return maISO().slice(0, 7);
}

export const ALLAPOT_FELIRAT = {
  lejart: 'LEJÁRT',
  esedekes: 'Esedékes',
  rendben: 'Rendben',
};

export const EREDMENY_FELIRAT = {
  megfelelt: 'Megfelelt',
  nem_felelt_meg: 'Nem felelt meg',
};

export function honapFelirat(honap) {
  if (!honap) return '';
  const nevek = ['január', 'február', 'március', 'április', 'május', 'június',
    'július', 'augusztus', 'szeptember', 'október', 'november', 'december'];
  const [ev, ho] = honap.split('-').map(Number);
  return `${ev}. ${nevek[ho - 1]}`;
}
