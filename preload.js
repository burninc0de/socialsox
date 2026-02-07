const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    'electron',
    {
        postToTwitter: (message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData) =>
            ipcRenderer.invoke('post-to-twitter', { message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData }),
        testTwitterConfig: (apiKey, apiSecret, accessToken, accessTokenSecret) =>
            ipcRenderer.invoke('test-twitter-config', { apiKey, apiSecret, accessToken, accessTokenSecret }),
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
        setTrayEnabled: (enabled) => ipcRenderer.send('set-tray-enabled', enabled),
        setTrayIcon: (iconPath) => ipcRenderer.send('set-tray-icon', iconPath),
        openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
        readFileAsDataURL: (filePath) => ipcRenderer.invoke('read-file-as-data-url', filePath),
        getDefaultTrayIconPath: () => ipcRenderer.invoke('get-default-tray-icon-path'),
        openExternalLink: (url) => ipcRenderer.send('open-external-link', url),
        getVersion: () => ipcRenderer.invoke('get-version'),
        encryptCredentials: (data) => ipcRenderer.invoke('encrypt-credentials', data),
        decryptCredentials: (encryptedData) => ipcRenderer.invoke('decrypt-credentials', encryptedData),
        getAssetsPath: () => ipcRenderer.invoke('get-assets-path'),
        getPlatformIcons: () => ipcRenderer.invoke('get-platform-icons'),
        // Write debug logs (object will be serialized on the main side)
        writeDebugLog: (obj, filename) => ipcRenderer.invoke('write-debug-log', obj, filename),
        readNotifications: () => ipcRenderer.invoke('read-notifications'),
        writeNotifications: (notifications) => ipcRenderer.invoke('write-notifications', notifications),
        deleteNotifications: () => ipcRenderer.invoke('delete-notifications'),
        deleteWindowConfig: () => ipcRenderer.invoke('delete-window-config'),
        readHistory: () => ipcRenderer.invoke('read-history'),
        writeHistory: (history) => ipcRenderer.invoke('write-history', history),
        deleteHistory: () => ipcRenderer.invoke('delete-history'),
        readScheduled: () => ipcRenderer.invoke('read-scheduled'),
        writeScheduled: (scheduled) => ipcRenderer.invoke('write-scheduled', scheduled),
        deleteScheduled: () => ipcRenderer.invoke('delete-scheduled'),
        selectSyncDir: () => ipcRenderer.invoke('select-sync-dir'),
        readSyncSettings: () => ipcRenderer.invoke('read-sync-settings'),
        writeSyncSettings: (settings) => ipcRenderer.invoke('write-sync-settings', settings),
        manualSync: (syncDirPath) => ipcRenderer.invoke('manual-sync', syncDirPath),
        trackDeletedHistory: (timestamp) => ipcRenderer.invoke('track-deleted-history', timestamp),
        trackDeletedNotification: (id) => ipcRenderer.invoke('track-deleted-notification', id),
        trackDeletedScheduled: (id) => ipcRenderer.invoke('track-deleted-scheduled', id),
        trackDismissedNotification: (id) => ipcRenderer.invoke('track-dismissed-notification', id),
        readDismissedNotifications: () => ipcRenderer.invoke('read-dismissed-notifications')
    }
);
