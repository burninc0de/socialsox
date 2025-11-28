
// Import lucide icons
import { createIcons, PenSquare, History, Bell, Settings, Camera, Trash2, RefreshCw, CheckCircle, ChevronDown, Download, Upload, Minus, Maximize, X, Loader2 } from 'lucide';

const icons = { PenSquare, History, Bell, Settings, Camera, Trash2, RefreshCw, CheckCircle, ChevronDown, Download, Upload, Minus, Maximize, X, Loader2 };

// Make icons and createIcons globally available for modules
window.lucide = { createIcons };
window.lucideIcons = icons;


// Import modules
import { saveCredentials, loadCredentials, exportCredentials, importCredentials } from './src/modules/storage.js';
import { postToMastodon, postToTwitter, postToBluesky } from './src/modules/platforms.js';
import { showStatus, showToast, updateCharCount, switchTab, toggleCollapsible } from './src/modules/ui.js';
import { loadHistory, loadAndDisplayHistory, clearHistory, addHistoryEntry, deleteHistoryEntry } from './src/modules/history.js';
import { setupImageUpload, removeImage, getSelectedImage } from './src/modules/imageUpload.js';
import {
    getAllCachedNotifications,
    clearNotificationsCache,
    startNotificationPolling,
    restartNotificationPolling,
    stopNotificationPolling,
    loadNotifications,
    markAsSeen,
    markAllAsRead,
    loadCachedNotifications,
    testNotification
} from './src/modules/notifications.js';

// Global state
window.platforms = {
    mastodon: false,
    twitter: false,
    bluesky: false
};

// Make UI functions globally available
window.showStatus = showStatus;
window.showToast = showToast;
window.switchTab = switchTab;
window.toggleCollapsible = toggleCollapsible;
window.removeImage = removeImage;
window.exportCredentials = exportCredentials;
window.importCredentials = importCredentials;
window.clearHistory = clearHistory;
window.loadAndDisplayHistory = loadAndDisplayHistory;
window.deleteHistoryEntry = deleteHistoryEntry;
window.clearNotificationsCache = clearNotificationsCache;
window.loadNotifications = loadNotifications;
window.markAsSeen = markAsSeen;
window.markAllAsRead = markAllAsRead;
window.loadCachedNotifications = loadCachedNotifications;
window.testNotification = testNotification;
window.resetAllData = resetAllData;

