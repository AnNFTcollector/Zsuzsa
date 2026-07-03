import React, { useEffect, useState } from 'react';
import EsedekesTab from './tabs/EsedekesTab.jsx';
import FeltoltesTab from './tabs/FeltoltesTab.jsx';
import GepekTab from './tabs/GepekTab.jsx';

const FULEK = [
  { azon: 'esedekes', felirat: 'Esedékes' },
  { azon: 'feltoltes', felirat: 'Feltöltés' },
  { azon: 'gepek', felirat: 'Gépek' },
];

export default function App() {
  const [aktivFul, setAktivFul] = useState('esedekes');
  const [uzenet, setUzenet] = useState(null);
  const [verzio, setVerzio] = useState('');
  // null | { allapot: 'keres' | 'elerheto' | 'letolt', uj?, telepitesTamogatott?, szazalek? }
  const [frissites, setFrissites] = useState(null);

  useEffect(() => {
    if (window.api.appVerzio) window.api.appVerzio().then(setVerzio).catch(() => {});
    if (window.api.onFrissitesFolyamat) {
      window.api.onFrissitesFolyamat((szazalek) =>
        setFrissites({ allapot: 'letolt', szazalek }));
    }
  }, []);

  function mutatUzenet(szoveg, tipus = 'info') {
    setUzenet({ szoveg, tipus });
    setTimeout(() => setUzenet(null), 6000);
  }

  async function frissitesKeresese() {
    setFrissites({ allapot: 'keres' });
    try {
      const v = await window.api.frissitesEllenorzes();
      if (v.fejlesztoiMod) {
        mutatUzenet('Fejlesztői módban a frissítés-keresés nem érhető el.', 'info');
        setFrissites(null);
        return;
      }
      if (!v.elerheto) {
        mutatUzenet(`Ön a legújabb verziót használja (${v.jelenlegi}).`, 'siker');
        setFrissites(null);
        return;
      }
      setFrissites({ allapot: 'elerheto', uj: v.elerheto, telepitesTamogatott: v.telepitesTamogatott });
    } catch {
      mutatUzenet('Nem sikerült frissítést keresni. Ellenőrizze az internetkapcsolatot!', 'hiba');
      setFrissites(null);
    }
  }

  async function frissitesTelepitese() {
    try {
      const v = await window.api.frissitesTelepites();
      if (v.kezi) {
        mutatUzenet('A letöltési oldal megnyílt a böngészőben. A telepítés után az adatai megmaradnak.', 'info');
        setFrissites(null);
      } else {
        setFrissites({ allapot: 'letolt', szazalek: 0 });
      }
    } catch {
      mutatUzenet('A frissítés letöltése nem sikerült. Próbálja meg később!', 'hiba');
      setFrissites(null);
    }
  }

  async function biztonsagiMentes() {
    try {
      const v = await window.api.biztonsagiMentes();
      if (!v.megszakitva) mutatUzenet(`Biztonsági mentés elkészült: ${v.fajl}`, 'siker');
    } catch (e) {
      mutatUzenet(`Hiba a mentés közben: ${e.message}`, 'hiba');
    }
  }

  async function visszaallitas() {
    try {
      const v = await window.api.visszaallitas();
      if (v.kesz) {
        mutatUzenet('A visszaállítás sikeres volt.', 'siker');
        // Újratöltjük a felületet, hogy minden adat frissüljön
        window.location.reload();
      }
    } catch (e) {
      mutatUzenet(`Hiba a visszaállítás közben: ${e.message}`, 'hiba');
    }
  }

  return (
    <div className="app">
      <header className="fejlec">
        <h1>
          🔧 Gép-ellenőrzési nyilvántartás
          {verzio && <span className="verzio">v{verzio}</span>}
        </h1>
        <div className="fejlec-gombok">
          <button className="gomb masodlagos" onClick={biztonsagiMentes}>
            💾 Biztonsági mentés
          </button>
          <button className="gomb masodlagos" onClick={visszaallitas}>
            ↩️ Visszaállítás
          </button>
          <button className="gomb masodlagos" onClick={frissitesKeresese}
            disabled={!!frissites}>
            🔄 Frissítés
          </button>
        </div>
      </header>

      <nav className="fulek">
        {FULEK.map((f) => (
          <button
            key={f.azon}
            className={`ful ${aktivFul === f.azon ? 'aktiv' : ''}`}
            onClick={() => setAktivFul(f.azon)}
          >
            {f.felirat}
          </button>
        ))}
      </nav>

      {uzenet && <div className={`uzenet ${uzenet.tipus}`}>{uzenet.szoveg}</div>}

      <main className="tartalom">
        {aktivFul === 'esedekes' && <EsedekesTab mutatUzenet={mutatUzenet} />}
        {aktivFul === 'feltoltes' && <FeltoltesTab mutatUzenet={mutatUzenet} />}
        {aktivFul === 'gepek' && <GepekTab mutatUzenet={mutatUzenet} />}
      </main>

      {frissites && frissites.allapot !== null && (
        <FrissitesDialog
          frissites={frissites}
          verzio={verzio}
          telepit={frissitesTelepitese}
          bezar={() => setFrissites(null)}
        />
      )}
    </div>
  );
}

function FrissitesDialog({ frissites, verzio, telepit, bezar }) {
  if (frissites.allapot === 'keres') {
    return (
      <div className="modal-hatter">
        <div className="modal">
          <h2>Frissítés keresése…</h2>
          <p className="modal-alcim">Kapcsolódás a kiadási oldalhoz.</p>
        </div>
      </div>
    );
  }

  if (frissites.allapot === 'letolt') {
    return (
      <div className="modal-hatter">
        <div className="modal">
          <h2>Frissítés letöltése…</h2>
          <p className="modal-alcim">
            A letöltés után az alkalmazás automatikusan újraindul.
            Az adatai biztonságban vannak.
          </p>
          <div className="folyamat-sav">
            <div className="folyamat-kitoltes" style={{ width: `${frissites.szazalek || 0}%` }} />
          </div>
          <p className="felkover" style={{ textAlign: 'center' }}>{frissites.szazalek || 0}%</p>
        </div>
      </div>
    );
  }

  // allapot === 'elerheto'
  return (
    <div className="modal-hatter" onClick={bezar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Új verzió érhető el! 🎉</h2>
        <p className="modal-alcim">
          Jelenlegi verzió: v{verzio} → Új verzió: v{frissites.uj}
        </p>
        <p>
          A frissítés <strong>nem érinti a nyilvántartott adatokat</strong>: az
          adatbázis a felhasználói mappában marad, és a telepítés előtt
          automatikus biztonsági mentés is készül.
        </p>
        {!frissites.telepitesTamogatott && (
          <p>
            Mac gépen a letöltési oldal nyílik meg: töltse le az új .dmg fájlt,
            és húzza az alkalmazást az Alkalmazások mappába (felülírva a régit).
          </p>
        )}
        <div className="modal-gombok">
          <button className="gomb masodlagos" onClick={bezar}>Most nem</button>
          <button className="gomb" onClick={telepit}>
            {frissites.telepitesTamogatott ? '⬇ Frissítés telepítése' : '⬇ Letöltési oldal megnyitása'}
          </button>
        </div>
      </div>
    </div>
  );
}
