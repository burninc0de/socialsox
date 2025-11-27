// Platform selection state
const platforms = {
    mastodon: false,
    twitter: false,
    bluesky: false
};

// Image state
let selectedImage = null;

// Notification polling intervals
let notificationPollingIntervals = {
    mastodon: null,
    twitter: null,
    bluesky: null
};

// Load credentials from localStorage on page load
window.addEventListener('DOMContentLoaded', async () => {
    await loadCredentials();
    loadHistory();
    
    // Load version
    window.electron.getVersion().then(version => {
        document.getElementById('version').textContent = `v${version}`;
    });
    
    // Load dark mode preference
    const darkModeStored = localStorage.getItem('socialSoxDarkMode');
    const darkMode = darkModeStored !== null ? darkModeStored === 'true' : true; // Default to true if not set
    document.getElementById('darkModeToggle').checked = darkMode;
    if (darkMode) {
        document.documentElement.classList.add('dark');
    }
    
    // Load tray icon preference
    const trayEnabledStored = localStorage.getItem('socialSoxTrayEnabled');
    const trayEnabled = trayEnabledStored !== null ? trayEnabledStored === 'true' : false; // Default to false
    document.getElementById('trayIconToggle').checked = trayEnabled;
    document.getElementById('trayIconSection').style.display = trayEnabled ? 'block' : 'none';
    window.electron.setTrayEnabled(trayEnabled);
    
    // Load tray icon path preference
    const trayIconPathStored = localStorage.getItem('socialSoxTrayIconPath') || 'tray.png';
    
    // Load the tray icon preview
    if (trayIconPathStored === 'tray.png') {
        // For default icon, get the correct path from main process
        window.electron.getDefaultTrayIconPath().then(defaultPath => {
            window.electron.readFileAsDataURL(defaultPath).then(dataURL => {
                if (dataURL) {
                    document.getElementById('trayIconPreview').src = dataURL;
                }
            });
        });
    } else {
        // For custom icons, load from the stored path
        window.electron.readFileAsDataURL(trayIconPathStored).then(dataURL => {
            if (dataURL) {
                document.getElementById('trayIconPreview').src = dataURL;
            }
        });
    }
    window.electron.setTrayIcon(trayIconPathStored);
    
    // Load external links preference
    const externalLinksStored = localStorage.getItem('socialSoxExternalLinks');
    const externalLinks = externalLinksStored !== null ? externalLinksStored === 'true' : false; // Default to false
    document.getElementById('externalLinksToggle').checked = externalLinks;
    
    // Display cached notifications from previous session
    const cachedNotifications = getAllCachedNotifications();
    if (cachedNotifications.length > 0) {
        displayNotifications(cachedNotifications);
    }
    
    // Start automatic notification checking
    startNotificationPolling();
    
    // Listen for switch to notifications tab from OS notification click
    if (window.electron && window.electron.onSwitchToNotificationsTab) {
        window.electron.onSwitchToNotificationsTab(() => {
            switchTab('notifications');
        });
    }
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Character counter
    document.getElementById('message').addEventListener('input', updateCharCount);
    
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const tab = this.dataset.tab;
            switchTab(tab);
        });
    });
    
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', function() {
        const isDark = this.checked;
        localStorage.setItem('socialSoxDarkMode', isDark);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    });
    
    // Tray icon toggle
    document.getElementById('trayIconToggle').addEventListener('change', function() {
        const isEnabled = this.checked;
        localStorage.setItem('socialSoxTrayEnabled', isEnabled);
        document.getElementById('trayIconSection').style.display = isEnabled ? 'block' : 'none';
        window.electron.setTrayEnabled(isEnabled);
    });
    
    // Tray icon path
    // Removed change listener, now using button
    
    // External links toggle
    document.getElementById('externalLinksToggle').addEventListener('change', function() {
        const isEnabled = this.checked;
        localStorage.setItem('socialSoxExternalLinks', isEnabled);
        // Refresh notifications display to apply the new setting
        const cachedNotifications = getAllCachedNotifications();
        displayNotifications(cachedNotifications);
    });
    
    // Platform toggles
    document.querySelectorAll('.platform-toggle').forEach(btn => {
        btn.addEventListener('click', async function() {
            const platform = this.dataset.platform;
            platforms[platform] = !platforms[platform];
            this.classList.toggle('active');
            
            // Toggle Tailwind classes
            if (platforms[platform]) {
                this.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                this.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
            } else {
                this.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                this.classList.remove('border-primary-500', 'bg-primary-500', 'text-white');
            }
            
            // Save platforms state
            await saveCredentials();
        });
    });
    
    // Save credentials on change
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', async () => await saveCredentials());
    });
    
    // Polling interval sliders
    document.getElementById('mastodonInterval').addEventListener('input', async function() {
        document.getElementById('mastodonIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('twitterInterval').addEventListener('input', async function() {
        document.getElementById('twitterIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('blueskyInterval').addEventListener('input', async function() {
        document.getElementById('blueskyIntervalValue').textContent = this.value;
        await saveCredentials();
        restartNotificationPolling();
    });
    
    // Notification exclusion toggles
    document.getElementById('excludeMastodonNotifications').addEventListener('change', function() {
        saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('excludeTwitterNotifications').addEventListener('change', function() {
        saveCredentials();
        restartNotificationPolling();
    });
    document.getElementById('excludeBlueskyNotifications').addEventListener('change', function() {
        saveCredentials();
        restartNotificationPolling();
    });
    
    // Image upload handlers
    setupImageUpload();
    
    // Tray icon chooser
    window.chooseTrayIcon = function() {
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

function toggleCollapsible() {
    const content = document.getElementById('credentials');
    const arrow = document.getElementById('arrow');
    
    if (content.style.maxHeight === '1000px') {
        content.style.maxHeight = '0';
        arrow.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = '1000px';
        arrow.style.transform = 'rotate(180deg)';
    }
}

function updateCharCount() {
    const message = document.getElementById('message').value;
    const count = message.length;
    const countEl = document.getElementById('charCount');
    
    countEl.textContent = `${count} characters`;
    
    // Reset classes
    countEl.className = 'text-right text-xs mb-5';
    
    if (count > 280) {
        countEl.classList.add('text-red-500');
    } else if (count > 250) {
        countEl.classList.add('text-orange-500');
    } else {
        countEl.classList.add('text-gray-500', 'dark:text-gray-400');
    }
}

async function saveCredentials() {
    const sensitiveCreds = {
        mastodonToken: document.getElementById('mastodon-token').value,
        twitterKey: document.getElementById('twitter-key').value,
        twitterSecret: document.getElementById('twitter-secret').value,
        twitterToken: document.getElementById('twitter-token').value,
        twitterTokenSecret: document.getElementById('twitter-token-secret').value,
        blueskyPassword: document.getElementById('bluesky-password').value
    };

    const settings = {
        mastodonInstance: document.getElementById('mastodon-instance').value,
        blueskyHandle: document.getElementById('bluesky-handle').value,
        platforms: { ...platforms },
        pollingIntervals: {
            mastodon: parseInt(document.getElementById('mastodonInterval').value) || 5,
            twitter: parseInt(document.getElementById('twitterInterval').value) || 60,
            bluesky: parseInt(document.getElementById('blueskyInterval').value) || 5
        },
        notificationExclusions: {
            mastodon: document.getElementById('excludeMastodonNotifications').checked,
            twitter: document.getElementById('excludeTwitterNotifications').checked,
            bluesky: document.getElementById('excludeBlueskyNotifications').checked
        }
    };

    try {
        const encrypted = await window.electron.encryptCredentials(JSON.stringify(sensitiveCreds));
        localStorage.setItem('socialSoxEncryptedCredentials', encrypted);
    } catch (error) {
        console.error('Failed to encrypt credentials:', error);
        // Fallback to unencrypted storage if encryption fails
        localStorage.setItem('socialSoxCredentials', JSON.stringify({ ...sensitiveCreds, ...settings }));
        return;
    }

    localStorage.setItem('socialSoxSettings', JSON.stringify(settings));
}

async function loadCredentials() {
    try {
        let sensitiveCreds = {};
        let settings = {};

        // Try to load encrypted credentials
        const encrypted = localStorage.getItem('socialSoxEncryptedCredentials');
        if (encrypted) {
            try {
                const decrypted = await window.electron.decryptCredentials(encrypted);
                sensitiveCreds = JSON.parse(decrypted);
            } catch (error) {
                console.error('Failed to decrypt credentials:', error);
            }
        }

        // Load settings
        const settingsSaved = localStorage.getItem('socialSoxSettings');
        if (settingsSaved) {
            settings = JSON.parse(settingsSaved);
        }

        // Fallback to old storage format if new ones don't exist
        if (!encrypted && !settingsSaved) {
            const saved = localStorage.getItem('socialSoxCredentials');
            if (saved) {
                const creds = JSON.parse(saved);
                // Migrate to new format
                sensitiveCreds = {
                    mastodonToken: creds.mastodonToken || '',
                    twitterKey: creds.twitterKey || '',
                    twitterSecret: creds.twitterSecret || '',
                    twitterToken: creds.twitterToken || '',
                    twitterTokenSecret: creds.twitterTokenSecret || '',
                    blueskyPassword: creds.blueskyPassword || ''
                };
                settings = {
                    mastodonInstance: creds.mastodonInstance || '',
                    blueskyHandle: creds.blueskyHandle || '',
                    platforms: creds.platforms || {},
                    pollingIntervals: creds.pollingIntervals || {},
                    notificationExclusions: creds.notificationExclusions || {}
                };
                // Save in new format
                await saveCredentials();
            }
        }

        // Populate form fields
        document.getElementById('mastodon-instance').value = settings.mastodonInstance || '';
        document.getElementById('mastodon-token').value = sensitiveCreds.mastodonToken || '';
        document.getElementById('twitter-key').value = sensitiveCreds.twitterKey || '';
        document.getElementById('twitter-secret').value = sensitiveCreds.twitterSecret || '';
        document.getElementById('twitter-token').value = sensitiveCreds.twitterToken || '';
        document.getElementById('twitter-token-secret').value = sensitiveCreds.twitterTokenSecret || '';
        document.getElementById('bluesky-handle').value = settings.blueskyHandle || '';
        document.getElementById('bluesky-password').value = sensitiveCreds.blueskyPassword || '';
        
        // Load platforms
        if (settings.platforms) {
            Object.assign(platforms, settings.platforms);
        }
        
        // Load polling intervals
        if (settings.pollingIntervals) {
            document.getElementById('mastodonInterval').value = settings.pollingIntervals.mastodon || 5;
            document.getElementById('mastodonIntervalValue').textContent = settings.pollingIntervals.mastodon || 5;
            document.getElementById('twitterInterval').value = settings.pollingIntervals.twitter || 60;
            document.getElementById('twitterIntervalValue').textContent = settings.pollingIntervals.twitter || 60;
            document.getElementById('blueskyInterval').value = settings.pollingIntervals.bluesky || 5;
            document.getElementById('blueskyIntervalValue').textContent = settings.pollingIntervals.bluesky || 5;
        } else {
            // Defaults
            document.getElementById('mastodonInterval').value = 5;
            document.getElementById('mastodonIntervalValue').textContent = 5;
            document.getElementById('twitterInterval').value = 60;
            document.getElementById('twitterIntervalValue').textContent = 60;
            document.getElementById('blueskyInterval').value = 5;
            document.getElementById('blueskyIntervalValue').textContent = 5;
        }
        
        // Load notification exclusions
        if (settings.notificationExclusions) {
            document.getElementById('excludeMastodonNotifications').checked = settings.notificationExclusions.mastodon || false;
            document.getElementById('excludeTwitterNotifications').checked = settings.notificationExclusions.twitter || false;
            document.getElementById('excludeBlueskyNotifications').checked = settings.notificationExclusions.bluesky || false;
        }
        
        // Apply platforms to buttons
        document.querySelectorAll('.platform-toggle').forEach(btn => {
            const platform = btn.dataset.platform;
            const isActive = platforms[platform];
            btn.classList.toggle('active', isActive);
            if (isActive) {
                btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                btn.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
            } else {
                btn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                btn.classList.remove('border-primary-500', 'bg-primary-500', 'text-white');
            }
        });
    } catch (error) {
        console.error('Error loading credentials from localStorage:', error);
        showStatus('Error loading saved credentials. Storage may be corrupted. Try "Reset All Data" in Settings.', 'error');
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'mt-5 p-4 rounded-lg text-sm whitespace-pre-line block';
    
    if (type === 'success') {
        status.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-800', 'dark:text-green-200', 'border', 'border-green-300', 'dark:border-green-600');
        setTimeout(() => {
            status.classList.add('hidden');
        }, 5000);
    } else if (type === 'error') {
        status.classList.add('bg-red-100', 'dark:bg-red-900', 'text-red-800', 'dark:text-red-200', 'border', 'border-red-300', 'dark:border-red-600');
    } else if (type === 'info') {
        status.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-800', 'dark:text-blue-200', 'border', 'border-blue-300', 'dark:border-blue-600');
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function setupImageUpload() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // Click to select file
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });
    
    // File selected via input
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-primary-500', 'bg-gray-100', 'dark:bg-gray-600');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    // Paste from clipboard
    document.addEventListener('paste', async (e) => {
        const imageData = await window.electron.readClipboardImage();
        if (imageData) {
            const file = dataURLToFile(imageData, 'clipboard-image.png');
            handleImageFile(file);
        }
    });
}

function handleImageFile(file) {
    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showStatus('Image too large! Max size is 5MB', 'error');
        return;
    }
    
    selectedImage = file;
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('dropZone').classList.add('hidden');
        document.getElementById('imagePreview').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    selectedImage = null;
    document.getElementById('dropZone').classList.remove('hidden');
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('fileInput').value = '';
}

function dataURLToFile(dataURL, filename) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
}

async function postToMastodon(message, instance, token, imageFile = null) {
    // Ensure instance URL doesn't have trailing slash or username path
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    // Remove any path after the domain (like /@username)
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    let mediaId = null;
    
    // Upload image if provided
    if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        
        const mediaResponse = await fetch(`${cleanInstance}/api/v2/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!mediaResponse.ok) {
            const errorText = await mediaResponse.text();
            throw new Error(`Image upload failed: ${errorText}`);
        }
        
        const mediaData = await mediaResponse.json();
        mediaId = mediaData.id;
    }
    
    // Create post
    const postData = { status: message };
    if (mediaId) {
        postData.media_ids = [mediaId];
    }
    
    const response = await fetch(`${cleanInstance}/api/v1/statuses`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
    }
    
    return await response.json();
}

async function postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData = null) {
    // Check if we're in Electron (has window.electron)
    if (window.electron && window.electron.postToTwitter) {
        console.log('Calling Electron backend for Twitter...');
        const result = await window.electron.postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData);
        console.log('Twitter result:', result);
        
        if (!result.success) {
            // Show more detailed error if available
            let errorMsg = result.error;
            if (result.details) {
                console.error('Twitter error details:', result.details);
                if (result.details.detail) errorMsg = result.details.detail;
                else if (result.details.title) errorMsg = result.details.title;
            }
            throw new Error(errorMsg);
        }
        return result.data;
    } else {
        // Running in browser - can't post to Twitter securely
        throw new Error('Twitter posting requires Electron app (run: npm start)');
    }
}

async function postToBluesky(message, handle, password, imageFile = null) {
    // Create session
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            identifier: handle,
            password: password
        })
    });
    
    if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        throw new Error(`Auth failed: ${errorText}`);
    }
    
    const session = await sessionResponse.json();
    
    let imageBlob = null;
    
    // Upload image if provided
    if (imageFile) {
        const imageBytes = await imageFile.arrayBuffer();
        
        const uploadResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.accessJwt}`,
                'Content-Type': imageFile.type
            },
            body: imageBytes
        });
        
        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Image upload failed: ${errorText}`);
        }
        
        const uploadData = await uploadResponse.json();
        imageBlob = uploadData.blob;
    }
    
    // Detect links and mentions in the text (richtext facets)
    const facets = [];
    
    // Regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    let externalEmbed = null;
    while ((match = urlRegex.exec(message)) !== null) {
        const url = match[0];

        // Try to fetch OG preview via Electron backend (avoids CORS)
        if (window.electron && window.electron.fetchOgPreview) {
            try {
                const og = await window.electron.fetchOgPreview(url);
                if (og && og.success && og.image) {
                    // Upload the preview image as a blob to Bluesky
                    const binary = Uint8Array.from(atob(og.image), c => c.charCodeAt(0));
                    const uploadResponse2 = await fetch('https://bsky.social/xrpc/com.atproto.repo.uploadBlob', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${session.accessJwt}`,
                            'Content-Type': og.imageType
                        },
                        body: binary
                    });

                    if (uploadResponse2.ok) {
                        const uploadData2 = await uploadResponse2.json();
                        externalEmbed = {
                            $type: 'app.bsky.embed.external',
                            external: {
                                uri: url,
                                title: og.title || '',
                                description: og.description || '',
                                thumb: uploadData2.blob
                            }
                        };

                        // Also add a link facet for the URL
                        facets.push({
                            index: {
                                byteStart: new TextEncoder().encode(message.slice(0, match.index)).length,
                                byteEnd: new TextEncoder().encode(message.slice(0, match.index + match[0].length)).length
                            },
                            features: [{
                                $type: 'app.bsky.richtext.facet#link',
                                uri: url
                            }]
                        });

                        // Use the first previewable link only
                        break;
                    }
                }
            } catch (e) {
                // ignore preview errors and fall back to link facet
                console.error('OG preview error:', e);
            }
        }

        // Fallback: add simple link facet
        facets.push({
            index: {
                byteStart: new TextEncoder().encode(message.slice(0, match.index)).length,
                byteEnd: new TextEncoder().encode(message.slice(0, match.index + match[0].length)).length
            },
            features: [{
                $type: 'app.bsky.richtext.facet#link',
                uri: match[0]
            }]
        });
    }

    // Create post with facets and optional image
    const record = {
        text: message,
        createdAt: new Date().toISOString()
    };

    // If we created an external embed from OG data, attach it
    if (externalEmbed) {
        record.embed = externalEmbed;
    }
    
    // Hashtag detection: find #tags and add link facets
    const hashtagRegex = /(^|\s)(#[A-Za-z0-9_]+)/g;
    while ((match = hashtagRegex.exec(message)) !== null) {
        const tag = match[2];
        const start = match.index + (match[1] ? match[1].length : 0);
        const end = start + tag.length;
        facets.push({
            index: {
                byteStart: new TextEncoder().encode(message.slice(0, start)).length,
                byteEnd: new TextEncoder().encode(message.slice(0, end)).length
            },
            features: [{
                $type: 'app.bsky.richtext.facet#link',
                uri: 'https://bsky.app/hashtag/' + encodeURIComponent(tag.replace(/^#/, ''))
            }]
        });
    }

    if (facets.length > 0) {
        record.facets = facets;
    }
    
    // Add image embed if present
    if (imageBlob) {
        record.embed = {
            $type: 'app.bsky.embed.images',
            images: [{
                alt: '',
                image: imageBlob
            }]
        };
    }
    
    const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.accessJwt}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            repo: session.did,
            collection: 'app.bsky.feed.post',
            record: record
        })
    });
    
    if (!postResponse.ok) {
        const errorText = await postResponse.text();
        throw new Error(`Post failed: ${errorText}`);
    }
    
    return await postResponse.json();
}

async function postToAll() {
    const message = document.getElementById('message').value.trim();
    
    if (!message) {
        showStatus('Please enter a message', 'error');
        return;
    }
    
    const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
    
    if (selectedPlatforms.length === 0) {
        showStatus('Please select at least one platform', 'error');
        return;
    }
    
    const btn = document.getElementById('postBtn');
    btn.disabled = true;
    btn.textContent = 'Posting...';
    
    const results = [];
    
    // Get image data if present
    let imageData = null;
    if (selectedImage) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(selectedImage);
        });
    }
    
    try {
        // Mastodon
        if (platforms.mastodon) {
            const instance = document.getElementById('mastodon-instance').value;
            const token = document.getElementById('mastodon-token').value;
            
            if (instance && token) {
                try {
                    await postToMastodon(message, instance, token, selectedImage);
                    results.push('✓ Mastodon');
                } catch (error) {
                    results.push('✗ Mastodon: ' + error.message);
                }
            } else {
                results.push('✗ Mastodon: Missing credentials');
            }
        }
        
        // Twitter
        if (platforms.twitter) {
            const apiKey = document.getElementById('twitter-key').value;
            const apiSecret = document.getElementById('twitter-secret').value;
            const accessToken = document.getElementById('twitter-token').value;
            const accessTokenSecret = document.getElementById('twitter-token-secret').value;
            
            if (apiKey && apiSecret && accessToken && accessTokenSecret) {
                try {
                    await postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageData);
                    results.push('✓ Twitter');
                } catch (error) {
                    let errorMsg = error.message;
                    // Add helpful context for 403 errors
                    if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
                        errorMsg = 'Permission denied. Make sure your Twitter app has "Read and Write" permissions in Developer Portal, then regenerate your Access Token and Access Token Secret.';
                    }
                    results.push('✗ Twitter: ' + errorMsg);
                }
            } else {
                results.push('✗ Twitter: Missing credentials');
            }
        }
        
        // Bluesky
        if (platforms.bluesky) {
            const handle = document.getElementById('bluesky-handle').value;
            const password = document.getElementById('bluesky-password').value;
            
            if (handle && password) {
                try {
                    await postToBluesky(message, handle, password, selectedImage);
                    results.push('✓ Bluesky');
                } catch (error) {
                    results.push('✗ Bluesky: ' + error.message);
                }
            } else {
                results.push('✗ Bluesky: Missing credentials');
            }
        }
        
        const hasSuccess = results.some(r => r.startsWith('✓'));
        const hasFailure = results.some(r => r.startsWith('✗'));
        
        let statusType = 'info';
        if (hasSuccess && !hasFailure) statusType = 'success';
        if (hasFailure) statusType = 'error';
        
        showStatus(results.join('\n'), statusType);
        
        // Save to history
        addHistoryEntry(message, selectedPlatforms, results);
        
        // Clear message and image if all successful
        if (hasSuccess && !hasFailure) {
            document.getElementById('message').value = '';
            updateCharCount();
            removeImage();
        }
        
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Post to Selected Platforms';
    }
}

async function exportCredentials() {
    try {
        const creds = {
            mastodonInstance: document.getElementById('mastodon-instance').value,
            mastodonToken: document.getElementById('mastodon-token').value,
            twitterKey: document.getElementById('twitter-key').value,
            twitterSecret: document.getElementById('twitter-secret').value,
            twitterToken: document.getElementById('twitter-token').value,
            twitterTokenSecret: document.getElementById('twitter-token-secret').value,
            blueskyHandle: document.getElementById('bluesky-handle').value,
            blueskyPassword: document.getElementById('bluesky-password').value
        };

        if (window.electron && window.electron.exportCredentials) {
            const result = await window.electron.exportCredentials(creds);
            if (result.success) {
                showStatus('Credentials exported successfully!', 'success');
            } else if (!result.canceled) {
                showStatus('Failed to export credentials: ' + result.error, 'error');
            }
        } else {
            // Fallback for browser mode - download as JSON
            const dataStr = JSON.stringify(creds, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'socialsox-credentials.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showStatus('Credentials exported to download!', 'success');
        }
    } catch (error) {
        showStatus('Export failed: ' + error.message, 'error');
    }
}

async function importCredentials() {
    try {
        if (window.electron && window.electron.importCredentials) {
            const result = await window.electron.importCredentials();
            if (result.success && result.credentials) {
                // Load the imported credentials into the form
                const creds = result.credentials;
                document.getElementById('mastodon-instance').value = creds.mastodonInstance || '';
                document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                document.getElementById('twitter-key').value = creds.twitterKey || '';
                document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                document.getElementById('twitter-token').value = creds.twitterToken || '';
                document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                
                // Save to localStorage
                await saveCredentials();
                showStatus('Credentials imported successfully!', 'success');
            } else if (!result.canceled) {
                showStatus('Failed to import credentials: ' + result.error, 'error');
            }
        } else {
            // Fallback for browser mode - use file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await file.text();
                        const creds = JSON.parse(text);
                        
                        // Load the imported credentials into the form
                        document.getElementById('mastodon-instance').value = creds.mastodonInstance || '';
                        document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                        document.getElementById('twitter-key').value = creds.twitterKey || '';
                        document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                        document.getElementById('twitter-token').value = creds.twitterToken || '';
                        document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                        document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                        document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                        
                        // Save to localStorage
                        await saveCredentials();
                        showStatus('Credentials imported successfully!', 'success');
                    } catch (error) {
                        showStatus('Failed to parse credentials file: ' + error.message, 'error');
                    }
                }
            };
            input.click();
        }
    } catch (error) {
        showStatus('Import failed: ' + error.message, 'error');
    }
}

// Tab switching functionality
function switchTab(tab) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('text-primary-600', 'dark:text-primary-400', 'border-primary-600', 'dark:border-primary-400');
        btn.classList.add('text-gray-500', 'dark:text-gray-400', 'border-transparent');
    });
    
    // Show selected tab content
    document.getElementById(tab + 'Content').classList.remove('hidden');
    
    // Add active class to selected tab
    document.getElementById(tab + 'Tab').classList.remove('text-gray-500', 'dark:text-gray-400', 'border-transparent');
    document.getElementById(tab + 'Tab').classList.add('text-primary-600', 'dark:text-primary-400', 'border-b-2', 'border-primary-600', 'dark:border-primary-400');
}

// History functionality
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('postingHistory') || '[]');
    displayHistory(history);
}

function saveHistory(history) {
    localStorage.setItem('postingHistory', JSON.stringify(history));
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all posting history? This action cannot be undone.')) {
        localStorage.removeItem('postingHistory');
        displayHistory([]);
        showToast('Posting history cleared', 'success');
    }
}

function addHistoryEntry(message, selectedPlatforms, results) {
    const history = JSON.parse(localStorage.getItem('postingHistory') || '[]');
    const entry = {
        timestamp: new Date().toISOString(),
        message: message,
        platforms: selectedPlatforms,
        results: results
    };
    history.unshift(entry); // Add to beginning
    
    // Keep only last 100 entries
    if (history.length > 100) {
        history.splice(100);
    }
    
    saveHistory(history);
    displayHistory(history);
}

function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    historyList.innerHTML = history.map(entry => {
        const date = new Date(entry.timestamp);
        const timeString = date.toLocaleString();
        const platformsString = entry.platforms.join(', ');
        const resultsString = entry.results.join('\n');
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
                    <span class="text-xs text-gray-600 dark:text-gray-300">${platformsString}</span>
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">${entry.message}</p>
                <div class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">${resultsString}</div>
            </div>
        `;
    }).join('');
}

// Notification functionality
let notificationCheckInterval = null;

// Get all cached notifications from localStorage
function getAllCachedNotifications() {
    const cached = localStorage.getItem('allNotifications');
    return cached ? JSON.parse(cached) : [];
}

// Save all notifications to localStorage
function saveAllNotifications(notifications) {
    localStorage.setItem('allNotifications', JSON.stringify(notifications));
}

// Clear notification cache
function clearNotificationsCache() {
    localStorage.removeItem('allNotifications');
    // Also clear last seen IDs so we refetch all notifications on next load
    localStorage.removeItem('mastodonLastNotificationId');
    localStorage.removeItem('twitterLastMentionId');
    localStorage.removeItem('blueskyLastNotificationTimestamp');
    
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    notificationsList.innerHTML = '';
    noNotifications.style.display = 'block';
    noNotifications.textContent = 'Click "Load Notifications" to check for replies, likes, and mentions across your platforms.';
    showStatus('Notification cache cleared!', 'success');
}

// Reset all app data and settings
function resetAllData() {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL your credentials, history, notifications, and settings. This action cannot be undone!\n\nAre you absolutely sure you want to reset everything?')) {
        return;
    }
    
    // Clear all localStorage
    localStorage.clear();
    
    // Reset form fields
    document.getElementById('mastodon-instance').value = '';
    document.getElementById('mastodon-token').value = '';
    document.getElementById('twitter-key').value = '';
    document.getElementById('twitter-secret').value = '';
    document.getElementById('twitter-token').value = '';
    document.getElementById('twitter-token-secret').value = '';
    document.getElementById('bluesky-handle').value = '';
    document.getElementById('bluesky-password').value = '';
    
    // Reset platforms
    Object.keys(platforms).forEach(platform => {
        platforms[platform] = false;
        const btn = document.querySelector(`.platform-toggle[data-platform="${platform}"]`);
        if (btn) {
            btn.classList.remove('active', 'border-primary-500', 'bg-primary-500', 'text-white');
            btn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
        }
    });
    
    // Reset polling intervals to defaults
    document.getElementById('mastodonInterval').value = 5;
    document.getElementById('mastodonIntervalValue').textContent = 5;
    document.getElementById('twitterInterval').value = 60;
    document.getElementById('twitterIntervalValue').textContent = 60;
    document.getElementById('blueskyInterval').value = 5;
    document.getElementById('blueskyIntervalValue').textContent = 5;
    
    // Reset notification exclusions
    document.getElementById('excludeMastodonNotifications').checked = false;
    document.getElementById('excludeTwitterNotifications').checked = false;
    document.getElementById('excludeBlueskyNotifications').checked = false;
    
    // Reset dark mode to default (true)
    document.getElementById('darkModeToggle').checked = true;
    document.documentElement.classList.add('dark');
    
    // Reset tray icon to default (false)
    document.getElementById('trayIconToggle').checked = false;
    document.getElementById('trayIconSection').style.display = 'none';
    if (window.electron && window.electron.setTrayEnabled) {
        window.electron.setTrayEnabled(false);
    }
    
    // Reset external links to default (false)
    document.getElementById('externalLinksToggle').checked = false;
    
    // Clear history display
    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    historyList.innerHTML = '';
    noHistory.style.display = 'block';
    
    // Clear notifications display
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    notificationsList.innerHTML = '';
    noNotifications.style.display = 'block';
    noNotifications.textContent = 'Click "Load Notifications" to check for replies, likes, and mentions across your platforms.';
    
    // Stop any polling
    stopNotificationPolling();
    
    showStatus('All data has been reset! Please restart the app for a complete fresh start.', 'success');
}

// Start automatic notification checking
function startNotificationPolling() {
    // Clear any existing intervals
    stopNotificationPolling();
    
    // Get polling intervals and exclusions from settings
    const creds = JSON.parse(localStorage.getItem('socialSoxCredentials') || '{}');
    const intervals = creds.pollingIntervals || { mastodon: 5, twitter: 60, bluesky: 5 };
    const exclusions = creds.notificationExclusions || {};
    
    // Start polling for each non-excluded platform
    ['mastodon', 'twitter', 'bluesky'].filter(platform => !exclusions[platform]).forEach(platform => {
        const intervalMinutes = intervals[platform];
        const intervalMs = intervalMinutes * 60 * 1000;
        
        notificationPollingIntervals[platform] = setInterval(() => {
            console.log(`Auto-checking ${platform} notifications...`);
            loadPlatformNotifications(platform, true); // Silent mode
        }, intervalMs);
    });
}

// Restart polling (called when intervals change)
function restartNotificationPolling() {
    startNotificationPolling();
}

// Stop automatic notification checking
function stopNotificationPolling() {
    Object.keys(notificationPollingIntervals).forEach(platform => {
        if (notificationPollingIntervals[platform]) {
            clearInterval(notificationPollingIntervals[platform]);
            notificationPollingIntervals[platform] = null;
        }
    });
}

// Load notifications for a specific platform
async function loadPlatformNotifications(platform, silent = true) {
    // Show toast when polling starts
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    showToast(`Checking ${platformName}...`, 'info', silent ? 1500 : 2000);
    
    const newNotifications = [];
    
    try {
        if (platform === 'mastodon') {
            const mastodonInstance = document.getElementById('mastodon-instance').value;
            const mastodonToken = document.getElementById('mastodon-token').value;
            
            if (mastodonInstance && mastodonToken) {
                const lastSeenId = localStorage.getItem('mastodonLastNotificationId');
                const mastodonNotifs = await fetchMastodonNotifications(mastodonInstance, mastodonToken, lastSeenId);
                newNotifications.push(...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon' })));
                
                // Save the latest notification ID
                if (mastodonNotifs.length > 0) {
                    const latestId = Math.max(...mastodonNotifs.map(n => parseInt(n.id)));
                    localStorage.setItem('mastodonLastNotificationId', latestId.toString());
                }
            }
        } else if (platform === 'twitter') {
            const twitterKey = document.getElementById('twitter-key').value;
            const twitterSecret = document.getElementById('twitter-secret').value;
            const twitterToken = document.getElementById('twitter-token').value;
            const twitterTokenSecret = document.getElementById('twitter-token-secret').value;
            
            if (twitterKey && twitterSecret && twitterToken && twitterTokenSecret) {
                const twitterNotifs = await fetchTwitterNotifications(twitterKey, twitterSecret, twitterToken, twitterTokenSecret);
                newNotifications.push(...twitterNotifs.map(n => ({ ...n, platform: 'twitter' })));
            }
        } else if (platform === 'bluesky') {
            const blueskyHandle = document.getElementById('bluesky-handle').value;
            const blueskyPassword = document.getElementById('bluesky-password').value;
            
            if (blueskyHandle && blueskyPassword) {
                const blueskyNotifs = await fetchBlueskyNotifications(blueskyHandle, blueskyPassword);
                newNotifications.push(...blueskyNotifs.map(n => ({ ...n, platform: 'bluesky' })));
                
                // Save the latest notification timestamp
                if (blueskyNotifs.length > 0) {
                    const latestTimestamp = blueskyNotifs.reduce((latest, n) => {
                        return new Date(n.timestamp) > new Date(latest) ? n.timestamp : latest;
                    }, blueskyNotifs[0].timestamp);
                    localStorage.setItem('blueskyLastNotificationTimestamp', latestTimestamp);
                }
            }
        }
        
        // Get existing cached notifications
        const cachedNotifications = getAllCachedNotifications();
        const cachedIds = new Set(cachedNotifications.map(n => n.id));
        
        // Filter out duplicates and mark as new
        const uniqueNewNotifications = newNotifications
            .filter(n => !cachedIds.has(n.id))
            .map(n => ({ ...n, isNew: true }));
        
        if (uniqueNewNotifications.length > 0) {
            // Add to cache
            const updatedCache = [...cachedNotifications, ...uniqueNewNotifications];
            localStorage.setItem('allNotifications', JSON.stringify(updatedCache));
            
            // Always update UI when there are new notifications
            displayNotifications(updatedCache);
            
            // Show OS notification for new items
            if (window.electron && window.electron.showOSNotification) {
                const count = uniqueNewNotifications.length;
                const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
                window.electron.showOSNotification(
                    `New ${platformName} notifications`,
                    `You have ${count} new notification${count > 1 ? 's' : ''} on ${platformName}`,
                    platform
                );
            }
        }
        
    } catch (error) {
        console.error(`${platform} notifications error:`, error);
        if (error.message.toLowerCase().includes('rate limit')) {
            const errorNotif = {
                id: `error-${platform}-${Date.now()}`,
                platform,
                error: true,
                message: error.message,
                timestamp: new Date().toISOString()
            };
            const allNotifs = getAllCachedNotifications();
            allNotifs.push(errorNotif);
            saveAllNotifications(allNotifs);
            displayNotifications(allNotifs);
            setTimeout(() => {
                markAsSeen(errorNotif.id);
            }, 10000);
        } else if (!silent) {
            showStatus(`Failed to load ${platform} notifications: ${error.message}`, 'error');
        }
    }
}

async function loadNotifications(silent = false) {
    const btn = document.getElementById('loadNotificationsBtn');
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (!silent) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Loading...';
        lucide.createIcons();
    }
    
    noNotifications.style.display = 'none';
    
    try {
        // Get notification exclusions
        const creds = JSON.parse(localStorage.getItem('socialSoxCredentials') || '{}');
        const exclusions = creds.notificationExclusions || {};
        
        // Load notifications from all non-excluded platforms in parallel
        const platformsToCheck = ['mastodon', 'twitter', 'bluesky'].filter(platform => !exclusions[platform]);
        const loadPromises = platformsToCheck.map(platform => 
            loadPlatformNotifications(platform, silent) // Pass the silent flag
        );
        
        await Promise.all(loadPromises);
        
        // Get all cached notifications and display
        const allNotifications = getAllCachedNotifications();
        displayNotifications(allNotifications);
        
        if (!silent) {
            showStatus('Notifications loaded!', 'success');
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        if (!silent) {
            showStatus(`Error loading notifications: ${error.message}`, 'error');
        }
    } finally {
        if (!silent) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Load Notifications';
            lucide.createIcons();
        }
    }
}

// Dismiss notification (hide it completely)
function markAsSeen(notificationId) {
    const allNotifs = getAllCachedNotifications();
    const notif = allNotifs.find(n => n.id === notificationId);
    if (notif) {
        notif.dismissed = true;
        notif.isNew = false;
        saveAllNotifications(allNotifs);
        displayNotifications(allNotifs);
    }
}

// Mark all notifications as read
function markAllAsRead() {
    const allNotifs = getAllCachedNotifications();
    let hasChanges = false;
    
    allNotifs.forEach(notif => {
        if (!notif.dismissed || notif.isNew) {
            notif.dismissed = true;
            notif.isNew = false;
            hasChanges = true;
        }
    });
    
    if (hasChanges) {
        saveAllNotifications(allNotifs);
        displayNotifications(allNotifs);
        showToast('All notifications marked as read', 'success');
    } else {
        showToast('No unread notifications to mark', 'info');
    }
}

async function fetchMastodonNotifications(instance, token, sinceId = null) {
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    let apiUrl = `${cleanInstance}/api/v1/notifications?limit=20`;
    if (sinceId) {
        apiUrl += `&since_id=${sinceId}`;
    }
    
    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        if (response.status === 403) {
            throw new Error('Access denied. Check your Mastodon access token is valid and has read:notifications scope.');
        }
        throw new Error(`${response.status} ${response.statusText}`);
    }
    
    const notifications = await response.json();
    
    // Process notifications and fetch additional context where needed
    const processedNotifications = await Promise.all(notifications.map(async n => {
        // Always construct URL using user's instance for federation
        let url = '';
        if (n.account?.acct && cleanInstance) {
            url = `${cleanInstance}/@${n.account.acct}`;
            if (n.status?.id) {
                url += `/${n.status.id}`;
            }
        } else {
            // Fallback to original URLs
            url = n.status?.url || n.account?.url || '';
        }
        
        let replyingTo = null;
        let quotingTo = null;
        
        if (n.type === 'mention' && n.status?.in_reply_to_id) {
            // Fetch the parent status for context
            try {
                const parentResponse = await fetch(`${cleanInstance}/api/v1/statuses/${n.status.in_reply_to_id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (parentResponse.ok) {
                    const parentStatus = await parentResponse.json();
                    replyingTo = parentStatus.content?.replace(/<[^>]*>/g, '') || '';
                }
            } catch (error) {
                console.warn('Failed to fetch parent status:', error);
            }
        } else if (n.type === 'mention' && n.status?.content) {
            // For mentions that are not replies, check if they contain a status URL (quote)
            const content = n.status.content;
            const urlRegex = /https?:\/\/([^\/]+)\/@[^\/]+\/(\d+)/g;
            let match;
            const foundUrls = [];
            while ((match = urlRegex.exec(content)) !== null) {
                foundUrls.push({
                    instance: match[1],
                    statusId: match[2],
                    fullUrl: match[0]
                });
            }
            if (foundUrls.length > 0) {
                // Take the first status URL found
                const { instance, statusId } = foundUrls[0];
                try {
                    const quotedResponse = await fetch(`https://${instance}/api/v1/statuses/${statusId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    if (quotedResponse.ok) {
                        const quotedStatus = await quotedResponse.json();
                        quotingTo = quotedStatus.content?.replace(/<[^>]*>/g, '') || '';
                    }
                } catch (error) {
                    console.warn('Failed to fetch quoted status:', error);
                }
            }
        }
        
        let subjectContent = null;
        if ((n.type === 'favourite' || n.type === 'reblog') && n.status?.content) {
            // For favourites and reblogs, extract the subject status content
            subjectContent = n.status.content.replace(/<[^>]*>/g, '') || '';
        }
        
        return {
            id: n.id,
            type: n.type,
            timestamp: n.created_at,
            author: n.account?.display_name || n.account?.username || 'Unknown',
            authorHandle: n.account?.acct || '',
            content: n.status?.content?.replace(/<[^>]*>/g, '') || '',
            subjectContent: subjectContent,
            replyingTo: replyingTo,
            quotingTo: quotingTo,
            url: url
        };
    }));
    
    return processedNotifications;
}

async function fetchTwitterNotifications(apiKey, apiSecret, accessToken, accessTokenSecret) {
    if (typeof window.electron === 'undefined' || !window.electron.fetchTwitterNotifications) {
        console.log('window.electron:', window.electron);
        throw new Error('Twitter notifications require Electron app. Restart with: npm start');
    }
    
    // Get last seen mention ID to avoid fetching old notifications
    const lastSeenId = localStorage.getItem('twitterLastMentionId');
    
    const result = await window.electron.fetchTwitterNotifications(apiKey, apiSecret, accessToken, accessTokenSecret, lastSeenId);
    
    if (!result.success) {
        // Better error message for rate limiting
        if (result.error && result.error.includes('Too Many Requests')) {
            throw new Error('Twitter rate limit reached. Wait 15 minutes before retrying.');
        }
        throw new Error(result.error);
    }
    
    // Save the latest mention ID to avoid fetching old notifications next time
    if (result.latestId) {
        localStorage.setItem('twitterLastMentionId', result.latestId);
    }
    
    return result.data;
}

async function fetchBlueskyNotifications(handle, password) {
    // Create session
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            identifier: handle,
            password: password
        })
    });
    
    if (!sessionResponse.ok) {
        throw new Error('Auth failed');
    }
    
    const session = await sessionResponse.json();
    
    const response = await fetch('https://bsky.social/xrpc/app.bsky.notification.listNotifications?limit=25', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${session.accessJwt}`
        }
    });
    
    if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Process notifications and fetch additional context
    const processedNotifications = await Promise.all(data.notifications.map(async n => {
        let url = null;
        const authorDid = n.author?.did;
        let subjectContent = null;
        let replyingTo = null;
        let quotingTo = null;
        
        if (n.reason === 'follow') {
            // For follows, link to the author's profile
            if (authorDid) {
                url = `https://bsky.app/profile/${authorDid}`;
            }
        } else if (n.reason === 'like' || n.reason === 'repost') {
            // For likes and reposts, link to the subject post and fetch its content
            const subjectUri = n.record?.subject?.uri;
            if (subjectUri) {
                const uriParts = subjectUri.split('/');
                const subjectDid = uriParts[2]; // at://did/app.bsky.feed.post/postId
                const postId = uriParts[uriParts.length - 1];
                if (subjectDid && postId) {
                    url = `https://bsky.app/profile/${subjectDid}/post/${postId}`;
                    // Fetch the subject post content
                    try {
                        const recordResponse = await fetch(`https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=${subjectDid}&collection=app.bsky.feed.post&rkey=${postId}`, {
                            headers: {
                                'Authorization': `Bearer ${session.accessJwt}`
                            }
                        });
                        if (recordResponse.ok) {
                            const recordData = await recordResponse.json();
                            subjectContent = recordData.value?.text || '';
                        }
                    } catch (error) {
                        console.warn('Failed to fetch subject post:', error);
                    }
                }
            }
        } else if (n.reason === 'reply') {
            // For replies, link to the reply and fetch the parent
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            if (authorDid && postId) {
                url = `https://bsky.app/profile/${authorDid}/post/${postId}`;
                // Fetch the parent post if this is a reply
                if (n.record?.reply?.parent?.uri) {
                    const parentUri = n.record.reply.parent.uri;
                    const parentUriParts = parentUri.split('/');
                    const parentDid = parentUriParts[2];
                    const parentPostId = parentUriParts[uriParts.length - 1];
                    try {
                        const parentResponse = await fetch(`https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=${parentDid}&collection=app.bsky.feed.post&rkey=${parentPostId}`, {
                            headers: {
                                'Authorization': `Bearer ${session.accessJwt}`
                            }
                        });
                        if (parentResponse.ok) {
                            const parentData = await parentResponse.json();
                            replyingTo = parentData.value?.text || '';
                        }
                    } catch (error) {
                        console.warn('Failed to fetch parent post:', error);
                    }
                }
            }
        } else if (n.reason === 'quote') {
            // For quotes, link to the quote and fetch the quoted post
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            if (authorDid && postId) {
                url = `https://bsky.app/profile/${authorDid}/post/${postId}`;
                // Fetch the quoted post if this is a quote
                if (n.record?.embed?.record?.uri) {
                    const quotedUri = n.record.embed.record.uri;
                    const quotedUriParts = quotedUri.split('/');
                    const quotedDid = quotedUriParts[2];
                    const quotedPostId = quotedUriParts[quotedUriParts.length - 1];
                    try {
                        const quotedResponse = await fetch(`https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=${quotedDid}&collection=app.bsky.feed.post&rkey=${quotedPostId}`, {
                            headers: {
                                'Authorization': `Bearer ${session.accessJwt}`
                            }
                        });
                        if (quotedResponse.ok) {
                            const quotedData = await quotedResponse.json();
                            quotingTo = quotedData.value?.text || '';
                        }
                    } catch (error) {
                        console.warn('Failed to fetch quoted post:', error);
                    }
                }
            }
        } else if (n.uri) {
            // For mentions, quotes, etc., link to the post
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            if (authorDid && postId) {
                url = `https://bsky.app/profile/${authorDid}/post/${postId}`;
            }
        }
        
        return {
            id: n.uri,
            type: n.reason,
            timestamp: n.indexedAt,
            author: n.author?.displayName || n.author?.handle || 'Unknown',
            authorHandle: n.author?.handle || '',
            content: n.record?.text || '',
            subjectContent: subjectContent,
            replyingTo: replyingTo,
            quotingTo: quotingTo,
            isRead: n.isRead,
            url: url
        };
    }));
    
    return processedNotifications;
}

function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    // Show all notifications that haven't been explicitly dismissed
    const visibleNotifications = notifications.filter(n => !n.dismissed);
    
    // Sort by timestamp, newest first
    visibleNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (visibleNotifications.length === 0) {
        notificationsList.innerHTML = '';
        noNotifications.style.display = 'block';
        noNotifications.textContent = 'No notifications!';
        return;
    }
    
    noNotifications.style.display = 'none';
    
    const platformIcons = {
        mastodon: '<img src="assets/masto.svg" alt="M" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">',
        twitter: '<img src="assets/twit.svg" alt="X" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">',
        bluesky: '<img src="assets/bsky.svg" alt="B" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">'
    };
    
    const typeLabels = {
        mention: 'Mentioned you',
        reply: 'Replied to you',
        reblog: 'Reposted',
        favourite: 'Liked',
        like: 'Liked',
        repost: 'Reposted',
        follow: 'Followed you',
        quote: 'Quoted you'
    };
    
    notificationsList.innerHTML = visibleNotifications.map(notif => {
        if (notif.error) {
            return `
                <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                    <div class="flex items-center gap-2 mb-2">
                        ${platformIcons[notif.platform] || ''}
                        <span class="text-xs font-semibold text-red-700 dark:text-red-300">${notif.platform.toUpperCase()}</span>
                    </div>
                    <p class="text-sm text-red-800 dark:text-red-200">${notif.message}</p>
                </div>
            `;
        }
        
        const date = new Date(notif.timestamp);
        const timeString = date.toLocaleString();
        const typeLabel = typeLabels[notif.type] || notif.type;
        
        // New notifications get a special highlight
        const unseenClass = notif.isNew ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : '';
        const unseenBadge = notif.isNew ? '<span class="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">New</span>' : '';
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${unseenClass}">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        ${platformIcons[notif.platform] || ''}
                        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">${notif.platform.toUpperCase()}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">•</span>
                        <span class="text-xs text-primary-600 dark:text-primary-400">${typeLabel}</span>
                        ${unseenBadge}
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
                        <button onclick="markAsSeen('${notif.id}'); event.stopPropagation();" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Dismiss">×</button>
                    </div>
                </div>
                <div class="mb-2">
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${notif.author}</span>
                    ${notif.authorHandle ? `<span class="text-xs text-gray-500 dark:text-gray-400">@${notif.authorHandle}</span>` : ''}
                </div>
                ${(() => {
                    let displayContent = notif.content;
                    let contentLabel = '';
                    
                    // For likes/reposts/favourites/reblogs and mentions, show the content in a styled box
                    if ((notif.type === 'like' || notif.type === 'repost' || notif.type === 'favourite' || notif.type === 'reblog') && notif.subjectContent) {
                        displayContent = notif.subjectContent;
                        // Use styled box like replying to section
                        return `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">${displayContent.substring(0, 150)}${displayContent.length > 150 ? '...' : ''}</div>`;
                    } else if (notif.type === 'mention') {
                        // For mentions, show the mention content in a styled box
                        return `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">${displayContent.substring(0, 150)}${displayContent.length > 150 ? '...' : ''}</div>`;
                    }
                    
                    return displayContent ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-2">${contentLabel}${displayContent.substring(0, 200)}${displayContent.length > 200 ? '...' : ''}</p>` : '';
                })()}
                ${notif.replyingTo ? `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400"><strong>Replying to:</strong> ${notif.replyingTo.substring(0, 150)}${notif.replyingTo.length > 150 ? '...' : ''}</div>` : ''}
                ${notif.quotingTo ? `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400"><strong>Quoting:</strong> ${notif.quotingTo.substring(0, 150)}${notif.quotingTo.length > 150 ? '...' : ''}</div>` : ''}
                ${notif.url ? `<a href="${notif.url}" ${localStorage.getItem('socialSoxExternalLinks') === 'true' ? 'onclick="window.electron.openExternalLink(this.href); return false;"' : 'target="_blank"'} class="text-xs text-primary-600 dark:text-primary-400 hover:underline">View on ${notif.platform}</a>` : ''}
            </div>
        `;
    }).join('');
}

// Test notification function
function testNotification() {
    if (window.electron && window.electron.showOSNotification) {
        window.electron.showOSNotification(
            'Test Notification',
            'This is a test notification from SocialSox!',
            'test'
        );
        showToast('Test notification sent!', 'success');
    } else {
        showToast('Notifications not supported', 'error');
    }
}
