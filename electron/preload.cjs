const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Esedékes fül
  esedekesLista: (szurok) => ipcRenderer.invoke('esedekes:lista', szurok),
  exportExcel: (szurok) => ipcRenderer.invoke('esedekes:export', szurok),

  // Gépek
  gepLista: (szurok) => ipcRenderer.invoke('gepek:lista', szurok),
  gepMentes: (gep) => ipcRenderer.invoke('gepek:mentes', gep),
  gepStatusz: (id, statusz) => ipcRenderer.invoke('gepek:statusz', { id, statusz }),
  szurok: () => ipcRenderer.invoke('gepek:szurok'),
  elozmenyek: (gepId) => ipcRenderer.invoke('gepek:elozmenyek', gepId),

  // Ellenőrzés rögzítése
  ellenorzesRogzit: (adat) => ipcRenderer.invoke('ellenorzes:rogzit', adat),

  // Import
  excelBeolvas: (arrayBuffer) => ipcRenderer.invoke('import:beolvas', arrayBuffer),
  excelFajlValaszt: () => ipcRenderer.invoke('import:fajlvalaszt'),
  importFeldolgoz: (adat) => ipcRenderer.invoke('import:feldolgoz', adat),
  importVeglegesit: (adat) => ipcRenderer.invoke('import:veglegesit', adat),

  // Mentés / visszaállítás
  biztonsagiMentes: () => ipcRenderer.invoke('mentes:backup'),
  visszaallitas: () => ipcRenderer.invoke('mentes:restore'),
  adatbazisUtvonal: () => ipcRenderer.invoke('app:adatbazisUtvonal'),
});
