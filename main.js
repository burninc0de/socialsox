const { app, BrowserWindow, ipcMain, dialog, clipboard, Tray, Menu, Notification, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let tray = null;
let isQuiting = false;
let trayEnabled = false;

// Handle both development and production paths for tray icon
let trayIconPath = (app && app.isPackaged)
    ? path.join(process.resourcesPath, 'tray.png')
    : path.join(__dirname, 'tray.png');

// Handle both development and production paths for app icon
let appIconPath = (app && app.isPackaged)
    ? path.join(process.resourcesPath, 'appicon.png')
    : path.join(__dirname, 'appicon.png');

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

function createTray(win) {
    if (tray) return; // Already exists
    tray = new Tray(trayIconPath);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } },
        { label: 'Quit', click: () => { isQuiting = true; app.quit(); } }
    ]);
    tray.setToolTip('SocialSox');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        if (win.isVisible()) {
            win.hide();
        } else {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
        }
    });
    tray.on('right-click', () => { tray.popUpContextMenu(contextMenu); });
}

async function createWindow() {
    const bounds = await getWindowBounds();
    const win = new BrowserWindow({
        ...bounds,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            colorScheme: 'system',
            preload: path.join(__dirname, 'preload.js')
        },
        icon: trayIconPath,
        title: 'SocialSox',
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: '#1a1a1a'
    });

    // Load from Vite dev server in development, file in production
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        win.loadFile('dist-vite/index.html');
    }

    // Forward renderer console messages to terminal
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[Renderer]: ${message}`);
    });

    // Handle new windows (target="_blank") to open in new Electron window
    win.webContents.setWindowOpenHandler((details) => {
        const newWin = new BrowserWindow({
            width: 800,
            height: 600,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                enableRemoteModule: false,
                preload: path.join(__dirname, 'preload.js')
            },
            icon: trayIconPath,
            title: 'SocialSox - Link',
            autoHideMenuBar: true,
            frame: true,
            backgroundColor: '#ffffff'
        });
        newWin.loadURL(details.url);
        return { action: 'deny' }; // Prevent default behavior
    });

    // Save window bounds on move and resize
    win.on('move', () => {
        const bounds = win.getBounds();
        saveWindowBounds(bounds);
    });

    win.on('resize', () => {
        const bounds = win.getBounds();
        saveWindowBounds(bounds);
    });

    // Minimize to tray: hide window instead of minimizing, and create tray
    win.on('minimize', (event) => {
        if (trayEnabled) {
            event.preventDefault();
            win.hide();
        }
    });

    if (trayEnabled) {
        createTray(win);
    }

    // Open DevTools only when DEBUG env var is explicitly set
    if (process.env.DEBUG) {
        win.webContents.openDevTools();
    }
}

// Handle tray enabled setting
ipcMain.on('set-tray-enabled', (event, enabled) => {
    trayEnabled = enabled;
    const win = BrowserWindow.getAllWindows()[0];
    if (enabled && !tray) {
        createTray(win);
    } else if (!enabled && tray) {
        tray.destroy();
        tray = null;
    }
});

// Handle tray icon setting
ipcMain.on('set-tray-icon', (event, iconPath) => {
    // If it's the default tray.png, use the correct path for packaged/dev mode
    if (iconPath === 'tray.png') {
        trayIconPath = app.isPackaged
            ? path.join(process.resourcesPath, 'tray.png')
            : path.join(__dirname, 'tray.png');
    } else {
        trayIconPath = path.resolve(iconPath);
    }
    if (tray) {
        tray.setImage(trayIconPath);
    }
});

// Handle getting the default tray icon path
ipcMain.handle('get-default-tray-icon-path', () => {
    return app.isPackaged
        ? path.join(process.resourcesPath, 'tray.png')
        : path.join(__dirname, 'tray.png');
});

// Handle file dialog for tray icon
ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'ico', 'svg'] }]
    });
    return result.filePaths[0] || null;
});

// Handle reading file as data URL for preview
ipcMain.handle('read-file-as-data-url', async (event, filePath) => {
    try {
        const buffer = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mime = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
        else if (ext === '.ico') mime = 'image/x-icon';
        else if (ext === '.svg') mime = 'image/svg+xml';
        return `data:${mime};base64,${buffer.toString('base64')}`;
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    }
});

// Handle opening external links
ipcMain.on('open-external-link', (event, url) => {
    require('electron').shell.openExternal(url);
});

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
        const tweetUrl = `https://twitter.com/i/status/${result.data.id}`;
        return { success: true, data: result, url: tweetUrl };
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

