import React, { useCallback, useEffect, useState } from 'react';
import { magyarDatum, maISO, aktualisHonap, ALLAPOT_FELIRAT, honapFelirat } from '../segito.js';

export default function EsedekesTab({ mutatUzenet }) {
  const [honap, setHonap] = useState(aktualisHonap());
  const [helyszin, setHelyszin] = useState('');
  const [kategoria, setKategoria] = useState('');
  const [kereses, setKereses] = useState('');
  const [mindenGep, setMindenGep] = useState(false);
  const [adat, setAdat] = useState({ lista: [], osszes: { lejart: 0, esedekes: 0, rendben: 0 } });
  const [szuroErtekek, setSzuroErtekek] = useState({ helyszinek: [], kategoriak: [] });
  const [rogzitendoGep, setRogzitendoGep] = useState(null);

  const szurok = { honap, helyszin, kategoria, kereses, mindenGep };

  const frissit = useCallback(async () => {
    const v = await window.api.esedekesLista({ honap, helyszin, kategoria, kereses, mindenGep });
    setAdat(v);
  }, [honap, helyszin, kategoria, kereses, mindenGep]);

  useEffect(() => { frissit(); }, [frissit]);
  useEffect(() => { window.api.szurok().then(setSzuroErtekek); }, []);

  async function exportal() {
    try {
      const v = await window.api.exportExcel(szurok);
      if (!v.megszakitva) mutatUzenet(`Exportálva ${v.darab} gép: ${v.fajl}`, 'siker');
    } catch (e) {
      mutatUzenet(`Hiba az exportálás közben: ${e.message}`, 'hiba');
    }
  }

  return (
    <div>
      <div className="osszesito">
        <span className="jelvenyt lejart">Lejárt: {adat.osszes.lejart}</span>
        <span className="jelvenyt esedekes">Esedékes ({honapFelirat(honap)}): {adat.osszes.esedekes}</span>
        <span className="jelvenyt rendben">Rendben: {adat.osszes.rendben}</span>
        <button className="gomb" style={{ marginLeft: 'auto' }} onClick={exportal}>
          📄 Exportálás Excelbe
        </button>
      </div>

      <div className="szurosor">
        <label>
          Hónap
          <input type="month" value={honap} onChange={(e) => setHonap(e.target.value || aktualisHonap())} />
        </label>
        <label>
          Helyszín
          <select value={helyszin} onChange={(e) => setHelyszin(e.target.value)}>
            <option value="">Mind</option>
            {szuroErtekek.helyszinek.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </label>
        <label>
          Kategória
          <select value={kategoria} onChange={(e) => setKategoria(e.target.value)}>
            <option value="">Mind</option>
            {szuroErtekek.kategoriak.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="novekvo">
          Keresés
          <input
            type="text"
            placeholder="Gép neve vagy azonosítója…"
            value={kereses}
            onChange={(e) => setKereses(e.target.value)}
          />
        </label>
        <label className="jelolonegyzet">
          <input
            type="checkbox"
            checked={mindenGep}
            onChange={(e) => setMindenGep(e.target.checked)}
          />
          Rendben lévő gépek is
        </label>
      </div>

      {adat.lista.length === 0 ? (
        <p className="ures">
          {mindenGep
            ? 'Nincs a szűrőknek megfelelő gép.'
            : '🎉 Nincs lejárt vagy esedékes ellenőrzés a kiválasztott hónapban.'}
        </p>
      ) : (
        <div className="tabla-gorgeto">
          <table className="tabla">
            <thead>
              <tr>
                <th>Állapot</th>
                <th>Gép neve</th>
                <th>Azonosító</th>
                <th>Helyszín</th>
                <th>Kategória</th>
                <th>Utolsó ellenőrzés</th>
                <th>Következő esedékesség</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {adat.lista.map((g) => (
                <tr key={g.id} className={`sor-${g.allapot}`}>
                  <td><span className={`allapot ${g.allapot}`}>{ALLAPOT_FELIRAT[g.allapot]}</span></td>
                  <td className="felkover">{g.nev}</td>
                  <td>{g.azonosito || '–'}</td>
                  <td>{g.helyszin || '–'}</td>
                  <td>{g.kategoria || '–'}</td>
                  <td>{magyarDatum(g.utolso_ellenorzes)}</td>
                  <td className="felkover">
                    {g.kovetkezo_esedekesseg ? magyarDatum(g.kovetkezo_esedekesseg) : 'nincs ellenőrzés'}
                  </td>
                  <td>
                    <button className="gomb kicsi" onClick={() => setRogzitendoGep(g)}>
                      ✓ Ellenőrzés rögzítése
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rogzitendoGep && (
        <EllenorzesDialog
          gep={rogzitendoGep}
          bezar={() => setRogzitendoGep(null)}
          kesz={() => { setRogzitendoGep(null); frissit(); }}
          mutatUzenet={mutatUzenet}
        />
      )}
    </div>
  );
}

export function EllenorzesDialog({ gep, bezar, kesz, mutatUzenet }) {
  const [datum, setDatum] = useState(maISO());
  const [ellenor, setEllenor] = useState('');
  const [eredmeny, setEredmeny] = useState('megfelelt');
  const [megjegyzes, setMegjegyzes] = useState('');
  const [mentesFolyamatban, setMentesFolyamatban] = useState(false);

  async function ment(e) {
    e.preventDefault();
    if (!datum) return;
    setMentesFolyamatban(true);
    try {
      await window.api.ellenorzesRogzit({ gepId: gep.id, datum, ellenor, eredmeny, megjegyzes });
      mutatUzenet(`Ellenőrzés rögzítve: ${gep.nev}`, 'siker');
      kesz();
    } catch (err) {
      mutatUzenet(`Hiba: ${err.message}`, 'hiba');
      setMentesFolyamatban(false);
    }
  }

  return (
    <div className="modal-hatter" onClick={bezar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Ellenőrzés rögzítése</h2>
        <p className="modal-alcim">
          {gep.nev}{gep.azonosito ? ` (${gep.azonosito})` : ''}
        </p>
        <form onSubmit={ment} className="urlap">
          <label>
            Ellenőrzés dátuma *
            <input type="date" value={datum} required onChange={(e) => setDatum(e.target.value)} />
          </label>
          <label>
            Ellenőr neve
            <input type="text" value={ellenor} placeholder="Pl. Kovács János"
              onChange={(e) => setEllenor(e.target.value)} />
          </label>
          <label>
            Eredmény
            <select value={eredmeny} onChange={(e) => setEredmeny(e.target.value)}>
              <option value="megfelelt">Megfelelt</option>
              <option value="nem_felelt_meg">Nem felelt meg</option>
            </select>
          </label>
          <label>
            Megjegyzés
            <textarea rows={3} value={megjegyzes} onChange={(e) => setMegjegyzes(e.target.value)} />
          </label>
          <div className="modal-gombok">
            <button type="button" className="gomb masodlagos" onClick={bezar}>Mégse</button>
            <button type="submit" className="gomb" disabled={mentesFolyamatban}>Mentés</button>
          </div>
        </form>
      </div>
    </div>
  );
}
