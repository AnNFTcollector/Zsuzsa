const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const db = require('./db.cjs');
const excel = require('./excel.cjs');
const { maISO } = require('./datum.cjs');

const KIADASOK_OLDAL = 'https://github.com/AnNFTcollector/Zsuzsa/releases/latest';

let ablak = null;

function letrehozAblak() {
  ablak = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 640,
    title: 'Gép-ellenőrzési nyilvántartás',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    ablak.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    ablak.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

function regisztralIpc() {
  // -- Esedékes fül --
  ipcMain.handle('esedekes:lista', (_e, szurok) => db.esedekesLista(szurok || {}));

  ipcMain.handle('esedekes:export', async (_e, szurok) => {
    const { lista } = db.esedekesLista(szurok || {});
    const { canceled, filePath } = await dialog.showSaveDialog(ablak, {
      title: 'Lista exportálása Excelbe',
      defaultPath: `esedekes-gepek-${maISO()}.xlsx`,
      filters: [{ name: 'Excel fájl', extensions: ['xlsx'] }],
    });
    if (canceled || !filePath) return { megszakitva: true };
    excel.exportEsedekes(filePath, lista);
    return { fajl: filePath, darab: lista.length };
  });

  // -- Gépek --
  ipcMain.handle('gepek:lista', (_e, szurok) => db.gepLista(szurok || {}));
  ipcMain.handle('gepek:mentes', (_e, gep) => {
    if (!gep || !gep.nev || !gep.nev.trim()) throw new Error('A gép neve kötelező.');
    try {
      return db.gepMentes(gep);
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        throw new Error('Ezzel az azonosítóval már létezik gép.');
      }
      throw err;
    }
  });
  ipcMain.handle('gepek:statusz', (_e, { id, statusz }) => db.gepStatusz(id, statusz));
  ipcMain.handle('gepek:szurok', () => db.szuroErtekek());
  ipcMain.handle('gepek:elozmenyek', (_e, gepId) => db.elozmenyek(gepId));

  // -- Ellenőrzés rögzítése --
  ipcMain.handle('ellenorzes:rogzit', (_e, adat) => db.ellenorzesRogzit(adat));

  // -- Import --
  ipcMain.handle('import:beolvas', (_e, arrayBuffer) =>
    excel.beolvas(Buffer.from(arrayBuffer)));

  ipcMain.handle('import:fajlvalaszt', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(ablak, {
      title: 'Excel fájl kiválasztása',
      filters: [{ name: 'Excel fájlok', extensions: ['xlsx', 'xls', 'xlsm', 'csv'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { megszakitva: true };
    const buffer = fs.readFileSync(filePaths[0]);
    return { fajlNev: path.basename(filePaths[0]), ...excel.beolvas(buffer) };
  });

  ipcMain.handle('import:feldolgoz', (_e, adat) => excel.feldolgoz(adat));
  ipcMain.handle('import:veglegesit', (_e, adat) => db.importVeglegesit(adat));

  // -- Biztonsági mentés / visszaállítás --
  ipcMain.handle('mentes:backup', async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(ablak, {
      title: 'Biztonsági mentés készítése',
      defaultPath: `gepek-mentes-${maISO()}.db`,
      filters: [{ name: 'Adatbázis fájl', extensions: ['db'] }],
    });
    if (canceled || !filePath) return { megszakitva: true };
    await db.megnyitott().backup(filePath);
    return { fajl: filePath };
  });

  ipcMain.handle('mentes:restore', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(ablak, {
      title: 'Biztonsági mentés visszaállítása',
      filters: [{ name: 'Adatbázis fájl', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (canceled || !filePaths.length) return { megszakitva: true };

    const { response } = await dialog.showMessageBox(ablak, {
      type: 'warning',
      buttons: ['Visszaállítás', 'Mégse'],
      defaultId: 1,
      cancelId: 1,
      title: 'Visszaállítás megerősítése',
      message: 'A visszaállítás felülírja a jelenlegi adatbázist!',
      detail: 'A jelenlegi adatok elvesznek, és a kiválasztott mentés lép a helyükbe. Biztosan folytatja?',
    });
    if (response !== 0) return { megszakitva: true };

    const cel = db.utvonal();
    db.bezar();
    // WAL segédfájlok eltávolítása, hogy ne keveredjenek a régi adatokkal
    for (const kiterjesztes of ['-wal', '-shm']) {
      try { fs.unlinkSync(cel + kiterjesztes); } catch { /* nem baj, ha nincs */ }
    }
    fs.copyFileSync(filePaths[0], cel);
    db.megnyit(path.dirname(cel));
    return { kesz: true };
  });

  ipcMain.handle('app:adatbazisUtvonal', () => db.utvonal());
  ipcMain.handle('app:verzio', () => app.getVersion());

  // -- Frissítés (GitHub Releases) --
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.on('download-progress', (p) => {
    if (ablak && !ablak.isDestroyed()) {
      ablak.webContents.send('frissites:folyamat', Math.round(p.percent));
    }
  });

  ipcMain.handle('frissites:ellenorzes', async () => {
    if (!app.isPackaged) {
      return { jelenlegi: app.getVersion(), fejlesztoiMod: true };
    }
    const eredmeny = await new Promise((resolve, reject) => {
      const kesz = (fn) => (adat) => {
        autoUpdater.removeAllListeners('update-available');
        autoUpdater.removeAllListeners('update-not-available');
        autoUpdater.removeAllListeners('error');
        fn(adat);
      };
      autoUpdater.once('update-available', kesz((info) => resolve({ elerheto: info.version })));
      autoUpdater.once('update-not-available', kesz(() => resolve({ elerheto: null })));
      autoUpdater.once('error', kesz(reject));
      autoUpdater.checkForUpdates().catch(kesz(reject));
    });
    return {
      jelenlegi: app.getVersion(),
      ...eredmeny,
      // Aláíratlan macOS-alkalmazás nem tud helyben frissülni, ott a
      // letöltési oldalt nyitjuk meg
      telepitesTamogatott: process.platform === 'win32',
    };
  });

  ipcMain.handle('frissites:telepites', async () => {
    if (process.platform !== 'win32') {
      await shell.openExternal(KIADASOK_OLDAL);
      return { kezi: true };
    }
    // Biztonsági okból a telepítés előtt automatikus mentés készül
    await automatikusMentes();
    autoUpdater.once('update-downloaded', () => {
      // Az adatbázist rendben lezárjuk, mielőtt a telepítő újraindítja az appot
      setImmediate(() => {
        db.bezar();
        autoUpdater.quitAndInstall();
      });
    });
    await autoUpdater.downloadUpdate();
    return { letoltesElindult: true };
  });

  ipcMain.handle('frissites:letoltesOldal', () => shell.openExternal(KIADASOK_OLDAL));
}

// Automatikus biztonsági mentés a userData/mentesek mappába (max. 10 marad)
async function automatikusMentes() {
  const mappa = path.join(app.getPath('userData'), 'mentesek');
  fs.mkdirSync(mappa, { recursive: true });
  const idobelyeg = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  await db.megnyitott().backup(path.join(mappa, `gepek-frissites-elott-${idobelyeg}.db`));
  const fajlok = fs.readdirSync(mappa).filter((f) => f.endsWith('.db')).sort();
  while (fajlok.length > 10) {
    fs.unlinkSync(path.join(mappa, fajlok.shift()));
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  db.megnyit(app.getPath('userData'));
  regisztralIpc();
  letrehozAblak();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) letrehozAblak();
  });
});

app.on('window-all-closed', () => {
  db.bezar();
  app.quit();
});
