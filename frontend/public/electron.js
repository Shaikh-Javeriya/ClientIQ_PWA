// main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,       // allows using Node APIs in renderer (optional, depends on your app)
            contextIsolation: false,     // must be false if nodeIntegration is true
        },
    });

    // Load your built React app
    win.loadFile(path.join(__dirname, 'build', 'index.html'));

    // Optional: open dev tools automatically
    // win.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// Quit app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// On macOS, recreate window if the dock icon is clicked and no windows are open
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
