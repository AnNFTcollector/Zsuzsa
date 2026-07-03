// Gyors ellenőrző teszt a fő logikára (dátumkezelés, adatbázis, Excel import).
// Futtatás: npm run teszt
// Megjegyzés: ha a better-sqlite3 az Electronhoz lett fordítva, előbb
// futtassa: npm rebuild better-sqlite3

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseDatum, hozzaadHonap, honapVege } = require('../electron/datum.cjs');

// ---- Dátumkezelés ----
assert.strictEqual(parseDatum('2026.01.15'), '2026-01-15');
assert.strictEqual(parseDatum('2026. 01. 15.'), '2026-01-15');
assert.strictEqual(parseDatum('2026-01-15'), '2026-01-15');
assert.strictEqual(parseDatum('2026/1/5'), '2026-01-05');
assert.strictEqual(parseDatum('15.01.2026'), '2026-01-15');
assert.strictEqual(parseDatum(45292), '2024-01-01'); // Excel dátumszám
assert.strictEqual(parseDatum('45292'), '2024-01-01');
assert.strictEqual(parseDatum(new Date(2026, 0, 15)), '2026-01-15');
assert.strictEqual(parseDatum('nem dátum'), null);
assert.strictEqual(parseDatum('2026.13.01'), null);
assert.strictEqual(parseDatum(''), null);
assert.strictEqual(hozzaadHonap('2026-01-31', 1), '2026-02-28');
assert.strictEqual(hozzaadHonap('2026-01-15', 6), '2026-07-15');
assert.strictEqual(hozzaadHonap('2026-08-15', 6), '2027-02-15');
assert.strictEqual(honapVege('2026-02'), '2026-02-28');
console.log('✓ Dátumkezelés rendben');

// ---- Adatbázis ----
const db = require('../electron/db.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gepteszt-'));
db.megnyit(tmp);

const gepId = db.gepMentes({
  nev: 'Ipari mosogatógép', azonosito: 'K-0001', helyszin: 'Központi konyha',
  kategoria: 'Konyhagép', utolso_ellenorzes: '2026-01-10', ciklus_honap: 6,
});
let gep = db.gepLista()[0];
assert.strictEqual(gep.kovetkezo_esedekesseg, '2026-07-10');

db.ellenorzesRogzit({ gepId, datum: '2026.07.01', ellenor: 'Kovács János', eredmeny: 'megfelelt' });
gep = db.gepLista()[0];
assert.strictEqual(gep.utolso_ellenorzes, '2026-07-01');
assert.strictEqual(gep.kovetkezo_esedekesseg, '2027-01-01');
assert.strictEqual(db.elozmenyek(gepId).length, 1);

// Esedékesség-állapotok (ma: 2026-07-03 körül fut a teszt, de relatívan ellenőrzünk)
db.gepMentes({ nev: 'Régi sütő', azonosito: 'K-0002', utolso_ellenorzes: '2025-01-01', ciklus_honap: 6 });
const { lista, osszes } = db.esedekesLista({});
assert.ok(osszes.lejart >= 1, 'a régi sütőnek lejártnak kell lennie');
assert.ok(lista.some((g) => g.azonosito === 'K-0002' && g.allapot === 'lejart'));

// Leselejtezés
db.gepStatusz(gepId, 'leselejtezett');
assert.strictEqual(db.gepLista({ statusz: 'aktiv' }).length, 1);
assert.strictEqual(db.gepLista({}).length, 2);
db.gepStatusz(gepId, 'aktiv');
console.log('✓ Adatbázis rendben');

// ---- Excel import ----
const XLSX = require('xlsx');
const excel = require('../electron/excel.cjs');

const aoa = [
  ['Gép megnevezése', 'Leltári szám', 'Helyszín', 'Típus', 'Utolsó ellenőrzés', 'Ciklus'],
  ['Kombinált sütő', 'K-0100', '1. sz. konyha', 'Konyhagép', '2026.02.10', 6],
  ['Ipari mosogatógép', 'K-0001', 'Központi konyha', 'Konyhagép', '2026-03-05', 6], // duplikátum
  ['', 'K-0101', '1. sz. konyha', 'Konyhagép', '2026.02.10', 6], // hibás: nincs név
  ['Szeletelőgép', 'K-0102', '2. sz. konyha', 'Konyhagép', 'ismeretlen', 6], // hibás dátum
  ['Hűtőkamra', 'K-0103', 'Raktár', 'Hűtéstechnika', 45658, 12], // Excel dátumszám
];
const ws = XLSX.utils.aoa_to_sheet(aoa);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Gépek');
const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

const { munkalapok } = excel.beolvas(buf);
assert.strictEqual(munkalapok.length, 1);
assert.strictEqual(munkalapok[0].sorok.length, 5);

const mapping = { nev: 0, azonosito: 1, helyszin: 2, kategoria: 3, utolso_ellenorzes: 4, ciklus_honap: 5 };
const eredmeny = excel.feldolgoz({ sorok: munkalapok[0].sorok, mapping });
assert.strictEqual(eredmeny.ujak.length, 2, 'két új gép várt');
assert.strictEqual(eredmeny.duplikatumok.length, 1, 'egy duplikátum várt');
assert.strictEqual(eredmeny.hibak.length, 2, 'két hibás sor várt');
assert.strictEqual(eredmeny.ujak.find((g) => g.azonosito === 'K-0103').utolso_ellenorzes, '2025-01-01');

const veg = db.importVeglegesit({
  ujak: eredmeny.ujak,
  frissitendok: eredmeny.duplikatumok.map((d) => ({ ...d.uj, id: d.letezo.id })),
});
assert.deepStrictEqual(veg, { uj: 2, frissitett: 1 });
gep = db.gepLista({ kereses: 'K-0001' })[0];
assert.strictEqual(gep.utolso_ellenorzes, '2026-03-05', 'importnál a fájlbeli dátum kerül be');
assert.strictEqual(gep.kovetkezo_esedekesseg, '2026-09-05');

console.log('✓ Excel import rendben');

db.bezar();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nMinden teszt sikeres. ✓');
