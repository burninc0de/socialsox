const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        postToTwitter: (message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData) => 
            ipcRenderer.invoke('post-to-twitter', { message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData }),
        fetchTwitterNotifications: (apiKey, apiSecret, accessToken, accessTokenSecret) => 
            ipcRenderer.invoke('fetch-twitter-notifications', { apiKey, apiSecret, accessToken, accessTokenSecret }),
        exportCredentials: (credentials) => 
            ipcRenderer.invoke('export-credentials', credentials),
        importCredentials: () => 
            ipcRenderer.invoke('import-credentials'),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        closeWindow: () => ipcRenderer.send('close-window'),
        readClipboardImage: () => ipcRenderer.invoke('read-clipboard-image'),
        fetchOgPreview: (url) => ipcRenderer.invoke('fetch-og-preview', url)
    }
);
