const { app, BrowserWindow, ipcMain, dialog, clipboard, Tray, Menu, Notification, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs').promises;

app.setAppUserModelId('com.socialsox.app');

let tray = null;
let isQuiting = false;
let trayEnabled = false;

// Handle both development and production paths for tray icon
// Use tray-mac.png on macOS for better system tray appearance
const trayIconFile = process.platform === 'darwin' ? 'tray-mac.png' : 'tray.png';
let trayIconPath = (app && app.isPackaged)
    ? path.join(process.resourcesPath, trayIconFile)
    : path.join(__dirname, trayIconFile);

// Handle both development and production paths for app icon
let appIconPath = (app && app.isPackaged)
    ? path.join(process.resourcesPath, 'appicon.png')
    : path.join(__dirname, 'appicon.png');

const { TwitterApi } = require('twitter-api-v2');
const sharp = require('sharp');

const configPath = path.join(app.getPath('userData'), 'window-config.json');
const notificationsPath = path.join(app.getPath('userData'), 'notifications.json');
const historyPath = path.join(app.getPath('userData'), 'history.json');
const schedulePath = path.join(app.getPath('userData'), 'schedule.json');
const syncSettingsPath = path.join(app.getPath('userData'), 'sync-settings.json');
const deletedIdsPath = path.join(app.getPath('userData'), 'deleted-ids.json');
const dismissedIdsPath = path.join(app.getPath('userData'), 'dismissed-ids.json');
const externalLinksPath = path.join(app.getPath('userData'), 'external-links-setting.json');

// Debug log path (appends sanitized Bluesky debug dumps)
const blueskyDebugLogPath = path.join(app.getPath('userData'), 'bluesky-debug.json');

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

// Helper function to get external links setting
async function getExternalLinksSetting() {
    try {
        const data = await fs.readFile(externalLinksPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { enabled: false };
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
    // Create main window
    const bounds = await getWindowBounds();
    const win = new BrowserWindow({
        ...bounds,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            colorScheme: 'system',
            preload: path.join(__dirname, 'preload.js')
        },
        icon: appIconPath,
        title: 'SocialSox',
        autoHideMenuBar: true,
        frame: false,
        backgroundColor: '#0f0f1e',
        show: true
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

    // Handle new windows (target="_blank") based on user preference
    win.webContents.setWindowOpenHandler((details) => {
        // Check if external links should open in browser
        getExternalLinksSetting().then(setting => {
            if (setting.enabled) {
                require('electron').shell.openExternal(details.url);
            } else {
                const newWin = new BrowserWindow({
                    width: 800,
                    height: 600,
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        enableRemoteModule: false,
                        webSecurity: true,
                        allowRunningInsecureContent: false,
                        preload: path.join(__dirname, 'preload.js')
                    },
                    icon: trayIconPath,
                    title: 'SocialSox - Link',
                    autoHideMenuBar: true,
                    frame: true,
                    backgroundColor: '#ffffff'
                });
                newWin.loadURL(details.url);
            }
        });
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
    // If it's the default tray.png, use the correct platform-specific path
    if (iconPath === 'tray.png') {
        const trayIconFile = process.platform === 'darwin' ? 'tray-mac.png' : 'tray.png';
        trayIconPath = app.isPackaged
            ? path.join(process.resourcesPath, trayIconFile)
            : path.join(__dirname, trayIconFile);
    } else {
        trayIconPath = path.resolve(iconPath);
    }
    if (tray) {
        tray.setImage(trayIconPath);
    }
});

// Handle getting the default tray icon path
ipcMain.handle('get-default-tray-icon-path', () => {
    const trayIconFile = process.platform === 'darwin' ? 'tray-mac.png' : 'tray.png';
    return app.isPackaged
        ? path.join(process.resourcesPath, trayIconFile)
        : path.join(__dirname, trayIconFile);
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
        console.log('Twitter: Has images:', Array.isArray(imageData) ? imageData.length : (imageData ? 1 : 0));

        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        let mediaIds = [];

        // Upload images if provided
        if (imageData) {
            const imageArray = Array.isArray(imageData) ? imageData : [imageData];

            for (const imgData of imageArray.slice(0, 4)) {
                console.log('Twitter: Uploading image...');
                const base64Data = imgData.split(',')[1];
                const buffer = Buffer.from(base64Data, 'base64');
                const mediaId = await client.v1.uploadMedia(buffer, { mimeType: 'image/jpeg' });
                console.log('Twitter: Image uploaded, mediaId:', mediaId);
                mediaIds.push(mediaId);
            }
        }

        // Create tweet with optional media
        const tweetData = { text: message };
        if (mediaIds.length > 0) {
            tweetData.media = { media_ids: mediaIds };
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

// Handle Twitter configuration test
ipcMain.handle('test-twitter-config', async (event, { apiKey, apiSecret, accessToken, accessTokenSecret }) => {
    try {
        console.log('Twitter: Testing configuration...');

        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        const user = await client.v2.me();
        console.log('Twitter: Configuration valid for user:', user.data.username);
        return { success: true, username: user.data.username };
    } catch (error) {
        console.error('Twitter Test Error:', error);
        let errorMessage = error.message;
        if (error.data && error.data.detail) {
            errorMessage = error.data.detail;
        } else if (error.data && error.data.title) {
            errorMessage = error.data.title;
        }
        return { success: false, error: errorMessage };
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

// Handle renderer request to write sanitized debug logs
ipcMain.handle('write-debug-log', async (event, obj, filename) => {
    try {
        const target = filename ? path.join(app.getPath('userData'), filename) : blueskyDebugLogPath;
        const entry = {
            at: new Date().toISOString(),
            payload: obj
        };
        // Append JSON entry followed by newline for easy streaming
        await fs.appendFile(target, JSON.stringify(entry, null, 2) + '\n');
        return { success: true, path: target };
    } catch (error) {
        console.error('Failed to write debug log:', error);
        return { success: false, error: error.message };
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

ipcMain.handle('get-platform-icons', async () => {
    const assetsPath = (app && app.isPackaged)
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, 'assets');
    
    const readFileAsDataURL = async (filePath) => {
        try {
            const buffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();
            let mime = 'image/png';
            if (ext === '.svg') mime = 'image/svg+xml';
            return `data:${mime};base64,${buffer.toString('base64')}`;
        } catch (error) {
            console.error('Error reading file:', error);
            return null;
        }
    };

    const mastodonIcon = await readFileAsDataURL(path.join(assetsPath, 'masto.svg'));
    const blueskyIcon = await readFileAsDataURL(path.join(assetsPath, 'bsky.svg'));
    const twitterIcon = await readFileAsDataURL(path.join(assetsPath, 'twit.svg'));

    return {
        mastodon: mastodonIcon,
        bluesky: blueskyIcon,
        twitter: twitterIcon
    };
});

ipcMain.handle('read-notifications', async () => {
    try {
        const data = await fs.readFile(notificationsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
});

ipcMain.handle('write-notifications', async (event, notifications) => {
    try {
        await fs.writeFile(notificationsPath, JSON.stringify(notifications, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save notifications:', error);
        return false;
    }
});

ipcMain.handle('delete-notifications', async () => {
    try {
        await fs.unlink(notificationsPath);
        return true;
    } catch (error) {
        // File doesn't exist or can't be deleted, that's ok
        return true;
    }
});

ipcMain.handle('delete-window-config', async () => {
    try {
        await fs.unlink(configPath);
        return true;
    } catch (error) {
        // File doesn't exist or can't be deleted, that's ok
        return true;
    }
});

ipcMain.handle('delete-external-links-setting', async () => {
    try {
        await fs.unlink(externalLinksPath);
        return true;
    } catch (error) {
        // File doesn't exist or can't be deleted, that's ok
        return true;
    }
});

ipcMain.handle('read-history', async () => {
    try {
        const data = await fs.readFile(historyPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
});

ipcMain.handle('write-history', async (event, history) => {
    try {
        await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save history:', error);
        return false;
    }
});

ipcMain.handle('delete-history', async () => {
    try {
        await fs.unlink(historyPath);
        return true;
    } catch (error) {
        // File doesn't exist or can't be deleted, that's ok
        return true;
    }
});

ipcMain.handle('read-scheduled', async () => {
    try {
        const data = await fs.readFile(schedulePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
});

ipcMain.handle('write-scheduled', async (event, scheduled) => {
    try {
        await fs.writeFile(schedulePath, JSON.stringify(scheduled, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save scheduled posts:', error);
        return false;
    }
});

ipcMain.handle('delete-scheduled', async () => {
    try {
        await fs.unlink(schedulePath);
        return true;
    } catch (error) {
        // File doesn't exist or can't be deleted, that's ok
        return true;
    }
});

ipcMain.handle('select-sync-dir', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory']
    });
    return result;
});

ipcMain.handle('read-sync-settings', async () => {
    try {
        const data = await fs.readFile(syncSettingsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { enabled: false, path: '' };
    }
});

ipcMain.handle('write-sync-settings', async (event, settings) => {
    try {
        await fs.writeFile(syncSettingsPath, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save sync settings:', error);
        return false;
    }
});

// External links setting: read and write
ipcMain.handle('get-external-links-setting', async () => {
    try {
        const data = await fs.readFile(externalLinksPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { enabled: false };
    }
});

ipcMain.handle('set-external-links-setting', async (event, enabled) => {
    try {
        await fs.writeFile(externalLinksPath, JSON.stringify({ enabled }, null, 2));
        return true;
    } catch (error) {
        console.error('Failed to save external links setting:', error);
        return false;
    }
});

// Helper function to track deleted IDs
async function trackDeletedId(type, id) {
    try {
        let deletedIds = { history: [], notifications: [], scheduled: [] };
        try {
            const content = await fs.readFile(deletedIdsPath, 'utf8');
            deletedIds = JSON.parse(content);
        } catch (error) {
            // File doesn't exist, use defaults
        }
        
        if (!deletedIds[type]) {
            deletedIds[type] = [];
        }
        
        const idString = String(id);
        if (!deletedIds[type].includes(idString)) {
            deletedIds[type].push(idString);
            await fs.writeFile(deletedIdsPath, JSON.stringify(deletedIds, null, 2));
        }
    } catch (error) {
        console.error(`Failed to track deleted ID for ${type}:`, error);
    }
}

ipcMain.handle('track-deleted-history', async (event, timestamp) => {
    await trackDeletedId('history', timestamp);
});

ipcMain.handle('track-deleted-notification', async (event, id) => {
    await trackDeletedId('notifications', id);
});

ipcMain.handle('track-deleted-scheduled', async (event, id) => {
    await trackDeletedId('scheduled', id);
});

async function trackDismissedNotification(id) {
    try {
        let dismissedIds = [];
        try {
            const content = await fs.readFile(dismissedIdsPath, 'utf8');
            dismissedIds = JSON.parse(content);
        } catch (error) {
            // File doesn't exist yet
        }
        
        const idString = String(id);
        if (!dismissedIds.includes(idString)) {
            dismissedIds.push(idString);
            await fs.writeFile(dismissedIdsPath, JSON.stringify(dismissedIds, null, 2));
        }
    } catch (error) {
        console.error('Failed to track dismissed notification:', error);
    }
}

ipcMain.handle('track-dismissed-notification', async (event, id) => {
    await trackDismissedNotification(id);
});

ipcMain.handle('read-dismissed-notifications', async () => {
    try {
        const content = await fs.readFile(dismissedIdsPath, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        return [];
    }
});

// Sync strategy: Remote (sync directory) is the UPSTREAM source of truth with deletion tracking
// - Deletions are tracked in deleted-ids.json stored in BOTH local and sync directory
// - When syncing: deletions from both locations are merged and items are removed from data files
// - This ensures deletions propagate across all synced machines
// - Remote additions are pulled: all remote items not in deleted-ids are brought to local
// - Local additions are pushed: local items not in remote are added to remote
// - Both insertions and deletions merge seamlessly bidirectionally
ipcMain.handle('manual-sync', async (event, syncDirPath) => {
    const files = [
        { 
            local: historyPath, 
            remote: path.join(syncDirPath, 'history.json'),
            idField: 'timestamp',
            sortField: 'timestamp',
            deletedKey: 'history'
        },
        { 
            local: notificationsPath, 
            remote: path.join(syncDirPath, 'notifications.json'),
            idField: 'id',
            sortField: 'timestamp',
            deletedKey: 'notifications'
        },
        { 
            local: schedulePath, 
            remote: path.join(syncDirPath, 'schedule.json'),
            idField: 'id',
            sortField: 'scheduledTime',
            deletedKey: 'scheduled'
        }
    ];

    const remoteDeletedIdsPath = path.join(syncDirPath, 'deleted-ids.json');
    const remoteDismissedIdsPath = path.join(syncDirPath, 'dismissed-ids.json');

    // Read local deleted IDs tracker
    let localDeletedIds = {};
    try {
        const deletedContent = await fs.readFile(deletedIdsPath, 'utf8');
        localDeletedIds = JSON.parse(deletedContent);
    } catch (error) {
        // File doesn't exist yet, initialize empty
        localDeletedIds = { history: [], notifications: [], scheduled: [] };
    }

    // Read remote deleted IDs tracker
    let remoteDeletedIds = {};
    try {
        const deletedContent = await fs.readFile(remoteDeletedIdsPath, 'utf8');
        remoteDeletedIds = JSON.parse(deletedContent);
    } catch (error) {
        // File doesn't exist yet, initialize empty
        remoteDeletedIds = { history: [], notifications: [], scheduled: [] };
    }

    // Merge deleted IDs from both local and remote
    const mergedDeletedIds = {
        history: [...new Set([...(localDeletedIds.history || []), ...(remoteDeletedIds.history || [])])],
        notifications: [...new Set([...(localDeletedIds.notifications || []), ...(remoteDeletedIds.notifications || [])])],
        scheduled: [...new Set([...(localDeletedIds.scheduled || []), ...(remoteDeletedIds.scheduled || [])])]
    };

    // Read local dismissed IDs tracker
    let localDismissedIds = [];
    try {
        const dismissedContent = await fs.readFile(dismissedIdsPath, 'utf8');
        localDismissedIds = JSON.parse(dismissedContent);
    } catch (error) {
        // File doesn't exist yet, initialize empty
        localDismissedIds = [];
    }

    // Read remote dismissed IDs tracker
    let remoteDismissedIds = [];
    try {
        const dismissedContent = await fs.readFile(remoteDismissedIdsPath, 'utf8');
        remoteDismissedIds = JSON.parse(dismissedContent);
    } catch (error) {
        // File doesn't exist yet, initialize empty
        remoteDismissedIds = [];
    }

    // Merge dismissed IDs from both local and remote
    const mergedDismissedIds = [...new Set([...localDismissedIds, ...remoteDismissedIds])];

    for (const file of files) {
        try {
            // Read remote file (upstream source of truth)
            let remoteData = [];
            try {
                const remoteContent = await fs.readFile(file.remote, 'utf8');
                remoteData = JSON.parse(remoteContent);
            } catch (error) {
                // Remote doesn't exist or is invalid, will be created
                console.log(`Remote file ${file.remote} doesn't exist or is invalid, will create it`);
            }

            // Read local file
            let localData = [];
            try {
                const localContent = await fs.readFile(file.local, 'utf8');
                localData = JSON.parse(localContent);
            } catch (error) {
                // Local doesn't exist or is invalid
                console.log(`Local file ${file.local} doesn't exist or is invalid`);
            }

            // Get deleted IDs for this file type (from merged deletions)
            const deleted = new Set(mergedDeletedIds[file.deletedKey] || []);

            // Filter out deleted items from both remote and local
            remoteData = remoteData.filter(item => !deleted.has(String(item[file.idField])));
            localData = localData.filter(item => !deleted.has(String(item[file.idField])));

            // Merge: Remote is source of truth, but we add local items not in remote
            // This ensures:
            // 1. All remote items are preserved (deletions from remote are respected)
            // 2. New local items are pushed to remote
            // 3. Deleted items (tracked in deletedIds) are removed from both
            const remoteIds = new Set(remoteData.map(item => item[file.idField]));
            const localOnlyItems = localData.filter(item => !remoteIds.has(item[file.idField]));
            
            // Combine: all remote items + local items not in remote
            const mergedData = [...remoteData, ...localOnlyItems];
            
            // For notifications, apply dismissed status from merged dismissed IDs
            if (file.deletedKey === 'notifications') {
                const dismissedSet = new Set(mergedDismissedIds);
                mergedData.forEach(notif => {
                    if (dismissedSet.has(String(notif.id))) {
                        notif.dismissed = true;
                        notif.isNew = false;
                    }
                });
            }
            
            // Sort by appropriate field for consistent ordering
            mergedData.sort((a, b) => {
                const aVal = a[file.sortField];
                const bVal = b[file.sortField];
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                return 0;
            });

            // Write merged data to both locations
            const mergedContent = JSON.stringify(mergedData, null, 2);
            await fs.writeFile(file.local, mergedContent);
            await fs.writeFile(file.remote, mergedContent);
            
            console.log(`Synced ${file.local}: ${remoteData.length} remote, ${localOnlyItems.length} local-only, ${deleted.size} deleted, ${mergedData.length} total`);
        } catch (error) {
            console.error(`Failed to sync ${file.local}:`, error);
        }
    }

    // Save merged deleted IDs tracker to BOTH local and remote
    const mergedDeletedContent = JSON.stringify(mergedDeletedIds, null, 2);
    await fs.writeFile(deletedIdsPath, mergedDeletedContent);
    await fs.writeFile(remoteDeletedIdsPath, mergedDeletedContent);

    // Save merged dismissed IDs tracker to BOTH local and remote
    const mergedDismissedContent = JSON.stringify(mergedDismissedIds, null, 2);
    await fs.writeFile(dismissedIdsPath, mergedDismissedContent);
    await fs.writeFile(remoteDismissedIdsPath, mergedDismissedContent);

    return true;
});

ipcMain.on('log', (event, message) => {
    console.log('[Renderer Log]:', message);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
