// Data synchronization management

let syncEnabled = false;
let syncDirPath = '';
let syncInterval = null;
let syncIndicatorTimeout = null;

function showSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        // Clear any existing timeout
        if (syncIndicatorTimeout) {
            clearTimeout(syncIndicatorTimeout);
            syncIndicatorTimeout = null;
        }
        // Remove fade-out class and show immediately
        indicator.classList.remove('hidden', 'fade-out');
        if (window.lucide && window.lucide.createIcons && window.lucideIcons) {
            window.lucide.createIcons({ icons: window.lucideIcons });
        }
    }
}

function hideSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        // Add fade-out class first
        indicator.classList.add('fade-out');
        // Then hide after transition completes
        syncIndicatorTimeout = setTimeout(() => {
            indicator.classList.add('hidden');
            indicator.classList.remove('fade-out');
            syncIndicatorTimeout = null;
        }, 600); // Match the CSS transition duration
    }
}

export async function selectSyncDir() {
    try {
        const result = await window.electron.selectSyncDir();
        if (result && result.filePaths && result.filePaths.length > 0) {
            const path = result.filePaths[0];
            document.getElementById('syncDirPath').value = path;
            syncDirPath = path;
            window.syncDirPath = path;
            await saveSyncSettings();
            window.showToast('Sync directory selected', 'success');
        }
    } catch (error) {
        console.error('Failed to select sync directory:', error);
        window.showToast('Failed to select sync directory', 'error');
    }
}

export async function setSyncEnabled(enabled) {
    syncEnabled = enabled;
    window.syncEnabled = enabled;
    const syncDirSection = document.getElementById('syncDirSection');
    const manualSyncSection = document.getElementById('manualSyncSection');

    if (enabled) {
        syncDirSection.style.display = 'block';
        manualSyncSection.style.display = 'block';
        startPeriodicSync();
    } else {
        syncDirSection.style.display = 'none';
        manualSyncSection.style.display = 'none';
        stopPeriodicSync();
    }

    await saveSyncSettings();
}

export async function manualSync() {
    if (!syncEnabled || !syncDirPath) {
        window.showToast('Sync is not enabled or directory not set', 'error');
        return;
    }

    try {
        showSyncIndicator();
        await window.electron.manualSync(syncDirPath);
        // Delay hiding to ensure minimum visible time
        setTimeout(() => {
            hideSyncIndicator();
        }, 2000); // Show for 2 seconds before starting fade-out
    } catch (error) {
        console.error('Manual sync failed:', error);
        hideSyncIndicator();
        window.showToast('Sync failed', 'error');
    }
}

export async function loadSyncSettings() {
    try {
        const settings = await window.electron.readSyncSettings();
        syncEnabled = settings.enabled || false;
        syncDirPath = settings.path || '';

        window.syncEnabled = syncEnabled;
        window.syncDirPath = syncDirPath;

        const toggle = document.getElementById('syncEnabledToggle');
        const toggleBg = toggle.nextElementSibling;
        const dot = toggleBg.nextElementSibling;

        toggle.checked = syncEnabled;
        if (syncEnabled) {
            toggleBg.classList.remove('bg-gray-300', 'dark:bg-gray-600');
            toggleBg.classList.add('bg-primary-500');
            dot.style.transform = 'translateX(16px)';
        } else {
            toggleBg.classList.add('bg-gray-300', 'dark:bg-gray-600');
            toggleBg.classList.remove('bg-primary-500');
            dot.style.transform = 'translateX(0)';
        }

        document.getElementById('syncDirPath').value = syncDirPath;

        if (syncEnabled) {
            document.getElementById('syncDirSection').style.display = 'block';
            document.getElementById('manualSyncSection').style.display = 'block';
            startPeriodicSync();
            // Sync on startup
            try {
                await manualSync();
            } catch (error) {
                console.error('Failed to sync on startup:', error);
            }
        }
    } catch (error) {
        console.error('Failed to load sync settings:', error);
    }
}

async function saveSyncSettings() {
    try {
        await window.electron.writeSyncSettings({ enabled: syncEnabled, path: syncDirPath });
    } catch (error) {
        console.error('Failed to save sync settings:', error);
    }
}

function startPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    // Sync every 5 minutes
    syncInterval = setInterval(async () => {
        if (syncEnabled && syncDirPath) {
            try {
                showSyncIndicator();
                await window.electron.manualSync(syncDirPath);
                // Delay hiding to ensure minimum visible time
                setTimeout(() => {
                    hideSyncIndicator();
                }, 2000); // Show for 2 seconds before starting fade-out
            } catch (error) {
                console.error('Periodic sync failed:', error);
                hideSyncIndicator();
            }
        }
    }, 5 * 60 * 1000);
}

function stopPeriodicSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadSyncSettings);