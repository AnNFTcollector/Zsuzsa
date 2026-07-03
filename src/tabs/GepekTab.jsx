import React, { useCallback, useEffect, useState } from 'react';
import { magyarDatum, EREDMENY_FELIRAT } from '../segito.js';

const URES_GEP = {
  nev: '', azonosito: '', helyszin: '', kategoria: '',
  utolso_ellenorzes: '', ciklus_honap: 6, megjegyzes: '',
};

export default function GepekTab({ mutatUzenet }) {
  const [kereses, setKereses] = useState('');
  const [leselejtezettekIs, setLeselejtezettekIs] = useState(false);
  const [gepek, setGepek] = useState([]);
  const [nyitottGep, setNyitottGep] = useState(null); // szerkesztéshez / új géphez

  const frissit = useCallback(async () => {
    const lista = await window.api.gepLista({
      kereses,
      statusz: leselejtezettekIs ? '' : 'aktiv',
    });
    setGepek(lista);
  }, [kereses, leselejtezettekIs]);

  useEffect(() => { frissit(); }, [frissit]);

  return (
    <div>
      <div className="szurosor">
        <label className="novekvo">
          Keresés
          <input type="text" placeholder="Gép neve vagy azonosítója…"
            value={kereses} onChange={(e) => setKereses(e.target.value)} />
        </label>
        <label className="jelolonegyzet">
          <input type="checkbox" checked={leselejtezettekIs}
            onChange={(e) => setLeselejtezettekIs(e.target.checked)} />
          Leselejtezett gépek is
        </label>
        <button className="gomb" style={{ marginLeft: 'auto' }}
          onClick={() => setNyitottGep({ ...URES_GEP })}>
          ＋ Új gép felvitele
        </button>
      </div>

      {gepek.length === 0 ? (
        <p className="ures">Nincs a keresésnek megfelelő gép. Új gépet a fenti gombbal,
          vagy Excel-feltöltéssel vehet fel.</p>
      ) : (
        <div className="tabla-gorgeto">
          <table className="tabla kattinthato">
            <thead>
              <tr>
                <th>Gép neve</th>
                <th>Azonosító</th>
                <th>Helyszín</th>
                <th>Kategória</th>
                <th>Utolsó ellenőrzés</th>
                <th>Ciklus</th>
                <th>Következő esedékesség</th>
                <th>Státusz</th>
              </tr>
            </thead>
            <tbody>
              {gepek.map((g) => (
                <tr key={g.id} className={g.statusz === 'leselejtezett' ? 'sor-inaktiv' : ''}
                  onClick={() => setNyitottGep(g)} title="Kattintson a szerkesztéshez">
                  <td className="felkover">{g.nev}</td>
                  <td>{g.azonosito || '–'}</td>
                  <td>{g.helyszin || '–'}</td>
                  <td>{g.kategoria || '–'}</td>
                  <td>{magyarDatum(g.utolso_ellenorzes)}</td>
                  <td>{g.ciklus_honap} hónap</td>
                  <td>{magyarDatum(g.kovetkezo_esedekesseg)}</td>
                  <td>{g.statusz === 'aktiv' ? 'Aktív' : 'Leselejtezett'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nyitottGep && (
        <GepDialog
          gep={nyitottGep}
          bezar={() => setNyitottGep(null)}
          kesz={() => { setNyitottGep(null); frissit(); }}
          mutatUzenet={mutatUzenet}
        />
      )}
    </div>
  );
}

function GepDialog({ gep, bezar, kesz, mutatUzenet }) {
  const [adat, setAdat] = useState({
    ...gep,
    azonosito: gep.azonosito || '',
    helyszin: gep.helyszin || '',
    kategoria: gep.kategoria || '',
    utolso_ellenorzes: gep.utolso_ellenorzes || '',
    megjegyzes: gep.megjegyzes || '',
  });
  const [elozmenyek, setElozmenyek] = useState([]);

  const ujGep = !gep.id;

  useEffect(() => {
    if (gep.id) window.api.elozmenyek(gep.id).then(setElozmenyek);
  }, [gep.id]);

  function mezo(nev) {
    return {
      value: adat[nev],
      onChange: (e) => setAdat({ ...adat, [nev]: e.target.value }),
    };
  }

  async function ment(e) {
    e.preventDefault();
    try {
      await window.api.gepMentes(adat);
      mutatUzenet(ujGep ? `Új gép felvéve: ${adat.nev}` : `Mentve: ${adat.nev}`, 'siker');
      kesz();
    } catch (err) {
      mutatUzenet(`Hiba: ${err.message}`, 'hiba');
    }
  }

  async function statuszValtas() {
    const leselejtezes = adat.statusz === 'aktiv';
    if (leselejtezes && !window.confirm(
      `Biztosan leselejtezi ezt a gépet?\n\n${adat.nev}\n\nA gép nem törlődik, csak inaktív lesz, és nem jelenik meg az esedékes listában.`)) {
      return;
    }
    try {
      await window.api.gepStatusz(adat.id, leselejtezes ? 'leselejtezett' : 'aktiv');
      mutatUzenet(leselejtezes ? `Leselejtezve: ${adat.nev}` : `Újra aktív: ${adat.nev}`, 'siker');
      kesz();
    } catch (err) {
      mutatUzenet(`Hiba: ${err.message}`, 'hiba');
    }
  }

  return (
    <div className="modal-hatter" onClick={bezar}>
      <div className="modal szeles" onClick={(e) => e.stopPropagation()}>
        <h2>{ujGep ? 'Új gép felvitele' : 'Gép szerkesztése'}</h2>
        <form onSubmit={ment} className="urlap ketoszlopos">
          <label>
            Gép neve *
            <input type="text" required placeholder="Pl. Ipari mosogatógép" {...mezo('nev')} />
          </label>
          <label>
            Azonosító / leltári szám
            <input type="text" placeholder="Pl. K-0042" {...mezo('azonosito')} />
          </label>
          <label>
            Helyszín
            <input type="text" placeholder="Pl. Központi konyha" {...mezo('helyszin')} />
          </label>
          <label>
            Típus / kategória
            <input type="text" placeholder="Pl. Konyhagép" {...mezo('kategoria')} />
          </label>
          <label>
            Utolsó ellenőrzés dátuma
            <input type="date" {...mezo('utolso_ellenorzes')} />
          </label>
          <label>
            Ellenőrzési ciklus (hónap) *
            <input type="number" min="1" max="120" required {...mezo('ciklus_honap')} />
          </label>
          <label className="teljes-sor">
            Megjegyzés
            <textarea rows={2} {...mezo('megjegyzes')} />
          </label>

          <div className="modal-gombok teljes-sor">
            {!ujGep && (
              adat.statusz === 'aktiv' ? (
                <button type="button" className="gomb veszelyes" onClick={statuszValtas}>
                  🗑 Leselejtezés
                </button>
              ) : (
                <button type="button" className="gomb masodlagos" onClick={statuszValtas}>
                  ♻️ Újra aktiválás
                </button>
              )
            )}
            <span style={{ flex: 1 }} />
            <button type="button" className="gomb masodlagos" onClick={bezar}>Mégse</button>
            <button type="submit" className="gomb">Mentés</button>
          </div>
        </form>

        {!ujGep && (
          <section className="elozmenyek">
            <h3>Ellenőrzési előzmények</h3>
            {elozmenyek.length === 0 ? (
              <p className="ures">Ehhez a géphez még nincs rögzített ellenőrzés.</p>
            ) : (
              <div className="tabla-gorgeto">
                <table className="tabla kicsi-tabla">
                  <thead>
                    <tr><th>Dátum</th><th>Ellenőr</th><th>Eredmény</th><th>Megjegyzés</th></tr>
                  </thead>
                  <tbody>
                    {elozmenyek.map((e) => (
                      <tr key={e.id}>
                        <td>{magyarDatum(e.datum)}</td>
                        <td>{e.ellenor || '–'}</td>
                        <td className={e.eredmeny === 'nem_felelt_meg' ? 'piros-szoveg' : ''}>
                          {EREDMENY_FELIRAT[e.eredmeny] || '–'}
                        </td>
                        <td>{e.megjegyzes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
