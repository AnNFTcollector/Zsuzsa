// Magyar dátumformátumok kezelése és esedékesség-számítás.
// Minden dátum ISO formátumban (YYYY-MM-DD) kerül az adatbázisba.

function isoDatum(ev, ho, nap) {
  return `${String(ev).padStart(4, '0')}-${String(ho).padStart(2, '0')}-${String(nap).padStart(2, '0')}`;
}

function ervenyesDatum(ev, ho, nap) {
  if (ev < 1900 || ev > 2200 || ho < 1 || ho > 12 || nap < 1 || nap > 31) return null;
  const d = new Date(Date.UTC(ev, ho - 1, nap));
  if (d.getUTCFullYear() !== ev || d.getUTCMonth() !== ho - 1 || d.getUTCDate() !== nap) return null;
  return isoDatum(ev, ho, nap);
}

// Bemenet lehet: Date objektum, Excel dátumszám, vagy szöveg
// (2026.01.15, 2026. 01. 15., 2026-01-15, 2026/01/15, 15.01.2026).
// Visszatérés: 'YYYY-MM-DD' vagy null, ha nem értelmezhető.
function parseDatum(ertek) {
  if (ertek === null || ertek === undefined || ertek === '') return null;

  if (ertek instanceof Date) {
    if (isNaN(ertek.getTime())) return null;
    return ervenyesDatum(ertek.getFullYear(), ertek.getMonth() + 1, ertek.getDate());
  }

  if (typeof ertek === 'number') {
    // Excel dátumszám (1900-as rendszer, 25569 = 1970-01-01)
    if (!isFinite(ertek) || ertek < 60 || ertek > 200000) return null;
    const ms = Math.round((ertek - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return ervenyesDatum(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  if (typeof ertek === 'string') {
    const s = ertek.trim();
    if (!s) return null;

    // Év elöl: 2026.01.15 | 2026. 01. 15. | 2026-01-15 | 2026/01/15
    let m = s.match(/^(\d{4})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{1,2})\.?$/);
    if (m) return ervenyesDatum(+m[1], +m[2], +m[3]);

    // Nap elöl: 15.01.2026 | 15-01-2026 | 15/01/2026
    m = s.match(/^(\d{1,2})[.\-\/]\s*(\d{1,2})[.\-\/]\s*(\d{4})\.?$/);
    if (m) return ervenyesDatum(+m[3], +m[2], +m[1]);

    // Excel dátumszám szövegként
    if (/^\d+([.,]\d+)?$/.test(s)) return parseDatum(parseFloat(s.replace(',', '.')));

    return null;
  }

  return null;
}

// ISO dátumhoz hónapok hozzáadása, hónapvég-kezeléssel (pl. jan. 31. + 1 hónap = febr. 28.)
function hozzaadHonap(iso, honapok) {
  if (!iso) return null;
  const [ev, ho, nap] = iso.split('-').map(Number);
  const osszHo = ho - 1 + Number(honapok);
  const ujEv = ev + Math.floor(osszHo / 12);
  const ujHo = (osszHo % 12 + 12) % 12; // 0-alapú
  const hoUtolsoNapja = new Date(Date.UTC(ujEv, ujHo + 1, 0)).getUTCDate();
  return isoDatum(ujEv, ujHo + 1, Math.min(nap, hoUtolsoNapja));
}

function maISO() {
  const d = new Date();
  return isoDatum(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// 'YYYY-MM' hónap utolsó napja ISO formátumban
function honapVege(honap) {
  const [ev, ho] = honap.split('-').map(Number);
  const utolsoNap = new Date(Date.UTC(ev, ho, 0)).getUTCDate();
  return isoDatum(ev, ho, utolsoNap);
}

// ISO -> magyar megjelenítés: 2026. 01. 15.
function magyarDatum(iso) {
  if (!iso) return '';
  const [ev, ho, nap] = iso.split('-');
  return `${ev}. ${ho}. ${nap}.`;
}

module.exports = { parseDatum, hozzaadHonap, maISO, honapVege, magyarDatum };
