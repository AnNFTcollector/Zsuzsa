// SQLite adatbázis-réteg (better-sqlite3).
// Az adatbázis a felhasználó AppData mappájában él (userData), így
// az alkalmazás frissítésekor nem vész el.

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { parseDatum, hozzaadHonap, maISO, honapVege } = require('./datum.cjs');

let db = null;
let dbUtvonal = null;

function megnyit(mappa) {
  fs.mkdirSync(mappa, { recursive: true });
  dbUtvonal = path.join(mappa, 'gepek.db');
  db = new Database(dbUtvonal);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS gepek (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nev TEXT NOT NULL,
      azonosito TEXT UNIQUE,
      helyszin TEXT,
      kategoria TEXT,
      utolso_ellenorzes TEXT,
      ciklus_honap INTEGER NOT NULL DEFAULT 6,
      kovetkezo_esedekesseg TEXT,
      megjegyzes TEXT,
      statusz TEXT NOT NULL DEFAULT 'aktiv'
    );
    CREATE TABLE IF NOT EXISTS ellenorzesek (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gep_id INTEGER NOT NULL REFERENCES gepek(id),
      datum TEXT NOT NULL,
      ellenor TEXT,
      eredmeny TEXT,
      megjegyzes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_ellenorzesek_gep ON ellenorzesek(gep_id);
  `);
  return db;
}

function bezar() {
  if (db) {
    db.close();
    db = null;
  }
}

function utvonal() {
  return dbUtvonal;
}

function megnyitott() {
  return db;
}

function szamitEsedekesseg(utolso, ciklus) {
  if (!utolso) return null;
  return hozzaadHonap(utolso, ciklus || 6);
}

// ---- Gépek ----

function gepLista({ kereses = '', helyszin = '', kategoria = '', statusz = '' } = {}) {
  let sql = 'SELECT * FROM gepek WHERE 1=1';
  const p = [];
  if (statusz) { sql += ' AND statusz = ?'; p.push(statusz); }
  if (helyszin) { sql += ' AND helyszin = ?'; p.push(helyszin); }
  if (kategoria) { sql += ' AND kategoria = ?'; p.push(kategoria); }
  if (kereses) {
    sql += ' AND (nev LIKE ? OR azonosito LIKE ?)';
    p.push(`%${kereses}%`, `%${kereses}%`);
  }
  sql += ' ORDER BY nev COLLATE NOCASE';
  return db.prepare(sql).all(...p);
}

function gepMentes(gep) {
  const utolso = gep.utolso_ellenorzes || null;
  const ciklus = Number(gep.ciklus_honap) > 0 ? Math.round(Number(gep.ciklus_honap)) : 6;
  const kovetkezo = szamitEsedekesseg(utolso, ciklus);
  const azonosito = (gep.azonosito || '').trim() || null;

  if (gep.id) {
    db.prepare(`
      UPDATE gepek SET nev=?, azonosito=?, helyszin=?, kategoria=?,
        utolso_ellenorzes=?, ciklus_honap=?, kovetkezo_esedekesseg=?, megjegyzes=?
      WHERE id=?
    `).run(gep.nev.trim(), azonosito, gep.helyszin || null, gep.kategoria || null,
      utolso, ciklus, kovetkezo, gep.megjegyzes || null, gep.id);
    return gep.id;
  }
  const info = db.prepare(`
    INSERT INTO gepek (nev, azonosito, helyszin, kategoria, utolso_ellenorzes,
      ciklus_honap, kovetkezo_esedekesseg, megjegyzes, statusz)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aktiv')
  `).run(gep.nev.trim(), azonosito, gep.helyszin || null, gep.kategoria || null,
    utolso, ciklus, kovetkezo, gep.megjegyzes || null);
  return info.lastInsertRowid;
}

function gepStatusz(id, statusz) {
  db.prepare('UPDATE gepek SET statusz=? WHERE id=?').run(statusz, id);
}

function szuroErtekek() {
  const helyszinek = db.prepare(
    "SELECT DISTINCT helyszin FROM gepek WHERE helyszin IS NOT NULL AND helyszin != '' ORDER BY helyszin COLLATE NOCASE"
  ).all().map((r) => r.helyszin);
  const kategoriak = db.prepare(
    "SELECT DISTINCT kategoria FROM gepek WHERE kategoria IS NOT NULL AND kategoria != '' ORDER BY kategoria COLLATE NOCASE"
  ).all().map((r) => r.kategoria);
  return { helyszinek, kategoriak };
}

// ---- Esedékesség ----

// Állapot: 'lejart' (esedékesség a múltban), 'esedekes' (a kiválasztott
// hónap végéig esedékes), 'rendben' (későbbi). A soha nem ellenőrzött
// gép lejártnak számít.
function allapot(gep, honapVegeISO, ma) {
  const k = gep.kovetkezo_esedekesseg;
  if (!k) return 'lejart';
  if (k < ma) return 'lejart';
  if (k <= honapVegeISO) return 'esedekes';
  return 'rendben';
}

function esedekesLista({ honap, kereses = '', helyszin = '', kategoria = '', mindenGep = false } = {}) {
  const ma = maISO();
  const h = honap || ma.slice(0, 7);
  const hVege = honapVege(h);
  const gepek = gepLista({ kereses, helyszin, kategoria, statusz: 'aktiv' })
    .map((g) => ({ ...g, allapot: allapot(g, hVege, ma) }));

  const osszes = {
    lejart: gepek.filter((g) => g.allapot === 'lejart').length,
    esedekes: gepek.filter((g) => g.allapot === 'esedekes').length,
    rendben: gepek.filter((g) => g.allapot === 'rendben').length,
  };

  let lista = mindenGep ? gepek : gepek.filter((g) => g.allapot !== 'rendben');
  const sorrend = { lejart: 0, esedekes: 1, rendben: 2 };
  lista = lista.slice().sort((a, b) =>
    sorrend[a.allapot] - sorrend[b.allapot] ||
    String(a.kovetkezo_esedekesseg || '').localeCompare(String(b.kovetkezo_esedekesseg || '')) ||
    a.nev.localeCompare(b.nev, 'hu'));

  return { lista, osszes, honap: h };
}

// ---- Ellenőrzések ----

function elozmenyek(gepId) {
  return db.prepare(
    'SELECT * FROM ellenorzesek WHERE gep_id=? ORDER BY datum DESC, id DESC'
  ).all(gepId);
}

function ellenorzesRogzit({ gepId, datum, ellenor, eredmeny, megjegyzes }) {
  const gep = db.prepare('SELECT * FROM gepek WHERE id=?').get(gepId);
  if (!gep) throw new Error('A gép nem található.');
  const iso = parseDatum(datum);
  if (!iso) throw new Error('Érvénytelen dátum.');

  const tranzakcio = db.transaction(() => {
    db.prepare(`
      INSERT INTO ellenorzesek (gep_id, datum, ellenor, eredmeny, megjegyzes)
      VALUES (?, ?, ?, ?, ?)
    `).run(gepId, iso, ellenor || null, eredmeny || null, megjegyzes || null);

    // Csak akkor frissítjük az utolsó ellenőrzést, ha az új dátum nem korábbi
    if (!gep.utolso_ellenorzes || iso >= gep.utolso_ellenorzes) {
      const kovetkezo = szamitEsedekesseg(iso, gep.ciklus_honap);
      db.prepare(
        'UPDATE gepek SET utolso_ellenorzes=?, kovetkezo_esedekesseg=? WHERE id=?'
      ).run(iso, kovetkezo, gepId);
    }
  });
  tranzakcio();
}

// ---- Import ----

function gepAzonositoval(azonosito) {
  if (!azonosito) return null;
  return db.prepare('SELECT * FROM gepek WHERE azonosito=?').get(azonosito);
}

// ujak: gép objektumok; frissitendok: { id, ...mezők } — csak a megadott
// (undefined-tól különböző) mezők frissülnek.
function importVeglegesit({ ujak = [], frissitendok = [] }) {
  let uj = 0;
  let frissitett = 0;
  const tranzakcio = db.transaction(() => {
    for (const gep of ujak) {
      gepMentes(gep);
      uj++;
    }
    for (const gep of frissitendok) {
      const letezo = db.prepare('SELECT * FROM gepek WHERE id=?').get(gep.id);
      if (!letezo) continue;
      const osszevont = { ...letezo };
      for (const mezo of ['nev', 'azonosito', 'helyszin', 'kategoria', 'utolso_ellenorzes', 'ciklus_honap', 'megjegyzes']) {
        if (gep[mezo] !== undefined && gep[mezo] !== null && gep[mezo] !== '') {
          osszevont[mezo] = gep[mezo];
        }
      }
      gepMentes(osszevont);
      frissitett++;
    }
  });
  tranzakcio();
  return { uj, frissitett };
}

module.exports = {
  megnyit, bezar, utvonal, megnyitott,
  gepLista, gepMentes, gepStatusz, szuroErtekek,
  esedekesLista, elozmenyek, ellenorzesRogzit,
  gepAzonositoval, importVeglegesit,
};
