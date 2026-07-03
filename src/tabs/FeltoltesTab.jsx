import React, { useState } from 'react';
import { magyarDatum } from '../segito.js';

// Az adatbázis mezői, amelyekhez Excel oszlopot lehet rendelni
const MEZOK = [
  { azon: 'nev', felirat: 'Gép neve', kotelezo: true, minta: /n[eé]v|megnevez|g[eé]p/i },
  { azon: 'azonosito', felirat: 'Azonosító / leltári szám', minta: /azonos|lelt[aá]r|szám|k[oó]d/i },
  { azon: 'helyszin', felirat: 'Helyszín', minta: /helysz[ií]n|hely|konyha|egys[eé]g|telephely/i },
  { azon: 'kategoria', felirat: 'Típus / kategória', minta: /kateg[oó]ria|t[ií]pus|fajta/i },
  { azon: 'utolso_ellenorzes', felirat: 'Utolsó ellenőrzés dátuma', minta: /utols[oó]|ellen[oő]rz|d[aá]tum|vizsg[aá]/i },
  { azon: 'ciklus_honap', felirat: 'Ellenőrzési ciklus (hónap)', minta: /ciklus|gyakoris[aá]g|id[oő]k[oö]z/i },
  { azon: 'megjegyzes', felirat: 'Megjegyzés', minta: /megjegyz|jegyzet|coment|komment/i },
];

function automatikusParositas(fejlec) {
  const mapping = {};
  const felhasznalt = new Set();
  for (const mezo of MEZOK) {
    mapping[mezo.azon] = -1;
    for (let i = 0; i < fejlec.length; i++) {
      if (!felhasznalt.has(i) && mezo.minta.test(fejlec[i] || '')) {
        mapping[mezo.azon] = i;
        felhasznalt.add(i);
        break;
      }
    }
  }
  return mapping;
}

