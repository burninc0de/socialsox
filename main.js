const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        // icon: path.join(__dirname, 'icon.png'), // Commented out - file doesn't exist
        title: '🧦 SocialSox',
        autoHideMenuBar: true
    });

    win.loadFile('index.html');

    // Open DevTools in development
    win.webContents.openDevTools();
}

// Handle Twitter posting from renderer
ipcMain.handle('post-to-twitter', async (event, { message, apiKey, apiSecret, accessToken, accessTokenSecret }) => {
    try {
        console.log('Twitter: Attempting to post...');
        console.log('Twitter: Message length:', message.length);
        console.log('Twitter: Has API Key:', !!apiKey);
        console.log('Twitter: Has API Secret:', !!apiSecret);
        console.log('Twitter: Has Access Token:', !!accessToken);
        console.log('Twitter: Has Access Token Secret:', !!accessTokenSecret);
        
        const client = new TwitterApi({
            appKey: apiKey,
            appSecret: apiSecret,
            accessToken: accessToken,
            accessSecret: accessTokenSecret,
        });

        const result = await client.v2.tweet(message);
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
