# Gép-ellenőrzési nyilvántartás

Magyar nyelvű asztali alkalmazás Windowsra, munkavédelmi gép-ellenőrzések
nyilvántartásához. Konyhai és egyéb gépek időszakos (jellemzően 6 havonta
esedékes) ellenőrzéseit tartja számon: megmutatja, mely gépek ellenőrzése
esedékes az adott hónapban, és melyek csúsztak már le.

Az alkalmazás **teljesen offline** működik, minden adat a saját gépen,
egy helyi SQLite adatbázis-fájlban tárolódik.

## Telepítés (felhasználóknak)

1. Töltse le a telepítőt (`Gepellenorzes Setup 1.0.0.exe` a `release`
   mappából, vagy a kapott linkről).
2. Indítsa el, és kövesse a telepítő lépéseit (a telepítési mappa
   megváltoztatható).
3. A telepítés után az alkalmazás a Start menüből vagy az asztali
   **Gép-ellenőrzés** ikonnal indítható.

**Fontos:** az adatbázis nem a program mappájában, hanem a felhasználói
profilban tárolódik (`C:\Users\<felhasználó>\AppData\Roaming\Gepellenorzes\gepek.db`),
így az alkalmazás frissítésekor (újratelepítésekor) **az adatok nem vesznek el**.

## Használat

Az alkalmazás három fülből áll, indításkor az **Esedékes** fül nyílik meg.

### 1. Esedékes fül

- Táblázatban mutatja a lejárt és az adott hónapban esedékes gépeket.
- **Színkódolás:**
  - 🔴 **PIROS** – lejárt: az esedékesség a múltban van (vagy a gépnek
    még egyáltalán nincs rögzített ellenőrzése),
  - 🟡 **SÁRGA** – a kiválasztott hónapban esedékes,
  - 🟢 **ZÖLD** – rendben (csak a „Rendben lévő gépek is” jelölőnégyzettel
    jelenik meg).
- A fejlécben összesítő látható: hány gép lejárt, hány esedékes.
- **Szűrők:** hónapválasztó (előre is lehet nézni), helyszín, kategória,
  valamint kereső mező (gépnév vagy azonosító).
- **Ellenőrzés rögzítése:** minden sor végén gomb; dátum, ellenőr neve,
  eredmény (megfelelt / nem felelt meg) és megjegyzés megadása után az
  utolsó ellenőrzés és a következő esedékesség automatikusan frissül.
- **Exportálás Excelbe:** az aktuálisan szűrt lista .xlsx fájlba menthető.

### 2. Feltöltés fül (Excel import)

1. Húzza be az Excel fájlt az ablakba, vagy válassza ki a gombbal
   (.xlsx, .xls, .csv). A fájl első sora legyen a fejléc.
2. **Oszlopok párosítása:** az alkalmazás a fejléc alapján automatikusan
   felismeri az oszlopokat, de ez szabadon módosítható — így eltérő
   fejlécű Excel fájlok is beolvashatók. Csak a „Gép neve” kötelező.
3. **Áttekintés:** az import előtt látható, hány új gép, hány már létező
   (azonosító alapján felismert) és hány hibás sor van.
   - A már létező gépeknél soronként (vagy egyben) eldönthető:
     **frissítés vagy kihagyás**.
   - A hibás sorok (hiányzó gépnév, értelmezhetetlen dátum vagy ciklus)
     külön listában jelennek meg, és nem szakítják meg az importot.
4. Az importálás után összefoglaló mutatja: hány új, hány frissített és
   hány hibás sor volt.

Kezelt dátumformátumok: `2026.01.15`, `2026. 01. 15.`, `2026-01-15`,
`2026/01/15`, `15.01.2026`, valamint az Excel belső dátumszáma is.

Kipróbáláshoz a `pelda/minta-gepek.xlsx` fájl használható.

### 3. Gépek fül

- A teljes géplista, keresővel; a leselejtezett gépek külön
  jelölőnégyzettel jeleníthetők meg.
