# Gép-ellenőrzési nyilvántartás

Magyar nyelvű asztali alkalmazás Windowsra és macOS-re (MacBook),
munkavédelmi gép-ellenőrzések nyilvántartásához. Konyhai és egyéb gépek időszakos (jellemzően 6 havonta
esedékes) ellenőrzéseit tartja számon: megmutatja, mely gépek ellenőrzése
esedékes az adott hónapban, és melyek csúsztak már le.

Az alkalmazás **teljesen offline** működik, minden adat a saját gépen,
egy helyi SQLite adatbázis-fájlban tárolódik.

## Telepítés (felhasználóknak)

### Windows

1. Töltse le a telepítőt (`Gepellenorzes Setup 1.0.0.exe` a `release`
   mappából, vagy a kapott linkről).
2. Indítsa el, és kövesse a telepítő lépéseit (a telepítési mappa
   megváltoztatható).
3. A telepítés után az alkalmazás a Start menüből vagy az asztali
   **Gép-ellenőrzés** ikonnal indítható.

### macOS (MacBook)

1. Töltse le a lemezképet (`Gepellenorzes-1.0.0-arm64.dmg` újabb,
   Apple Silicon / M-chipes MacBookhoz, `Gepellenorzes-1.0.0.dmg`
   régebbi, Intel-es MacBookhoz).
2. Nyissa meg a .dmg fájlt, és húzza az alkalmazást az **Applications**
   (Alkalmazások) mappába.
3. **Első indításkor:** mivel az alkalmazás nincs Apple fejlesztői
   tanúsítvánnyal aláírva, a macOS figyelmeztetést mutathat. Ilyenkor
   kattintson **jobb gombbal** (vagy Ctrl + kattintás) az alkalmazásra,
   és válassza a **Megnyitás** menüpontot, majd erősítse meg. Ezt csak
   egyszer kell megtenni. (Újabb macOS-en: Rendszerbeállítások →
   Adatvédelem és biztonság → „Megnyitás mindenképp”.)

**Fontos:** az adatbázis nem a program mappájában, hanem a felhasználói
profilban tárolódik, így az alkalmazás frissítésekor (újratelepítésekor)
**az adatok nem vesznek el**:

- Windows: `C:\Users\<felhasználó>\AppData\Roaming\Gepellenorzes\gepek.db`
- macOS: `~/Library/Application Support/Gepellenorzes/gepek.db`

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

### Alkalmazás frissítése

A fejlécben lévő **🔄 Frissítés** gomb megnézi, van-e újabb kiadás a
projekt GitHub-oldalán (Releases):

- **Windowson** a frissítés automatikusan letöltődik (folyamatjelzővel),
  majd az alkalmazás újraindul az új verzióval.
- **Macen** a letöltési oldal nyílik meg a böngészőben: az új .dmg-t kell
  letölteni és az alkalmazást az Alkalmazások mappába húzni (a régit
  felülírva).

**Az adatok frissítéskor nem vesznek el:**

- az adatbázis nem a program mappájában, hanem a felhasználói profilban
  van (lásd fent), amihez a telepítő nem nyúl,
- ráadásul Windowson a frissítés telepítése előtt az alkalmazás
  **automatikus biztonsági mentést** készít a
  `<felhasználói mappa>\Gepellenorzes\mentesek` mappába (az utolsó 10
  mentés marad meg).

A frissítés-kereséshez internetkapcsolat kell — minden más funkció
offline működik.

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

### Telepítő készítése

```bash
npm run dist       # Windows telepítő (.exe) – Windowson futtatandó
npm run dist:mac   # macOS lemezkép (.dmg)  – Macen futtatandó
```

A kész telepítők a `release/` mappába kerülnek:

- Windows: `Gepellenorzes Setup <verzió>.exe`
- macOS: `Gepellenorzes-<verzió>-arm64.dmg` (Apple Silicon / M-chip) és
  `Gepellenorzes-<verzió>.dmg` (Intel)

A macOS buildet Macen, a Windows buildet Windowson érdemes futtatni —
a natív SQLite modul miatt keresztplatformos buildhez az
[electron-builder dokumentációja](https://www.electron.build/multi-platform-build)
ad útmutatót. A macOS build alapból aláírás nélkül készül; ha van Apple
Developer tanúsítvány, az electron-builder automatikusan használja.

### Új verzió kiadása (a Frissítés gombhoz)

Az alkalmazás a GitHub Releases-ből frissül (`electron-updater`).
Új verzió kiadásának lépései:

1. Emelje meg a verziószámot a `package.json`-ban (pl. `1.0.1`).
2. Buildelje a telepítőt: `npm run dist` (Windowson).
3. Hozzon létre a GitHub-on egy új Release-t `v1.0.1` taggel, és töltse
   fel hozzá a `release/` mappából:
   - `Gepellenorzes Setup 1.0.1.exe`
   - `Gepellenorzes Setup 1.0.1.exe.blockmap`
   - `latest.yml` ← **ez kötelező**, e nélkül a Frissítés gomb nem
     találja meg az új verziót
   - Mac esetén (`npm run dist:mac` után): a `.dmg` fájlokat is.
4. Tegye közzé (Publish) a Release-t.

Tokennel egy lépésben is megy:
`GH_TOKEN=<github-token> npx electron-builder --win --publish always`

**Fontos:** a frissítéshez a repónak **publikusnak** kell lennie, mert a
felhasználók gépén futó alkalmazás hitelesítés nélkül kérdezi le a
kiadásokat. Privát repó esetén a Frissítés gomb nem fog működni.

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