export default function FeltoltesTab({ mutatUzenet }) {
  // lepes: 'valasztas' -> 'parositas' -> 'attekintes' -> 'kesz'
  const [lepes, setLepes] = useState('valasztas');
  const [fajlNev, setFajlNev] = useState('');
  const [munkalapok, setMunkalapok] = useState([]);
  const [munkalapIndex, setMunkalapIndex] = useState(0);
  const [mapping, setMapping] = useState({});
  const [feldolgozott, setFeldolgozott] = useState(null);
  const [dupDontesek, setDupDontesek] = useState({});
  const [osszegzes, setOsszegzes] = useState(null);
  const [huzasAktiv, setHuzasAktiv] = useState(false);

  const munkalap = munkalapok[munkalapIndex];

  function betolt(nev, eredmeny) {
    if (!eredmeny.munkalapok || !eredmeny.munkalapok.length) {
      mutatUzenet('A fájlban nem található adat.', 'hiba');
      return;
    }
    setFajlNev(nev);
    setMunkalapok(eredmeny.munkalapok);
    setMunkalapIndex(0);
    setMapping(automatikusParositas(eredmeny.munkalapok[0].fejlec));
    setLepes('parositas');
  }

  async function fajlValasztas() {
    try {
      const v = await window.api.excelFajlValaszt();
      if (v.megszakitva) return;
      betolt(v.fajlNev, v);
    } catch (e) {
      mutatUzenet(`Nem sikerült beolvasni a fájlt: ${e.message}`, 'hiba');
    }
  }

  async function fajlBeejtve(e) {
    e.preventDefault();
    setHuzasAktiv(false);
    const fajl = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!fajl) return;
    if (!/\.(xlsx|xls|xlsm|csv)$/i.test(fajl.name)) {
      mutatUzenet('Csak Excel fájl (.xlsx, .xls, .csv) tölthető fel.', 'hiba');
      return;
    }
    try {
      const buffer = await fajl.arrayBuffer();
      const v = await window.api.excelBeolvas(buffer);
      betolt(fajl.name, v);
    } catch (err) {
      mutatUzenet(`Nem sikerült beolvasni a fájlt: ${err.message}`, 'hiba');
    }
  }

  function munkalapValtas(index) {
    setMunkalapIndex(index);
    setMapping(automatikusParositas(munkalapok[index].fejlec));
  }

  async function feldolgozas() {
    if (mapping.nev === undefined || mapping.nev < 0) {
      mutatUzenet('A „Gép neve” mező hozzárendelése kötelező!', 'hiba');
      return;
    }
    try {
      const v = await window.api.importFeldolgoz({ sorok: munkalap.sorok, mapping });
      setFeldolgozott(v);
      const dontesek = {};
      v.duplikatumok.forEach((d, i) => { dontesek[i] = 'frissit'; });
      setDupDontesek(dontesek);
      setLepes('attekintes');
    } catch (e) {
      mutatUzenet(`Hiba a feldolgozás közben: ${e.message}`, 'hiba');
    }
  }

  async function importalas() {
    const frissitendok = feldolgozott.duplikatumok
      .filter((_, i) => dupDontesek[i] === 'frissit')
      .map((d) => ({ ...d.uj, id: d.letezo.id }));
    const kihagyott = feldolgozott.duplikatumok.length - frissitendok.length;
    try {
      const v = await window.api.importVeglegesit({ ujak: feldolgozott.ujak, frissitendok });
      setOsszegzes({ ...v, kihagyott, hibak: feldolgozott.hibak });
      setLepes('kesz');
    } catch (e) {
      mutatUzenet(`Hiba az importálás közben: ${e.message}`, 'hiba');
    }
  }

  function ujraKezd() {
    setLepes('valasztas');
    setFajlNev('');
    setMunkalapok([]);
    setFeldolgozott(null);
    setOsszegzes(null);
  }

  // ---- 1. lépés: fájlválasztás ----
  if (lepes === 'valasztas') {
    return (
      <div>
        <h2>Excel fájl feltöltése</h2>
        <div
          className={`ejtozona ${huzasAktiv ? 'aktiv' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setHuzasAktiv(true); }}
          onDragLeave={() => setHuzasAktiv(false)}
          onDrop={fajlBeejtve}
        >
          <p className="ejtozona-ikon">📥</p>
          <p>Húzza ide az Excel fájlt,</p>
          <p>vagy</p>
          <button className="gomb" onClick={fajlValasztas}>Fájl kiválasztása…</button>
        </div>
        <p className="sugo">
          Támogatott formátumok: .xlsx, .xls, .csv — Az első sor legyen a fejléc
          (oszlopnevek). A következő lépésben megadhatja, melyik oszlop mit jelent.
        </p>
      </div>
    );
  }

  // ---- 2. lépés: oszlop-hozzárendelés ----
  if (lepes === 'parositas') {
    return (
      <div>
        <h2>Oszlopok párosítása – {fajlNev}</h2>
        {munkalapok.length > 1 && (
          <label className="mezo-sor">
            Munkalap:
            <select value={munkalapIndex} onChange={(e) => munkalapValtas(Number(e.target.value))}>
              {munkalapok.map((m, i) => <option key={i} value={i}>{m.nev}</option>)}
            </select>
          </label>
        )}
        <p className="sugo">
          Válassza ki, hogy az Excel melyik oszlopa melyik adatnak felel meg.
          A felismert oszlopokat automatikusan párosítottuk — ellenőrizze!
        </p>
        <div className="parosito">
          {MEZOK.map((mezo) => (
            <label key={mezo.azon} className="parosito-sor">
              <span className={mezo.kotelezo ? 'felkover' : ''}>
                {mezo.felirat}{mezo.kotelezo ? ' *' : ''}
              </span>
              <select
                value={mapping[mezo.azon] ?? -1}
                onChange={(e) => setMapping({ ...mapping, [mezo.azon]: Number(e.target.value) })}
              >
                <option value={-1}>— nincs ilyen oszlop —</option>
                {munkalap.fejlec.map((f, i) => (
                  <option key={i} value={i}>{f || `(${i + 1}. oszlop)`}</option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <h3>Előnézet (első {Math.min(8, munkalap.sorok.length)} sor a {munkalap.sorok.length}-ból/ből)</h3>
        <div className="tabla-gorgeto">
          <table className="tabla kicsi-tabla">
            <thead>
              <tr>{munkalap.fejlec.map((f, i) => <th key={i}>{f || `(${i + 1}.)`}</th>)}</tr>
            </thead>
            <tbody>
              {munkalap.sorok.slice(0, 8).map((sor, i) => (
                <tr key={i}>{sor.map((c, j) => <td key={j}>{c === null ? '' : String(c)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="modal-gombok">
          <button className="gomb masodlagos" onClick={ujraKezd}>Vissza</button>
          <button className="gomb" onClick={feldolgozas}>Tovább az ellenőrzéshez →</button>
        </div>
      </div>
    );
  }

  // ---- 3. lépés: áttekintés (új / duplikátum / hibás) ----
  if (lepes === 'attekintes') {
    const { ujak, duplikatumok, hibak } = feldolgozott;
    return (
      <div>
        <h2>Import áttekintése – {fajlNev}</h2>
        <div className="osszesito">
          <span className="jelvenyt rendben">Új gép: {ujak.length}</span>
          <span className="jelvenyt esedekes">Már létező (azonosító egyezik): {duplikatumok.length}</span>
          <span className="jelvenyt lejart">Hibás sor: {hibak.length}</span>
        </div>

        {duplikatumok.length > 0 && (
          <section>
            <h3>Már létező gépek — mi történjen velük?</h3>
            <div className="modal-gombok balra">
              <button className="gomb kicsi masodlagos"
                onClick={() => setDupDontesek(Object.fromEntries(duplikatumok.map((_, i) => [i, 'frissit'])))}>
                Mindet frissíti
              </button>
              <button className="gomb kicsi masodlagos"
                onClick={() => setDupDontesek(Object.fromEntries(duplikatumok.map((_, i) => [i, 'kihagy'])))}>
                Mindet kihagyja
              </button>
            </div>
            <div className="tabla-gorgeto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Azonosító</th><th>Gép neve (fájlban)</th><th>Meglévő név</th>
                    <th>Új utolsó ellenőrzés</th><th>Döntés</th>
                  </tr>
                </thead>
                <tbody>
                  {duplikatumok.map((d, i) => (
                    <tr key={i}>
                      <td>{d.uj.azonosito}</td>
                      <td>{d.uj.nev}</td>
                      <td>{d.letezo.nev}</td>
                      <td>{magyarDatum(d.uj.utolso_ellenorzes)}</td>
                      <td>
                        <select value={dupDontesek[i]}
                          onChange={(e) => setDupDontesek({ ...dupDontesek, [i]: e.target.value })}>
                          <option value="frissit">Frissítés</option>
                          <option value="kihagy">Kihagyás</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {hibak.length > 0 && (
          <section>
            <h3>Hibás sorok (nem kerülnek importálásra)</h3>
            <div className="tabla-gorgeto">
              <table className="tabla hibas-tabla">
                <thead>
                  <tr><th>Sor</th><th>Gép neve</th><th>Azonosító</th><th>Hiba oka</th></tr>
                </thead>
                <tbody>
                  {hibak.map((h, i) => (
                    <tr key={i}>
                      <td>{h.sorszam}.</td><td>{h.nev}</td><td>{h.azonosito}</td><td>{h.ok}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {ujak.length > 0 && (
          <section>
            <h3>Új gépek</h3>
            <div className="tabla-gorgeto">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Gép neve</th><th>Azonosító</th><th>Helyszín</th><th>Kategória</th>
                    <th>Utolsó ellenőrzés</th><th>Ciklus</th>
                  </tr>
                </thead>
                <tbody>
                  {ujak.map((g, i) => (
                    <tr key={i}>
                      <td>{g.nev}</td>
                      <td>{g.azonosito || '–'}</td>
                      <td>{g.helyszin || '–'}</td>
                      <td>{g.kategoria || '–'}</td>
                      <td>{magyarDatum(g.utolso_ellenorzes)}</td>
                      <td>{g.ciklus_honap || 6} hónap</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <div className="modal-gombok">
          <button className="gomb masodlagos" onClick={() => setLepes('parositas')}>← Vissza</button>
          <button className="gomb" onClick={importalas}
            disabled={ujak.length === 0 && duplikatumok.length === 0}>
            ✓ Importálás
          </button>
        </div>
      </div>
    );
  }

  // ---- 4. lépés: összefoglaló ----
  return (
    <div>
      <h2>Import kész ✓</h2>
      <div className="osszefoglalo">
        <p><strong>{osszegzes.uj}</strong> új gép felvéve</p>
        <p><strong>{osszegzes.frissitett}</strong> gép frissítve</p>
        <p><strong>{osszegzes.kihagyott}</strong> már létező gép kihagyva</p>
        <p><strong>{osszegzes.hibak.length}</strong> hibás sor kimaradt</p>
      </div>
      {osszegzes.hibak.length > 0 && (
        <div className="tabla-gorgeto">
          <table className="tabla hibas-tabla">
            <thead>
              <tr><th>Sor</th><th>Gép neve</th><th>Azonosító</th><th>Hiba oka</th></tr>
            </thead>
            <tbody>
              {osszegzes.hibak.map((h, i) => (
                <tr key={i}>
                  <td>{h.sorszam}.</td><td>{h.nev}</td><td>{h.azonosito}</td><td>{h.ok}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="modal-gombok balra">
        <button className="gomb" onClick={ujraKezd}>Új fájl feltöltése</button>
      </div>
    </div>
  );
}
