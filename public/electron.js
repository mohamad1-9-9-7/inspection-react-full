// public/electron.js — Electron main process
// (CRA بينقله لـbuild/electron.js عند الـbuild)
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    backgroundColor: "#f3f4f6",
    title: "Al Mawashi — Inspection",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // فتح الروابط الخارجية بالمتصفح الافتراضي بدل النافذة
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // في الـproduction، electron.js و index.html بنفس المجلد (build/)
    mainWindow.loadFile(path.join(__dirname, "index.html"));
  }

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();

  const template = [
    {
      label: "File",
      submenu: [
        { label: "Reload", role: "reload" },
        { label: "Force Reload", role: "forceReload" },
        { type: "separator" },
        { label: "Quit", role: "quit" },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Toggle DevTools", role: "toggleDevTools" },
        { type: "separator" },
        { label: "Zoom In", role: "zoomIn" },
        { label: "Zoom Out", role: "zoomOut" },
        { label: "Reset Zoom", role: "resetZoom" },
        { type: "separator" },
        { label: "Toggle Fullscreen", role: "togglefullscreen" },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
