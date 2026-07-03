const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const db = require('./db.cjs');
const excel = require('./excel.cjs');
const { maISO } = require('./datum.cjs');

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