// Handle Twitter notifications fetch
ipcMain.handle('fetch-twitter-notifications', async (event, { apiKey, apiSecret, accessToken, accessTokenSecret, lastSeenId }) => {
    try {
        console.log('Twitter: Fetching notifications...');

        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        // Get authenticated user ID
        const me = await client.v2.me();
        const userId = me.data.id;

        // Fetch mentions - only newer than last seen to avoid old notifications
        const options = {
            max_results: 20,
            'tweet.fields': ['created_at', 'author_id'],
            'user.fields': ['username', 'name'],
            expansions: ['author_id']
        };

        if (lastSeenId) {
            options.since_id = lastSeenId;
        }

        const mentions = await client.v2.userMentionTimeline(userId, options);

        const notifications = [];
        let latestId = lastSeenId;

        for await (const tweet of mentions) {
            const author = mentions.includes?.users?.find(u => u.id === tweet.author_id);
            notifications.push({
                id: tweet.id,
                type: 'mention',
                timestamp: tweet.created_at,
                author: author?.name || 'Unknown',
                authorHandle: author?.username || '',
                content: tweet.text,
                url: `https://twitter.com/${author?.username}/status/${tweet.id}`
            });

            // Track the latest (newest) mention ID
            if (!latestId || BigInt(tweet.id) > BigInt(latestId)) {
                latestId = tweet.id;
            }
        }

        console.log('Twitter: Found', notifications.length, 'notifications');
        return { success: true, data: notifications, latestId };
    } catch (error) {
        console.error('Twitter Notifications Error:', error);

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
    if (win) {
        if (trayEnabled) {
            win.hide();
        } else {
            win.minimize();
        }
    }
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

// Handle clipboard image reading
ipcMain.handle('read-clipboard-image', () => {
    const image = clipboard.readImage();
    if (image.isEmpty()) {
        return null;
    }
    return image.toDataURL();
});

// Fetch Open Graph preview (HTML + image) for a URL and return base64 image + metadata
const https = require('https');
const http = require('http');

ipcMain.handle('fetch-og-preview', async (event, urlToFetch) => {
    try {
        const fetchText = (u) => new Promise((resolve, reject) => {
            const lib = u.startsWith('https') ? https : http;
            lib.get(u, { headers: { 'User-Agent': 'SocialSox/0.1' } }, (res) => {
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ data, finalUrl: res.responseUrl || u, statusCode: res.statusCode }));
            }).on('error', reject);
        });

        const { data: html, finalUrl, statusCode } = await fetchText(urlToFetch);
        if (!html || statusCode < 200 || statusCode >= 400) return { success: false, error: 'Failed to fetch page' };

        const findMeta = (name) => {
            const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
            const m = html.match(re);
            return m ? m[1] : null;
        };

        const title = findMeta('og:title') || (html.match(/<title>([^<]+)<\/title>/i) ? RegExp.$1 : null);
        const description = findMeta('og:description') || findMeta('description');
        let imageUrl = findMeta('og:image');

        if (!imageUrl) return { success: true, title, description };
        imageUrl = new URL(imageUrl, finalUrl).toString();

        const fetchBinary = (u) => new Promise((resolve, reject) => {
            const lib = u.startsWith('https') ? https : http;
            lib.get(u, { headers: { 'User-Agent': 'SocialSox/0.1' } }, (res) => {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => {
                    const buf = Buffer.concat(chunks);
                    resolve({ buffer: buf, contentType: res.headers['content-type'] || 'application/octet-stream' });
                });
            }).on('error', reject);
        });

        const { buffer, contentType } = await fetchBinary(imageUrl);
        return { success: true, title, description, image: buffer.toString('base64'), imageType: contentType, imageUrl };
    } catch (e) {
        return { success: false, error: e.message };
    }
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

// Handle showing OS notifications
ipcMain.handle('show-os-notification', (event, { title, body, platform }) => {
    try {
        if (Notification.isSupported()) {
            const notification = new Notification({
                title: title,
                body: body,
                icon: appIconPath,
                silent: false
            });

            notification.on('click', () => {
                const win = BrowserWindow.getAllWindows()[0];
                if (win) {
                    if (win.isMinimized()) win.restore();
                    win.show();
                    win.focus();
                    // Switch to notifications tab
                    win.webContents.send('switch-to-notifications-tab');
                }
            });

            notification.show();
            return { success: true };
        } else {
            return { success: false, error: 'Notifications not supported' };
        }
    } catch (error) {
        console.error('Notification error:', error);
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

ipcMain.handle('get-version', () => app.getVersion());

// SafeStorage handlers for credentials
ipcMain.handle('encrypt-credentials', async (event, data) => {
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
    }
    const encrypted = safeStorage.encryptString(data);
    return encrypted.toString('base64');
});

ipcMain.handle('decrypt-credentials', async (event, encryptedData) => {
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Encryption is not available on this system');
    }
    const buffer = Buffer.from(encryptedData, 'base64');
    return safeStorage.decryptString(buffer);
});

ipcMain.handle('get-assets-path', () => {
    return (app && app.isPackaged)
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, 'assets');
});

ipcMain.on('log', (event, message) => {
    console.log('[Renderer Log]:', message);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
