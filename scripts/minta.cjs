// Minta Excel fájl generálása a Feltöltés funkció kipróbálásához.
// Futtatás: node scripts/minta.cjs

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const aoa = [
  ['Gép megnevezése', 'Leltári szám', 'Helyszín', 'Típus', 'Utolsó ellenőrzés', 'Ciklus (hónap)', 'Megjegyzés'],
  ['Ipari mosogatógép', 'K-0001', 'Központi konyha', 'Konyhagép', '2026.01.10', 6, ''],
  ['Kombinált sütő', 'K-0002', 'Központi konyha', 'Konyhagép', '2026.02.05', 6, 'bal oldali'],
  ['Szeletelőgép', 'K-0003', '1. sz. tálalókonyha', 'Konyhagép', '2025.12.15', 6, ''],
  ['Hűtőkamra', 'K-0004', 'Raktár', 'Hűtéstechnika', '2025.11.20', 12, ''],
  ['Kenyérszeletelő', 'K-0005', '2. sz. tálalókonyha', 'Konyhagép', '2026-03-01', 6, ''],
  ['Burgonyakoptató', 'K-0006', 'Központi konyha', 'Konyhagép', '2026. 04. 12.', 6, ''],
  ['Ipari mixer', 'K-0007', 'Cukrászüzem', 'Konyhagép', '2026.05.30', 6, ''],
  ['Fagyasztóláda', 'K-0008', 'Raktár', 'Hűtéstechnika', '2026.06.15', 12, ''],
];

const ws = XLSX.utils.aoa_to_sheet(aoa);
ws['!cols'] = [24, 12, 20, 16, 16, 14, 20].map((w) => ({ wch: w }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Gépek');

const cel = path.join(__dirname, '..', 'pelda');
fs.mkdirSync(cel, { recursive: true });
XLSX.writeFile(wb, path.join(cel, 'minta-gepek.xlsx'));
console.log('Minta fájl elkészült: pelda/minta-gepek.xlsx');