- **Sorra kattintva** szerkesztő űrlap nyílik, alatta a gép **ellenőrzési
  előzményei** (dátum, ellenőr, eredmény, megjegyzés).
- **Új gép felvitele** gombbal kézzel is rögzíthető gép.
- **Leselejtezés:** a gép nem törlődik, csak inaktív státuszba kerül
  (később újra aktiválható), és nem jelenik meg az esedékes listában.

### Biztonsági mentés és visszaállítás

A fejléc jobb oldalán:

- **💾 Biztonsági mentés** – az adatbázis-fájl másolása tetszőleges helyre
  (pl. pendrive, hálózati mappa). Érdemes rendszeresen menteni!
- **↩️ Visszaállítás** – egy korábbi mentés visszatöltése. Figyelem: ez
  felülírja a jelenlegi adatokat (a művelet megerősítést kér).

## Fejlesztőknek

### Technológia

- [Electron](https://www.electronjs.org/) – asztali keretrendszer
- [React](https://react.dev/) + [Vite](https://vitejs.dev/) – felhasználói felület
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) – helyi SQLite adatbázis
- [SheetJS (xlsx)](https://sheetjs.com/) – Excel beolvasás és export
- [electron-builder](https://www.electron.build/) – Windows telepítő (NSIS)

### Fejlesztői környezet

```bash
npm install        # függőségek telepítése (a natív modult az Electronhoz fordítja)
npm run dev        # fejlesztői mód: Vite dev szerver + Electron
npm run teszt      # logikai tesztek (dátumkezelés, adatbázis, import)
```

Megjegyzés: a `npm run teszt` sima Node-dal futtatja a better-sqlite3-at.
Ha a modul az Electronhoz lett fordítva (a `postinstall` ezt teszi), a
tesztek előtt futtassa: `npm rebuild better-sqlite3`, utána pedig
`npx electron-builder install-app-deps` állítja vissza az Electron-verziót.

### Windows telepítő készítése

```bash
npm run dist
```

A kész telepítő a `release/` mappába kerül
(`Gepellenorzes Setup <verzió>.exe`). A build Windowson futtatható
közvetlenül; Linux/macOS alól Windows-célra a
[electron-builder dokumentációja](https://www.electron.build/multi-platform-build)
szerint készíthető build.

### Projektszerkezet

```
electron/
  main.cjs      – Electron főfolyamat, ablak, IPC végpontok
  preload.cjs   – biztonságos híd a felület és a főfolyamat között
  db.cjs        – SQLite adatbázis-réteg (gépek, ellenőrzések)
  excel.cjs     – Excel beolvasás, feldolgozás, export
  datum.cjs     – magyar dátumformátumok, esedékesség-számítás
src/
  App.jsx       – fülek, fejléc, mentés/visszaállítás
  tabs/         – Esedékes, Feltöltés, Gépek fülek
  styles.css    – nagy betűs, letisztult stílus
scripts/
  teszt.cjs     – logikai tesztek
  minta.cjs     – minta Excel fájl generálása
pelda/
  minta-gepek.xlsx – kipróbáláshoz használható minta import fájl
```

### Adatmodell

**gepek** tábla: `id`, `nev`, `azonosito` (egyedi), `helyszin`,
`kategoria`, `utolso_ellenorzes`, `ciklus_honap` (alapértelmezés: 6),
`kovetkezo_esedekesseg` (számított), `megjegyzes`,
`statusz` (`aktiv` / `leselejtezett`).

**ellenorzesek** tábla: `id`, `gep_id`, `datum`, `ellenor`,
`eredmeny` (`megfelelt` / `nem_felelt_meg`), `megjegyzes`.

A következő esedékesség mindig az utolsó ellenőrzés dátumából és a gép
saját ciklusából számítódik (hónapvég-kezeléssel, pl. jan. 31. + 1 hónap
= febr. 28.).
