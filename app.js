
// Import lucide icons
import { createIcons, PenSquare, History, Bell, Settings, Camera, Trash2, RefreshCw, CheckCircle, ChevronDown, Download, Upload, Minus, Maximize, X, Loader2, Clock, Pen, Save, Heart, MessageCircle, Repeat2, UserPlus, Quote, Sparkles, Dices } from 'lucide';

const icons = { PenSquare, History, Bell, Settings, Camera, Trash2, RefreshCw, CheckCircle, ChevronDown, Download, Upload, Minus, Maximize, X, Loader2, Clock, Pen, Save, Heart, MessageCircle, Repeat2, UserPlus, Quote, Sparkles, Dices };

// Make icons and createIcons globally available for modules
window.lucide = { createIcons };
window.lucideIcons = icons;


// Import modules
import { saveCredentials, loadCredentials, exportCredentials, importCredentials } from './src/modules/storage.js';
import { postToMastodon, postToTwitter, postToBluesky, testMastodonConfig, testTwitterConfig, testBlueskyConfig } from './src/modules/platforms.js';
import { optimizeTweet, testGrokApi } from './src/modules/ai.js';
import { showStatus, showToast, updateCharCount, switchTab, toggleCollapsible, showPlatformStatus, clearPlatformStatuses } from './src/modules/ui.js';
import { loadHistory, loadAndDisplayHistory, clearHistory, addHistoryEntry, deleteHistoryEntry } from './src/modules/history.js';
import { setupImageUpload, removeImage, getSelectedImages, setSelectedImages } from './src/modules/imageUpload.js';
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
import {
    loadScheduled,
    loadAndDisplayScheduled,
    clearScheduled,
    addScheduledPost,
    deleteScheduledPost,
    startSchedulePolling,
    stopSchedulePolling
} from './src/modules/scheduled.js';
import { makeResizable } from './src/modules/resize.js';
import { selectSyncDir, setSyncEnabled, manualSync } from './src/modules/sync.js';

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
window.showPlatformStatus = showPlatformStatus;
window.clearPlatformStatuses = clearPlatformStatuses;
window.markAsSeen = markAsSeen;
window.markAllAsRead = markAllAsRead;
window.loadCachedNotifications = loadCachedNotifications;
window.testNotification = testNotification;
window.resetAllData = resetAllData;
window.testMastodonConfig = testMastodonConfig;
window.testTwitterConfig = testTwitterConfig;
window.testBlueskyConfig = testBlueskyConfig;
window.clearScheduled = clearScheduled;
window.loadAndDisplayScheduled = loadAndDisplayScheduled;
window.deleteScheduledPost = deleteScheduledPost;
window.setSelectedImages = setSelectedImages;
window.selectSyncDir = selectSyncDir;
window.setSyncEnabled = setSyncEnabled;
window.manualSync = manualSync;

// AI optimization function
window.optimizeMessage = async function() {
    const message = document.getElementById('message').value.trim();
    if (!message) {
        window.showToast('Please enter a message to optimize', 'error');
        return;
    }

    const apiKey = document.getElementById('grok-api-key').value.trim();
    if (!apiKey) {
        window.showToast('Please enter your Grok API key in Settings', 'error');
        return;
    }

    const optimizeBtn = document.getElementById('optimizeBtn');
    const originalText = optimizeBtn.innerHTML;
    optimizeBtn.disabled = true;
    optimizeBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Optimizing...';

    try {
        const optimizedMessage = await optimizeTweet(apiKey, message);
        document.getElementById('message').value = optimizedMessage;
        updateCharCount();
        window.showToast('Message optimized successfully!', 'success');
    } catch (error) {
        console.error('AI optimization error:', error);
        window.showToast(`Optimization failed: ${error.message}`, 'error');
    } finally {
        optimizeBtn.disabled = false;
        optimizeBtn.innerHTML = originalText;
        createIcons({ icons });
    }
};

