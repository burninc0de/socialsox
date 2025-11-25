const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        postToTwitter: (message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData) => 
            ipcRenderer.invoke('post-to-twitter', { message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData }),
        fetchTwitterNotifications: (apiKey, apiSecret, accessToken, accessTokenSecret, lastSeenId) => 
            ipcRenderer.invoke('fetch-twitter-notifications', { apiKey, apiSecret, accessToken, accessTokenSecret, lastSeenId }),
        exportCredentials: (credentials) => 
            ipcRenderer.invoke('export-credentials', credentials),
        importCredentials: () => 
            ipcRenderer.invoke('import-credentials'),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        closeWindow: () => ipcRenderer.send('close-window'),
        readClipboardImage: () => ipcRenderer.invoke('read-clipboard-image'),
        fetchOgPreview: (url) => ipcRenderer.invoke('fetch-og-preview', url),
        showOSNotification: (title, body, platform) => 
            ipcRenderer.invoke('show-os-notification', { title, body, platform }),
        onSwitchToNotificationsTab: (callback) => 
            ipcRenderer.on('switch-to-notifications-tab', callback),
        setTrayEnabled: (enabled) => ipcRenderer.send('set-tray-enabled', enabled)
    }
);