// Page load
window.addEventListener('DOMContentLoaded', async () => {
    loadCredentials();
    try {
        await loadHistory();
    } catch (error) {
        console.error('Failed to load history on startup:', error);
    }

    // Restore active tab from localStorage
    const savedTab = localStorage.getItem('socialSoxActiveTab') || 'post';
    switchTab(savedTab);

    // Load cached notifications if notifications tab is active
    if (savedTab === 'notifications') {
        try {
            await loadCachedNotifications();
        } catch (error) {
            console.error('Failed to load cached notifications:', error);
        }
    }
    
    // Load and display history if history tab is active
    if (savedTab === 'history') {
        try {
            await loadAndDisplayHistory();
        } catch (error) {
            console.error('Failed to load and display history:', error);
        }
    }

    window.electron.getVersion().then(version => {
        document.getElementById('version').textContent = version;
        document.getElementById('modalVersion').textContent = version;
    });

    // Version pill click handler
    document.getElementById('versionPill').addEventListener('click', showAboutModal);

    const darkModeStored = localStorage.getItem('socialSoxDarkMode');
    const darkMode = darkModeStored !== null ? darkModeStored === 'true' : true;
    document.getElementById('darkModeToggle').checked = darkMode;
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }

    const debugModeStored = localStorage.getItem('socialSoxDebugMode');
    const debugMode = debugModeStored !== null ? debugModeStored === 'true' : false;
    document.getElementById('debugModeToggle').checked = debugMode;
    window.debugMode = debugMode;

    const trayEnabledStored = localStorage.getItem('socialSoxTrayEnabled');
    const trayEnabled = trayEnabledStored !== null ? trayEnabledStored === 'true' : false;
    document.getElementById('trayIconToggle').checked = trayEnabled;
    document.getElementById('trayIconSection').style.display = trayEnabled ? 'block' : 'none';
    window.electron.setTrayEnabled(trayEnabled);

    const trayIconPathStored = localStorage.getItem('socialSoxTrayIconPath') || 'tray.png';

    // Load tray icon preview
    if (trayIconPathStored === 'tray.png') {
        window.electron.getDefaultTrayIconPath().then(defaultPath => {
            window.electron.readFileAsDataURL(defaultPath).then(dataURL => {
                if (dataURL) {
                    document.getElementById('trayIconPreview').src = dataURL;
                }
            });
        });
    } else {
        window.electron.readFileAsDataURL(trayIconPathStored).then(dataURL => {
            if (dataURL) {
                document.getElementById('trayIconPreview').src = dataURL;
            }
        });
    }
    window.electron.setTrayIcon(trayIconPathStored);    const externalLinksStored = localStorage.getItem('socialSoxExternalLinks');
    const externalLinks = externalLinksStored !== null ? externalLinksStored === 'true' : false;
    document.getElementById('externalLinksToggle').checked = externalLinks;

    const cachedNotifications = getAllCachedNotifications();
    if (cachedNotifications.length > 0) {
        // Import displayNotifications dynamically to avoid circular dependency
        import('./src/modules/notifications.js').then(module => {
            // Already displayed via the function
        });
    }

    startNotificationPolling();

    if (window.electron && window.electron.onSwitchToNotificationsTab) {
        window.electron.onSwitchToNotificationsTab(() => {
            switchTab('notifications');
        });
    }

    // Initialize lucide icons
createIcons({icons});
    // Event listeners
    document.getElementById('message').addEventListener('input', updateCharCount);

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });

    document.getElementById('darkModeToggle').addEventListener('change', function () {
        const isDark = this.checked;
        console.log('Dark mode toggle changed to:', isDark);
        localStorage.setItem('socialSoxDarkMode', isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        console.log('documentElement classes:', document.documentElement.classList.toString());
    });

    document.getElementById('trayIconToggle').addEventListener('change', function () {
        const isEnabled = this.checked;
        localStorage.setItem('socialSoxTrayEnabled', isEnabled);
        document.getElementById('trayIconSection').style.display = isEnabled ? 'block' : 'none';
        window.electron.setTrayEnabled(isEnabled);
    });

    document.getElementById('externalLinksToggle').addEventListener('change', function () {
        const isEnabled = this.checked;
        localStorage.setItem('socialSoxExternalLinks', isEnabled);
    });

    document.getElementById('debugModeToggle').addEventListener('change', function () {
        const isEnabled = this.checked;
        localStorage.setItem('socialSoxDebugMode', isEnabled);
        window.debugMode = isEnabled;
    });

    document.getElementById('windowControlsStyle').addEventListener('change', function () {
        const style = this.value;
        import('./src/modules/storage.js').then(module => {
            module.updateWindowControlsStyle(style);
        });
    });

    document.querySelectorAll('.platform-toggle').forEach(btn => {
        btn.addEventListener('click', async function () {
            const platform = this.dataset.platform;
            window.platforms[platform] = !window.platforms[platform];
            this.classList.toggle('active');

            if (window.platforms[platform]) {
                this.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                this.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
            } else {
                this.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                this.classList.remove('border-primary-500', 'bg-primary-500', 'text-white');
            }

            await saveCredentials();
        });
    });

    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', async () => await saveCredentials());
    });

    document.getElementById('mastodonInterval').addEventListener('input', async function () {
        document.getElementById('mastodonIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('twitterInterval').addEventListener('input', async function () {
        document.getElementById('twitterIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('blueskyInterval').addEventListener('input', async function () {
        document.getElementById('blueskyIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });

    document.getElementById('excludeMastodonNotifications').addEventListener('change', function () {
        saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('excludeTwitterNotifications').addEventListener('change', function () {
        saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('excludeBlueskyNotifications').addEventListener('change', function () {
        saveCredentials();
        restartNotificationPolling();
    });

    setupImageUpload();

    // Global link handler to respect external links setting
    document.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            const external = localStorage.getItem('socialSoxExternalLinks') === 'true';
            if (external) {
                window.electron.openExternalLink(e.target.href);
            } else {
                window.open(e.target.href, '_blank');
            }
        }
    });

    window.chooseTrayIcon = function () {
        window.electron.openFileDialog().then(path => {
            if (path) {
                window.electron.readFileAsDataURL(path).then(dataURL => {
                    if (dataURL) {
                        document.getElementById('trayIconPreview').src = dataURL;
                        localStorage.setItem('socialSoxTrayIconPath', path);
                        window.electron.setTrayIcon(path);
                    } else {
                        showStatus('Failed to load image', 'error');
                    }
                });
            }
        });
    };
});

// URL decoding helper
function decodeUrlsInText(text) {
    return text.replace(/(https?:\/\/[^\s]+)/g, (match) => {
        try {
            const url = new URL(match);
            url.pathname = decodeURIComponent(url.pathname);
            url.search = decodeURIComponent(url.search);
            url.hash = decodeURIComponent(url.hash);
            return url.toString();
        } catch (e) {
            return match;
        }
    });
}

// Main post function
async function postToAll() {
    let message = document.getElementById('message').value.trim();

    // Decode URLs to handle encoded characters better
    message = decodeUrlsInText(message);

    if (!message) {
        showStatus('Please enter a message', 'error');
        return;
    }

    const selectedPlatforms = Object.keys(window.platforms).filter(p => window.platforms[p]);

    if (selectedPlatforms.length === 0) {
        showStatus('Please select at least one platform', 'error');
        return;
    }

    const btn = document.getElementById('postBtn');
    btn.disabled = true;
    btn.textContent = 'Posting...';

    const loadingMessages = [
"sacrificing a byte to the API gods …",
"negotiating with rate limits …",
"arguing with OAuth again …",
"launching message into the void …",
"bribing the API with snacks …",
"spinning up the content hamster …",
"duct-taping the timelines together …",
"delivering your post via carrier pigeon …",
"compressing your hot take …",
"duct-taping your thoughts together …",
"debugging reality … please wait …",
"brewing fresh latency …",
"hand-carving your post in ASCII …",
"teaching the server to cope …",
"whispering sweet nothings to the API …",
"smuggling your post past the algorithm …",
"loading… because social media is a mistake …",
"poking the timeline with a stick …",
"wrangling APIs like feral cats …",
"compressing existential dread …",
"ignoring the ‘touch grass’ alert …",
"warming up the doomscroll engines …",
"converting your thoughts to 280p …",
"wrapping your content in bubble wrap …",
"firing message through the tubes …",
"packing your post’s parachute …",
"convincing the server this isn’t spam …",
    ];

    let messageInterval;

    // Start loading messages immediately
    const showRandomMessage = () => {
        const randomIndex = Math.floor(Math.random() * loadingMessages.length);
        btn.textContent = loadingMessages[randomIndex];
    };

    setTimeout(() => {
        showRandomMessage(); // Show first message immediately
        messageInterval = setInterval(showRandomMessage, 2000);
    }, 0);

    const results = [];

    const selectedImage = getSelectedImage();
    let imageData = null;
    if (selectedImage) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(selectedImage);
        });
    }

    try {
        if (window.debugMode) {
            // Debug mode: simulate posting with delay
            const simulateDelay = (platform) => new Promise(resolve => {
                setTimeout(() => {
                    resolve({ platform, success: true, url: `https://debug.${platform.toLowerCase()}.com/post/123` });
                }, 3000 + Math.random() * 2000); // 3-5 seconds random delay
            });

            const promises = [];
            if (window.platforms.mastodon) promises.push(simulateDelay('Mastodon'));
            if (window.platforms.twitter) promises.push(simulateDelay('Twitter'));
            if (window.platforms.bluesky) promises.push(simulateDelay('Bluesky'));

            const debugResults = await Promise.all(promises);
            results.push(...debugResults);
        } else {
            // Real posting
            if (window.platforms.mastodon) {
                const instance = document.getElementById('mastodon-instance').value;
                const token = document.getElementById('mastodon-token').value;

                if (instance && token) {
                    try {
                        const result = await postToMastodon(message, instance, token, selectedImage);
                        results.push({ platform: 'Mastodon', success: true, url: result.url });
                    } catch (error) {
                        results.push({ platform: 'Mastodon', success: false, error: error.message });
                    }
                } else {
                    results.push({ platform: 'Mastodon', success: false, error: 'Missing credentials' });
                }
            }

            if (window.platforms.twitter) {
                const apiKey = document.getElementById('twitter-key').value;
                const apiSecret = document.getElementById('twitter-secret').value;
                const accessToken = document.getElementById('twitter-token').value;
                const accessTokenSecret = document.getElementById('twitter-token-secret').value;

                if (apiKey && apiSecret && accessToken && accessTokenSecret) {
                    try {
                        const result = await postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData);
                        results.push({ platform: 'Twitter', success: true, url: result.url });
                    } catch (error) {
                        let errorMsg = error.message;
                        if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
                            errorMsg = 'Permission denied. Make sure your Twitter app has "Read and Write" permissions in Developer Portal, then regenerate your Access Token and Access Token Secret.';
                        }
                        results.push({ platform: 'Twitter', success: false, error: errorMsg });
                    }
                } else {
                    results.push({ platform: 'Twitter', success: false, error: 'Missing credentials' });
                }
            }

            if (window.platforms.bluesky) {
                const handle = document.getElementById('bluesky-handle').value;
                const password = document.getElementById('bluesky-password').value;

                if (handle && password) {
                    try {
                        const result = await postToBluesky(message, handle, password, selectedImage);
                        results.push({ platform: 'Bluesky', success: true, url: result.url });
                    } catch (error) {
                        results.push({ platform: 'Bluesky', success: false, error: error.message });
                    }
                } else {
                    results.push({ platform: 'Bluesky', success: false, error: 'Missing credentials' });
                }
            }
        }

        const hasSuccess = results.some(r => r.success);
        const hasFailure = results.some(r => !r.success);

        let statusType = 'info';
        if (hasSuccess && !hasFailure) statusType = 'success';
        if (hasFailure) statusType = 'error';

        // Convert results to display strings
        const statusMessages = results.map(r =>
            r.success ? `✓ ${r.platform}` : `✗ ${r.platform}: ${r.error}`
        );
        showStatus(statusMessages.join('\n'), statusType);

        await addHistoryEntry(message, selectedPlatforms, results);

        if (hasSuccess && !hasFailure) {
            document.getElementById('message').value = '';
            updateCharCount();
            removeImage();
        }

    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    } finally {
        if (messageInterval) {
            clearInterval(messageInterval);
        }
        btn.disabled = false;
        btn.textContent = 'Post to Selected Platforms';
    }
}

