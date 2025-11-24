const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const { TwitterApi } = require('twitter-api-v2');
const sharp = require('sharp');

const configPath = path.join(app.getPath('userData'), 'window-config.json');

async function getWindowBounds() {
    try {
        const data = await fs.readFile(configPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { width: 800, height: 900 };
    }
}

async function saveWindowBounds(bounds) {
    try {
        await fs.writeFile(configPath, JSON.stringify(bounds));
    } catch (error) {
        console.error('Failed to save window bounds:', error);
    }
}

async function createWindow() {
    const bounds = await getWindowBounds();
    const win = new BrowserWindow({
        ...bounds,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'appicon.png'),
        title: '🧦 SocialSox',
        autoHideMenuBar: true,
        frame: false
    });

    win.loadFile('index.html');

    // Save window bounds on move and resize
    win.on('move', () => {
        const bounds = win.getBounds();
        saveWindowBounds(bounds);
    });

    win.on('resize', () => {
        const bounds = win.getBounds();
        saveWindowBounds(bounds);
    });

    // Open DevTools only in development (not in packaged builds)
    if (!app.isPackaged) {
        win.webContents.openDevTools();
    }
}

// Handle Twitter posting from renderer
ipcMain.handle('post-to-twitter', async (event, { message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData }) => {
    try {
        console.log('Twitter: Attempting to post...');
        console.log('Twitter: Message length:', message.length);
        console.log('Twitter: Has image:', !!imageData);
        
        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        let mediaId = null;
        
        // Upload image if provided
        if (imageData) {
            console.log('Twitter: Uploading image...');
            // Convert base64 to buffer
            const base64Data = imageData.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
            console.log('Twitter: Image uploaded, mediaId:', mediaId);
        }
        
        // Create tweet with optional media
        const tweetData = { text: message };
        if (mediaId) {
            tweetData.media = { media_ids: [mediaId] };
        }
        
        const result = await client.v2.tweet(tweetData);
        console.log('Twitter: Success!', result);
        return { success: true, data: result };
    } catch (error) {
        console.error('Twitter Error:', error);
        console.error('Twitter Error Code:', error.code);
        console.error('Twitter Error Data:', error.data);
        
        // Return more detailed error message
        let errorMessage = error.message;
        if (error.data && error.data.detail) {
            errorMessage = error.data.detail;
        } else if (error.data && error.data.title) {
            errorMessage = error.data.title;
        }
        
        return { success: false, error: errorMessage, code: error.code, details: error.data };
    }
});

// Handle credential export
ipcMain.handle('export-credentials', async (event, credentials) => {
    try {
        const result = await dialog.showSaveDialog(BrowserWindow.getFocusedWindow(), {
            title: 'Export SocialSox Credentials',
            defaultPath: 'socialsox-credentials.json',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled) {
            await fs.writeFile(result.filePath, JSON.stringify(credentials, null, 2));
            return { success: true };
        }
        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle window controls
ipcMain.on('minimize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
});

ipcMain.on('maximize-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
});

// Handle credential import
ipcMain.handle('import-credentials', async (event) => {
    try {
        const result = await dialog.showOpenDialog(BrowserWindow.getFocusedWindow(), {
            title: 'Import SocialSox Credentials',
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const fileContent = await fs.readFile(result.filePaths[0], 'utf8');
            const credentials = JSON.parse(fileContent);
            return { success: true, credentials };
        }
        return { success: false, canceled: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