// Update debug mode styling
function updateDebugModeStyling(isDebug) {
    const messageTextarea = document.getElementById('message');
    if (isDebug) {
        messageTextarea.style.borderStyle = 'dotted';
        messageTextarea.style.borderColor = '#fbbf24'; // amber-400 - more subtle
        messageTextarea.placeholder = 'DEBUG MODE: Nothing you write will actually get posted';
    } else {
        messageTextarea.style.borderStyle = '';
        messageTextarea.style.borderColor = '';
        messageTextarea.placeholder = "What's on your mind?";
    }
}

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

    // Load and display scheduled posts if scheduled tab is active
    if (savedTab === 'scheduled') {
        try {
            await loadAndDisplayScheduled();
        } catch (error) {
            console.error('Failed to load and display scheduled posts:', error);
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
    updateDebugModeStyling(debugMode);

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
        document.getElementById('resetTrayIconBtn').style.display = 'none';
    } else {
        window.electron.readFileAsDataURL(trayIconPathStored).then(dataURL => {
            if (dataURL) {
                document.getElementById('trayIconPreview').src = dataURL;
            }
        });
        document.getElementById('resetTrayIconBtn').style.display = 'block';
    }
    window.electron.setTrayIcon(trayIconPathStored); const externalLinksStored = localStorage.getItem('socialSoxExternalLinks');
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
    startNotificationPolling();

    // Check for scheduled posts and start polling if needed
    try {
        const scheduled = await window.electron.readScheduled();
        if (scheduled && scheduled.length > 0) {
            startSchedulePolling();
        }
    } catch (error) {
        console.error('Failed to check scheduled posts on startup:', error);
    }

    if (window.electron && window.electron.onSwitchToNotificationsTab) {
        window.electron.onSwitchToNotificationsTab(() => {
            switchTab('notifications');
        });
    }

    // Initialize lucide icons
    createIcons({ icons });

    // Make main textarea resizable
    const messageTextarea = document.getElementById('message');
    const resizeHandle = document.getElementById('message-resize-handle');
    makeResizable(messageTextarea, resizeHandle);

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
        // Update debug mode styling if debug mode is active
        if (window.debugMode) {
            updateDebugModeStyling(true);
        }
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
        updateDebugModeStyling(isEnabled);
    });

    document.getElementById('windowControlsStyle').addEventListener('change', function () {
        const style = this.value;
        import('./src/modules/storage.js').then(module => {
            module.updateWindowControlsStyle(style);
        });
    });

    document.getElementById('syncEnabledToggle').addEventListener('change', function () {
        const isEnabled = this.checked;
        setSyncEnabled(isEnabled);
    });

    document.getElementById('aiOptimizationToggle').addEventListener('change', function () {
        const isEnabled = this.checked;
        document.getElementById('aiApiKeySection').style.display = isEnabled ? 'block' : 'none';
        document.getElementById('optimizeBtn').style.display = isEnabled ? 'block' : 'none';
        saveCredentials();
    });

    document.querySelectorAll('.platform-toggle').forEach(btn => {
        btn.addEventListener('click', async function () {
            const platform = this.dataset.platform;
            window.platforms[platform] = !window.platforms[platform];
            this.classList.toggle('active');

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

    // Reset test button colors when credentials change
    const resetTestButtonColor = (btnId) => {
        const btn = document.getElementById(btnId);
        btn.className = 'w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    };

    document.getElementById('mastodon-instance').addEventListener('input', () => resetTestButtonColor('testMastodonBtn'));
    document.getElementById('mastodon-token').addEventListener('input', () => resetTestButtonColor('testMastodonBtn'));

    document.getElementById('twitter-key').addEventListener('input', () => resetTestButtonColor('testTwitterBtn'));
    document.getElementById('twitter-secret').addEventListener('input', () => resetTestButtonColor('testTwitterBtn'));
    document.getElementById('twitter-token').addEventListener('input', () => resetTestButtonColor('testTwitterBtn'));
    document.getElementById('twitter-token-secret').addEventListener('input', () => resetTestButtonColor('testTwitterBtn'));

    document.getElementById('bluesky-handle').addEventListener('input', () => resetTestButtonColor('testBlueskyBtn'));
    document.getElementById('bluesky-password').addEventListener('input', () => resetTestButtonColor('testBlueskyBtn'));

    document.getElementById('grok-api-key').addEventListener('input', () => resetTestButtonColor('testGrokBtn'));

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
                        document.getElementById('resetTrayIconBtn').style.display = 'block';
                    } else {
                        showStatus('Failed to load image', 'error');
                    }
                });
            }
        });
    };

    window.resetTrayIcon = function () {
        localStorage.removeItem('socialSoxTrayIconPath');
        window.electron.getDefaultTrayIconPath().then(defaultPath => {
            window.electron.readFileAsDataURL(defaultPath).then(dataURL => {
                if (dataURL) {
                    document.getElementById('trayIconPreview').src = dataURL;
                }
            });
        });
        window.electron.setTrayIcon('tray.png');
        document.getElementById('resetTrayIconBtn').style.display = 'none';
    };

    window.testMastodon = async function () {
        const instance = document.getElementById('mastodon-instance').value.trim();
        const token = document.getElementById('mastodon-token').value.trim();

        if (!instance || !token) {
            showToast('Please fill in all Mastodon credentials', 'error');
            return;
        }

        const btn = document.getElementById('testMastodonBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';
        createIcons({ icons });

        try {
            const result = await testMastodonConfig(instance, token);
            showToast(`✓ Connected as @${result.username} (${result.displayName})`, 'success');
            btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } catch (error) {
            console.error('Mastodon test failed:', error);
            showToast(`✗ Mastodon test failed: ${error.message}`, 'error');
            btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            createIcons({ icons });
        }
    };

    window.testTwitter = async function () {
        const apiKey = document.getElementById('twitter-key').value.trim();
        const apiSecret = document.getElementById('twitter-secret').value.trim();
        const accessToken = document.getElementById('twitter-token').value.trim();
        const tokenSecret = document.getElementById('twitter-token-secret').value.trim();

        if (!apiKey || !apiSecret || !accessToken || !tokenSecret) {
            showToast('Please fill in all Twitter credentials', 'error');
            return;
        }

        const btn = document.getElementById('testTwitterBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';
        createIcons({ icons });

        try {
            const result = await testTwitterConfig(apiKey, apiSecret, accessToken, tokenSecret);
            showToast(`✓ Connected as @${result.username}`, 'success');
            btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } catch (error) {
            console.error('Twitter test failed:', error);
            showToast(`✗ Twitter test failed: ${error.message}`, 'error');
            btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            createIcons({ icons });
        }
    };

    window.testBluesky = async function () {
        const handle = document.getElementById('bluesky-handle').value.trim();
        const password = document.getElementById('bluesky-password').value.trim();

        if (!handle || !password) {
            showToast('Please fill in all Bluesky credentials', 'error');
            return;
        }

        const btn = document.getElementById('testBlueskyBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';
        createIcons({ icons });

        try {
            const result = await testBlueskyConfig(handle, password);
            showToast(`✓ Connected as @${result.username}`, 'success');
            btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } catch (error) {
            console.error('Bluesky test failed:', error);
            showToast(`✗ Bluesky test failed: ${error.message}`, 'error');
            btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            createIcons({ icons });
        }
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
    // Clear any previous statuses
    clearPlatformStatuses();
    const status = document.getElementById('status');
    status.classList.add('hidden');

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

    // Check if scheduling is selected
    const scheduleTimeSelect = document.getElementById('scheduleTimeSelect');
    const scheduleValue = scheduleTimeSelect.value;

    if (scheduleValue !== 'now') {
        // Schedule the post
        const hours = parseFloat(scheduleValue);
        const scheduledTime = new Date();
        // Add time in milliseconds for accurate fractional hours
        scheduledTime.setTime(scheduledTime.getTime() + (hours * 60 * 60 * 1000));

        console.log('Scheduling post:', JSON.stringify({
            hoursToAdd: hours,
            currentTime: new Date().toISOString(),
            scheduledTime: scheduledTime.toISOString()
        }, null, 2));

        // Get images if any
        const selectedImages = getSelectedImages();
        let imageDataArray = [];
        if (selectedImages.length > 0) {
            for (const image of selectedImages) {
                const reader = new FileReader();
                const imageData = await new Promise((resolve) => {
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(image);
                });
                imageDataArray.push(imageData);
            }
        }

        // Add to scheduled posts
        await addScheduledPost(message, selectedPlatforms, scheduledTime.toISOString(), imageDataArray);

        // Clear the form
        document.getElementById('message').value = '';
        updateCharCount();
        removeImage();

        // Reset dropdown to "Now"
        scheduleTimeSelect.value = 'now';

        return;
    }

    // Continue with immediate posting...

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

    const selectedImages = getSelectedImages();
    let imageDataArray = [];
    if (selectedImages.length > 0) {
        for (const image of selectedImages) {
            const reader = new FileReader();
            const imageData = await new Promise((resolve) => {
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(image);
            });
            imageDataArray.push(imageData);
        }
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
                        const result = await postToMastodon(message, instance, token, selectedImages);
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
                        const result = await postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageDataArray);
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
                        const result = await postToBluesky(message, handle, password, selectedImages);
                        results.push({ platform: 'Bluesky', success: true, url: result.url });
                    } catch (error) {
                        results.push({ platform: 'Bluesky', success: false, error: error.message });
                    }
                } else {
                    results.push({ platform: 'Bluesky', success: false, error: 'Missing credentials' });
                }
            }
        }

        // Clear any previous platform statuses
        clearPlatformStatuses();

        // Show individual platform statuses
        results.forEach(result => {
            const statusType = result.success ? 'success' : 'error';
            const message = result.success ? `✓ ${result.platform}` : `✗ ${result.platform}: ${result.error}`;
            showPlatformStatus(result.platform, message, statusType);
        });

        // Also show overall status for backward compatibility
        const hasSuccess = results.some(r => r.success);
        const hasFailure = results.some(r => !r.success);

        let statusType = 'info';
        if (hasSuccess && !hasFailure) statusType = 'success';
        if (hasFailure) statusType = 'error';

        // Convert results to display strings
        const statusMessages = results.map(r =>
            r.success ? `✓ ${r.platform}` : `✗ ${r.platform}: ${r.error}`
        );
        // showStatus(statusMessages.join('\n'), statusType); // Removed redundant summary box

        await addHistoryEntry(message, selectedPlatforms, results);

        if (hasSuccess && !hasFailure) {
            document.getElementById('message').value = '';
            updateCharCount();
            removeImage();
        }

    } catch (error) {
        clearPlatformStatuses();
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
    document.getElementById('grok-api-key').value = '';
    document.getElementById('aiOptimizationToggle').checked = false;
    document.getElementById('aiApiKeySection').style.display = 'none';
    document.getElementById('optimizeBtn').style.display = 'none';

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

// Test functions
window.testMastodon = async function() {
    const instance = document.getElementById('mastodon-instance').value.trim();
    const token = document.getElementById('mastodon-token').value.trim();
    if (!instance || !token) {
        window.showToast('Please fill in all Mastodon credentials', 'error');
        return;
    }

    const btn = document.getElementById('testMastodonBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';

    try {
        const result = await testMastodonConfig(instance, token);
        window.showToast(`✓ Connected as @${result.username} (${result.displayName})`, 'success');
        btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } catch (error) {
        console.error('Mastodon test failed:', error);
        window.showToast(`✗ Mastodon test failed: ${error.message}`, 'error');
        btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        createIcons({ icons });
    }
};

window.testTwitter = async function() {
    const apiKey = document.getElementById('twitter-key').value.trim();
    const apiSecret = document.getElementById('twitter-secret').value.trim();
    const accessToken = document.getElementById('twitter-token').value.trim();
    const accessTokenSecret = document.getElementById('twitter-token-secret').value.trim();
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
        window.showToast('Please fill in all Twitter credentials', 'error');
        return;
    }

    const btn = document.getElementById('testTwitterBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';

    try {
        const result = await testTwitterConfig(apiKey, apiSecret, accessToken, accessTokenSecret);
        window.showToast(`✓ Connected as @${result.username}`, 'success');
        btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } catch (error) {
        console.error('Twitter test failed:', error);
        window.showToast(`✗ Twitter test failed: ${error.message}`, 'error');
        btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        createIcons({ icons });
    }
};

window.testBluesky = async function() {
    const handle = document.getElementById('bluesky-handle').value.trim();
    const password = document.getElementById('bluesky-password').value.trim();
    if (!handle || !password) {
        window.showToast('Please fill in all Bluesky credentials', 'error');
        return;
    }

    const btn = document.getElementById('testBlueskyBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';

    try {
        const result = await testBlueskyConfig(handle, password);
        window.showToast(`✓ Connected as @${result.username}`, 'success');
        btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } catch (error) {
        console.error('Bluesky test failed:', error);
        window.showToast(`✗ Bluesky test failed: ${error.message}`, 'error');
        btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        createIcons({ icons });
    }
};

window.testGrok = async function() {
    const apiKey = document.getElementById('grok-api-key').value.trim();
    if (!apiKey) {
        window.showToast('Please enter your Grok API key', 'error');
        return;
    }

    const btn = document.getElementById('testGrokBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Testing...';

    try {
        const result = await testGrokApi(apiKey);
        window.showToast(`✓ API test successful: ${result.message}`, 'success');
        btn.className = 'w-full py-2 px-3 bg-green-600 hover:bg-green-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } catch (error) {
        console.error('Grok test failed:', error);
        window.showToast(`✗ Grok test failed: ${error.message}`, 'error');
        btn.className = 'w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white border-0 rounded-md cursor-pointer text-xs font-medium transition-colors flex items-center justify-center gap-2';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        createIcons({ icons });
    }
};