// Reset all data
function resetAllData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your credentials, history, notifications, and settings. This action cannot be undone!\n\nAre you absolutely sure you want to reset everything?')) {
        return;
    }

    localStorage.clear();

    // Delete notifications JSON file
    if (window.electron && window.electron.deleteNotifications) {
        window.electron.deleteNotifications();
    }

    // Delete window config JSON file
    if (window.electron && window.electron.deleteWindowConfig) {
        window.electron.deleteWindowConfig();
    }

    document.getElementById('mastodon-instance').value = '';
    document.getElementById('mastodon-token').value = '';
    document.getElementById('twitter-key').value = '';
    document.getElementById('twitter-secret').value = '';
    document.getElementById('twitter-token').value = '';
    document.getElementById('twitter-token-secret').value = '';
    document.getElementById('bluesky-handle').value = '';
    document.getElementById('bluesky-password').value = '';

    Object.keys(window.platforms).forEach(platform => {
        window.platforms[platform] = false;
        const btn = document.querySelector(`.platform-toggle[data-platform="${platform}"]`);
        if (btn) {
            btn.classList.remove('active', 'border-primary-500', 'bg-primary-500', 'text-white');
            btn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
        }
    });

    document.getElementById('mastodonInterval').value = 5;
    document.getElementById('mastodonIntervalValue').textContent = 5;
    document.getElementById('twitterInterval').value = 60;
    document.getElementById('twitterIntervalValue').textContent = 60;
    document.getElementById('blueskyInterval').value = 5;
    document.getElementById('blueskyIntervalValue').textContent = 5;

    document.getElementById('excludeMastodonNotifications').checked = false;
    document.getElementById('excludeTwitterNotifications').checked = false;
    document.getElementById('excludeBlueskyNotifications').checked = false;

    document.getElementById('darkModeToggle').checked = true;
    document.documentElement.classList.add('dark');

    document.getElementById('trayIconToggle').checked = false;
    document.getElementById('trayIconSection').style.display = 'none';
    if (window.electron && window.electron.setTrayEnabled) {
        window.electron.setTrayEnabled(false);
    }

    document.getElementById('externalLinksToggle').checked = false;

    document.getElementById('windowControlsStyle').value = 'macos-circles';
    import('./src/modules/storage.js').then(module => {
        module.updateWindowControlsStyle('macos-circles');
    });

    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    historyList.innerHTML = '';
    noHistory.style.display = 'block';

    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    notificationsList.innerHTML = '';
    noNotifications.style.display = 'block';
    noNotifications.textContent = 'Click "Load Notifications" to check for replies, likes, and mentions across your platforms.';

    stopNotificationPolling();

    showStatus('All data has been reset! Please restart the app for a complete fresh start.', 'success');
}

// About Modal Functions
function showAboutModal() {
    document.getElementById('aboutModal').classList.remove('hidden');
    // Add click outside listener
    document.getElementById('aboutModal').addEventListener('click', handleModalClick);
}

function closeAboutModal() {
    const modal = document.getElementById('aboutModal');
    modal.classList.add('hidden');
    // Remove click outside listener
    modal.removeEventListener('click', handleModalClick);
}

function handleModalClick(event) {
    // Close modal if clicked on the overlay (not on the modal content)
    if (event.target.id === 'aboutModal') {
        closeAboutModal();
    }
}

// Make functions globally available
window.showAboutModal = showAboutModal;
window.closeAboutModal = closeAboutModal;

// Make postToAll globally available
window.postToAll = postToAll;
