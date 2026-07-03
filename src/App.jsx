import React, { useState } from 'react';
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

  function mutatUzenet(szoveg, tipus = 'info') {
    setUzenet({ szoveg, tipus });
    setTimeout(() => setUzenet(null), 6000);
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
        <h1>🔧 Gép-ellenőrzési nyilvántartás</h1>
        <div className="fejlec-gombok">
          <button className="gomb masodlagos" onClick={biztonsagiMentes}>
            💾 Biztonsági mentés
          </button>
          <button className="gomb masodlagos" onClick={visszaallitas}>
            ↩️ Visszaállítás
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
    </div>
  );
}
