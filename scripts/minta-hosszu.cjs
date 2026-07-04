// Hosszú teszt-Excel generálása (kb. 100 sor) a Feltöltés funkció
// kipróbálásához: vegyes dátumformátumok, hibás sorok, fájlon belüli
// duplikátum és a kis mintával átfedő azonosítók is vannak benne.
// Futtatás: node scripts/minta-hosszu.cjs

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const GEPEK = [
  'Ipari mosogatógép', 'Kombinált sütő', 'Szeletelőgép', 'Hűtőkamra',
  'Kenyérszeletelő', 'Burgonyakoptató', 'Ipari mixer', 'Fagyasztóláda',
  'Gőzpároló', 'Billenő serpenyő', 'Ételmelegítő pult', 'Ipari robotgép',
  'Zöldségszeletelő', 'Húsdaráló', 'Kávéfőző gép', 'Mikrohullámú sütő',
  'Mosogató medence', 'Elszívó ernyő', 'Hűtővitrin', 'Sokkoló hűtő',
  'Tésztanyújtó gép', 'Konvekciós sütő', 'Rizsfőző', 'Olajsütő',
  'Ipari mérleg', 'Vákuumcsomagoló', 'Szalámiszeletelő', 'Jégkockakészítő',
  'Ipari turmixgép', 'Melegentartó kocsi', 'Padlótisztító gép', 'Ipari porszívó',
  'Gőztisztító', 'Magasnyomású mosó', 'Fűnyíró traktor', 'Sövényvágó',
  'Láncfűrész', 'Ágaprító', 'Fúrógép', 'Sarokcsiszoló',
  'Asztali körfűrész', 'Hegesztőgép', 'Kompresszor', 'Targonca',
];

const HELYSZINEK = [
  'Központi konyha', '1. sz. tálalókonyha', '2. sz. tálalókonyha',
  'Óvodai konyha', 'Iskolai konyha', 'Cukrászüzem', 'Raktár',
  'Karbantartó műhely', 'Kertészet',
];

const KATEGORIAK = {
  konyha: 'Konyhagép',
  hutes: 'Hűtéstechnika',
  takaritas: 'Takarítógép',
  kert: 'Kerti gép',
  muhely: 'Műhelygép',
};

function kategoriaGephez(nev) {
  if (/hűtő|fagyasztó|sokkoló|jégkocka|vitrin/i.test(nev)) return KATEGORIAK.hutes;
  if (/tisztító|porszívó|mosó/i.test(nev)) return KATEGORIAK.takaritas;
  if (/fűnyíró|sövény|láncfűrész|ágaprító/i.test(nev)) return KATEGORIAK.kert;
  if (/fúró|csiszoló|fűrész|hegesztő|kompresszor|targonca/i.test(nev)) return KATEGORIAK.muhely;
  return KATEGORIAK.konyha;
}

// Determinisztikus "véletlen", hogy a fájl mindig ugyanaz legyen
let mag = 42;
function veletlen() {
  mag = (mag * 9301 + 49297) % 233280;
  return mag / 233280;
}
function valaszt(lista) {
  return lista[Math.floor(veletlen() * lista.length)];
}

// Vegyes magyar dátumformátumok
function datumFormaz(d, stilus) {
  const ev = d.getFullYear();
  const ho = String(d.getMonth() + 1).padStart(2, '0');
  const nap = String(d.getDate()).padStart(2, '0');
  switch (stilus) {
    case 0: return `${ev}.${ho}.${nap}`;
    case 1: return `${ev}. ${ho}. ${nap}.`;
    case 2: return `${ev}-${ho}-${nap}`;
    case 3: return `${ev}/${ho}/${nap}`;
    // Excel dátumszám
    default: return Math.round(d.getTime() / 86400000) + 25569;
  }
}

const sorok = [];
let sorszamlalo = 100;

// ~90 szabályos sor
for (let i = 0; i < 90; i++) {
  const nev = valaszt(GEPEK);
  const helyszin = valaszt(HELYSZINEK);
  const kategoria = kategoriaGephez(nev);
  // utolsó ellenőrzés: az elmúlt ~14 hónapban
  const d = new Date(2026, 6, 4);
  d.setDate(d.getDate() - Math.floor(veletlen() * 430));
  const ciklus = kategoria === KATEGORIAK.hutes ? 12 : (veletlen() < 0.15 ? 3 : 6);
  sorok.push([
    nev,
    `K-${String(sorszamlalo++).padStart(4, '0')}`,
    helyszin,
    kategoria,
    datumFormaz(d, Math.floor(veletlen() * 5)),
    veletlen() < 0.2 ? '' : ciklus, // néha üres -> alapértelmezett 6
    veletlen() < 0.12 ? valaszt(['új beszerzés', 'garanciális', 'cserélendő szűrő', 'zajos működés']) : '',
  ]);
}

// A kis mintával (minta-gepek.xlsx) átfedő azonosítók -> duplikátum-kezelés tesztje
sorok.push(['Ipari mosogatógép', 'K-0001', 'Központi konyha', 'Konyhagép', '2026.06.20', 6, 'friss ellenőrzés']);
sorok.push(['Hűtőkamra', 'K-0004', 'Raktár', 'Hűtéstechnika', '2026.06.25', 12, '']);

// Hibás sorok -> hibalista tesztje
sorok.push(['', 'K-9001', 'Központi konyha', 'Konyhagép', '2026.03.10', 6, 'HIBÁS: nincs gépnév']);
sorok.push(['Próbagép — rossz dátum', 'K-9002', 'Raktár', 'Műhelygép', 'folyamatban', 6, 'HIBÁS: értelmezhetetlen dátum']);
sorok.push(['Próbagép — rossz ciklus', 'K-9003', 'Műhely', 'Műhelygép', '2026.02.02', 'félévente', 'HIBÁS: értelmezhetetlen ciklus']);
sorok.push(['Próbagép — dupla azonosító', 'K-0100', 'Raktár', 'Műhelygép', '2026.01.15', 6, 'HIBÁS: az azonosító már szerepel a fájlban']);

const fejlec = ['Gép megnevezése', 'Leltári szám', 'Helyszín', 'Típus',
  'Utolsó ellenőrzés', 'Ciklus (hónap)', 'Megjegyzés'];
const ws = XLSX.utils.aoa_to_sheet([fejlec, ...sorok]);
ws['!cols'] = [26, 12, 22, 16, 18, 14, 34].map((w) => ({ wch: w }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Gépek');

const cel = path.join(__dirname, '..', 'pelda');
fs.mkdirSync(cel, { recursive: true });
XLSX.writeFile(wb, path.join(cel, 'teszt-gepek-hosszu.xlsx'));
console.log(`Kész: pelda/teszt-gepek-hosszu.xlsx (${sorok.length} adatsor)`);
