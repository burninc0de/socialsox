const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        postToTwitter: (message, apiKey, apiSecret, accessToken, accessTokenSecret) => 
            ipcRenderer.invoke('post-to-twitter', { message, apiKey, apiSecret, accessToken, accessTokenSecret }),
        exportCredentials: (credentials) => 
            ipcRenderer.invoke('export-credentials', credentials),
        importCredentials: () => 
            ipcRenderer.invoke('import-credentials')
    }
);
