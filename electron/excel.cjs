// Excel beolvasás (xlsx / SheetJS) és export.

const XLSX = require('xlsx');
const { parseDatum, magyarDatum } = require('./datum.cjs');
const db = require('./db.cjs');

// Excel fájl beolvasása bufferből. Minden munkalapot visszaad:
// { nev, fejlec: [...], sorok: [[...], ...] } — a dátumcellák már
// ISO szöveggé alakítva, minden érték sorosítható.
function beolvas(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const munkalapok = [];
  for (const nev of wb.SheetNames) {
    const ws = wb.Sheets[nev];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    if (!aoa.length) continue;
    const tisztit = (cella) => {
      if (cella instanceof Date) return parseDatum(cella);
      if (typeof cella === 'string') return cella.trim();
      return cella;
    };
    const fejlec = (aoa[0] || []).map((c) => (c === null ? '' : String(c).trim()));
    const sorok = aoa.slice(1)
      .map((sor) => fejlec.map((_, i) => tisztit(sor[i] === undefined ? null : sor[i])))
      .filter((sor) => sor.some((c) => c !== null && c !== ''));
    munkalapok.push({ nev, fejlec, sorok });
  }
  return { munkalapok };
}

// Sorok feldolgozása a felhasználó által megadott oszlop-hozzárendeléssel.
// mapping: { mezoNev: oszlopIndex vagy -1 }
// Visszatérés: { ujak, duplikatumok, hibak }
function feldolgoz({ sorok, mapping }) {
  const ujak = [];
  const duplikatumok = [];
  const hibak = [];
  const fajlonBeluliAzonositok = new Set();

  const cella = (sor, mezo) => {
    const idx = mapping[mezo];
    if (idx === undefined || idx === null || idx < 0) return undefined;
    const e = sor[idx];
    return e === null || e === '' ? undefined : e;
  };

  sorok.forEach((sor, i) => {
    const sorszam = i + 2; // az Excelben a fejléc az 1. sor
    const hibaOkok = [];

    const nev = cella(sor, 'nev');
    if (!nev || !String(nev).trim()) hibaOkok.push('hiányzó gépnév');

    const azonositoNyers = cella(sor, 'azonosito');
    const azonosito = azonositoNyers === undefined ? null : String(azonositoNyers).trim() || null;

    let utolso;
    const datumNyers = cella(sor, 'utolso_ellenorzes');
    if (datumNyers !== undefined) {
      utolso = parseDatum(datumNyers);
      if (!utolso) hibaOkok.push(`értelmezhetetlen dátum: „${datumNyers}”`);
    }

    let ciklus;
    const ciklusNyers = cella(sor, 'ciklus_honap');
    if (ciklusNyers !== undefined) {
      ciklus = Math.round(Number(String(ciklusNyers).replace(',', '.')));
      if (!isFinite(ciklus) || ciklus < 1 || ciklus > 120) {
        hibaOkok.push(`értelmezhetetlen ciklus: „${ciklusNyers}”`);
        ciklus = undefined;
      }
    }

    if (azonosito && fajlonBeluliAzonositok.has(azonosito)) {
      hibaOkok.push(`ismétlődő azonosító a fájlban: „${azonosito}”`);
    }

    if (hibaOkok.length) {
      hibak.push({ sorszam, nev: nev ? String(nev).trim() : '', azonosito: azonosito || '', ok: hibaOkok.join('; ') });
      return;
    }
    if (azonosito) fajlonBeluliAzonositok.add(azonosito);

    const gep = {
      nev: String(nev).trim(),
      azonosito,
      helyszin: cella(sor, 'helyszin') !== undefined ? String(cella(sor, 'helyszin')).trim() : undefined,
      kategoria: cella(sor, 'kategoria') !== undefined ? String(cella(sor, 'kategoria')).trim() : undefined,
      utolso_ellenorzes: utolso,
      ciklus_honap: ciklus,
      megjegyzes: cella(sor, 'megjegyzes') !== undefined ? String(cella(sor, 'megjegyzes')).trim() : undefined,
      sorszam,
    };

    const letezo = db.gepAzonositoval(azonosito);
    if (letezo) {
      duplikatumok.push({ uj: gep, letezo });
    } else {
      ujak.push(gep);
    }
  });

  return { ujak, duplikatumok, hibak };
}

const EREDMENY_FELIRAT = { megfelelt: 'Megfelelt', nem_felelt_meg: 'Nem felelt meg' };
const ALLAPOT_FELIRAT = { lejart: 'LEJÁRT', esedekes: 'Esedékes', rendben: 'Rendben' };

// Az esedékes-lista exportálása Excel fájlba.
function exportEsedekes(fajlUtvonal, lista) {
  const fejlec = ['Állapot', 'Gép neve', 'Azonosító', 'Helyszín', 'Kategória',
    'Utolsó ellenőrzés', 'Ciklus (hónap)', 'Következő esedékesség', 'Megjegyzés'];
  const sorok = lista.map((g) => [
    ALLAPOT_FELIRAT[g.allapot] || g.allapot,
    g.nev,
    g.azonosito || '',
    g.helyszin || '',
    g.kategoria || '',
    magyarDatum(g.utolso_ellenorzes),
    g.ciklus_honap,
    magyarDatum(g.kovetkezo_esedekesseg),
    g.megjegyzes || '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([fejlec, ...sorok]);
  ws['!cols'] = [10, 30, 15, 20, 18, 16, 13, 20, 30].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Esedékes gépek');
  XLSX.writeFile(wb, fajlUtvonal);
}

module.exports = { beolvas, feldolgoz, exportEsedekes, EREDMENY_FELIRAT };
