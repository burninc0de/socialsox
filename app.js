// Platform selection state
const platforms = {
    mastodon: false,
    twitter: false,
    bluesky: false
};

// Image state
let selectedImage = null;

// Load credentials from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCredentials();
    loadHistory();
    
    // Start automatic notification checking
    startNotificationPolling();
    
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
    
    // Platform toggles
    document.querySelectorAll('.platform-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
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
            saveCredentials();
        });
    });
    
    // Save credentials on change
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveCredentials);
    });
    
    // Image upload handlers
    setupImageUpload();
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

function saveCredentials() {
    const creds = {
        mastodonInstance: document.getElementById('mastodon-instance').value,
        mastodonToken: document.getElementById('mastodon-token').value,
        twitterKey: document.getElementById('twitter-key').value,
        twitterSecret: document.getElementById('twitter-secret').value,
        twitterToken: document.getElementById('twitter-token').value,
        twitterTokenSecret: document.getElementById('twitter-token-secret').value,
        blueskyHandle: document.getElementById('bluesky-handle').value,
        blueskyPassword: document.getElementById('bluesky-password').value,
        platforms: { ...platforms }
    };
    
    localStorage.setItem('socialSoxCredentials', JSON.stringify(creds));
}

function loadCredentials() {
    const saved = localStorage.getItem('socialSoxCredentials');
    if (saved) {
        const creds = JSON.parse(saved);
        document.getElementById('mastodon-instance').value = creds.mastodonInstance || '';
        document.getElementById('mastodon-token').value = creds.mastodonToken || '';
        document.getElementById('twitter-key').value = creds.twitterKey || '';
        document.getElementById('twitter-secret').value = creds.twitterSecret || '';
        document.getElementById('twitter-token').value = creds.twitterToken || '';
        document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
        document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
        document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
        
        // Load platforms
        if (creds.platforms) {
            Object.assign(platforms, creds.platforms);
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
                saveCredentials();
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
                        saveCredentials();
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
let notificationsCache = {
    data: [],
    timestamp: 0,
    ttl: 60000 // Cache for 1 minute
};

let notificationCheckInterval = null;

// Load seen notifications from localStorage
function getSeenNotifications() {
    const seen = localStorage.getItem('seenNotifications');
    return seen ? JSON.parse(seen) : [];
}

// Save seen notifications to localStorage
function saveSeenNotifications(notificationIds) {
    localStorage.setItem('seenNotifications', JSON.stringify(notificationIds));
}

// Clear seen notifications cache
function clearNotificationsCache() {
    localStorage.removeItem('seenNotifications');
    notificationsCache = {
        data: [],
        timestamp: 0,
        ttl: 60000
    };
    showStatus('Notification cache cleared!', 'success');
    loadNotifications();
}

// Start automatic notification checking
function startNotificationPolling() {
    // Clear any existing interval
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    
    // Check every 15 minutes (900000 ms)
    notificationCheckInterval = setInterval(() => {
        console.log('Auto-checking notifications...');
        loadNotifications(true); // Pass true for silent mode
    }, 900000);
}

// Stop automatic notification checking
function stopNotificationPolling() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
        notificationCheckInterval = null;
    }
}

async function loadNotifications(silent = false) {
    const btn = document.getElementById('loadNotificationsBtn');
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    // Check if we have recent cached data
    const now = Date.now();
    if (notificationsCache.data.length > 0 && (now - notificationsCache.timestamp) < notificationsCache.ttl) {
        displayNotifications(notificationsCache.data);
        if (!silent) {
            showStatus('Loaded from cache (refreshes every minute)', 'info');
        }
        return;
    }
    
    if (!silent) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Loading...';
        lucide.createIcons();
    }
    
    notificationsList.innerHTML = '';
    noNotifications.style.display = 'none';
    
    const allNotifications = [];
    
    try {
        // Load Mastodon notifications (check credentials, not platform toggle)
        const mastodonInstance = document.getElementById('mastodon-instance').value;
        const mastodonToken = document.getElementById('mastodon-token').value;
        
        if (mastodonInstance && mastodonToken) {
            try {
                const mastodonNotifs = await fetchMastodonNotifications(mastodonInstance, mastodonToken);
                allNotifications.push(...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon' })));
            } catch (error) {
                console.error('Mastodon notifications error:', error);
                allNotifications.push({
                    platform: 'mastodon',
                    error: true,
                    message: 'Failed to load Mastodon notifications: ' + error.message
                });
            }
        }
        
        // Load Twitter notifications (check credentials, not platform toggle)
        const twitterKey = document.getElementById('twitter-key').value;
        const twitterSecret = document.getElementById('twitter-secret').value;
        const twitterToken = document.getElementById('twitter-token').value;
        const twitterTokenSecret = document.getElementById('twitter-token-secret').value;
        
        if (twitterKey && twitterSecret && twitterToken && twitterTokenSecret) {
            try {
                const twitterNotifs = await fetchTwitterNotifications(twitterKey, twitterSecret, twitterToken, twitterTokenSecret);
                allNotifications.push(...twitterNotifs.map(n => ({ ...n, platform: 'twitter' })));
            } catch (error) {
                console.error('Twitter notifications error:', error);
                allNotifications.push({
                    platform: 'twitter',
                    error: true,
                    message: 'Failed to load Twitter notifications: ' + error.message
                });
            }
        }
        
        // Load Bluesky notifications (check credentials, not platform toggle)
        const blueskyHandle = document.getElementById('bluesky-handle').value;
        const blueskyPassword = document.getElementById('bluesky-password').value;
        
        if (blueskyHandle && blueskyPassword) {
            try {
                const blueskyNotifs = await fetchBlueskyNotifications(blueskyHandle, blueskyPassword);
                allNotifications.push(...blueskyNotifs.map(n => ({ ...n, platform: 'bluesky' })));
            } catch (error) {
                console.error('Bluesky notifications error:', error);
                allNotifications.push({
                    platform: 'bluesky',
                    error: true,
                    message: 'Failed to load Bluesky notifications: ' + error.message
                });
            }
        }
        
        // Sort by timestamp (most recent first)
        allNotifications.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0);
            const timeB = new Date(b.timestamp || 0);
            return timeB - timeA;
        });
        
        // Mark notifications as seen/unseen
        const seenIds = getSeenNotifications();
        allNotifications.forEach(notif => {
            notif.isSeen = seenIds.includes(notif.id);
        });
        
        // Cache the results
        notificationsCache.data = allNotifications;
        notificationsCache.timestamp = Date.now();
        
        displayNotifications(allNotifications);
        
        // Count unseen notifications
        const unseenCount = allNotifications.filter(n => !n.isSeen && !n.error).length;
        if (unseenCount > 0 && !silent) {
            showStatus(`Found ${unseenCount} new notification${unseenCount > 1 ? 's' : ''}!`, 'success');
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationsList.innerHTML = `<div class="text-red-500 dark:text-red-400 text-center py-4">Error: ${error.message}</div>`;
    } finally {
        if (!silent) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Load Notifications';
            lucide.createIcons();
        }
    }
}

// Mark notification as seen
function markAsSeen(notificationId) {
    const seenIds = getSeenNotifications();
    if (!seenIds.includes(notificationId)) {
        seenIds.push(notificationId);
        saveSeenNotifications(seenIds);
        
        // Update cache
        if (notificationsCache.data.length > 0) {
            const notif = notificationsCache.data.find(n => n.id === notificationId);
            if (notif) {
                notif.isSeen = true;
                displayNotifications(notificationsCache.data);
            }
        }
    }
}

async function fetchMastodonNotifications(instance, token) {
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    const response = await fetch(`${cleanInstance}/api/v1/notifications?limit=20`, {
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
    return notifications.map(n => ({
        id: n.id,
        type: n.type,
        timestamp: n.created_at,
        author: n.account?.display_name || n.account?.username || 'Unknown',
        authorHandle: n.account?.acct || '',
        content: n.status?.content?.replace(/<[^>]*>/g, '') || '',
        url: n.status?.url || n.account?.url
    }));
}

async function fetchTwitterNotifications(apiKey, apiSecret, accessToken, accessTokenSecret) {
    if (typeof window.electron === 'undefined' || !window.electron.fetchTwitterNotifications) {
        console.log('window.electron:', window.electron);
        throw new Error('Twitter notifications require Electron app. Restart with: npm start');
    }
    
    const result = await window.electron.fetchTwitterNotifications(apiKey, apiSecret, accessToken, accessTokenSecret);
    
    if (!result.success) {
        // Better error message for rate limiting
        if (result.error && result.error.includes('Too Many Requests')) {
            throw new Error('Twitter rate limit reached. Wait 15 minutes before retrying.');
        }
        throw new Error(result.error);
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
    return data.notifications.map(n => {
        // Extract post ID from URI (format: at://did:plc:xxx/app.bsky.feed.post/xxxxx)
        let url = null;
        if (n.uri) {
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            const authorHandle = n.author?.handle;
            if (authorHandle && postId) {
                url = `https://bsky.app/profile/${authorHandle}/post/${postId}`;
            }
        }
        
        return {
            id: n.uri,
            type: n.reason,
            timestamp: n.indexedAt,
            author: n.author?.displayName || n.author?.handle || 'Unknown',
            authorHandle: n.author?.handle || '',
            content: n.record?.text || '',
            isRead: n.isRead,
            url: url
        };
    });
}

function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '';
        noNotifications.style.display = 'block';
        noNotifications.textContent = 'No notifications found!';
        return;
    }
    
    noNotifications.style.display = 'none';
    
    const platformIcons = {
        mastodon: '<img src="assets/masto.svg" alt="M" class="w-4 h-4 inline-block brightness-0 invert">',
        twitter: '<img src="assets/twit.svg" alt="X" class="w-4 h-4 inline-block brightness-0 invert">',
        bluesky: '<img src="assets/bsky.svg" alt="B" class="w-4 h-4 inline-block brightness-0 invert">'
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
    
    notificationsList.innerHTML = notifications.map(notif => {
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
        
        // Unseen notifications get a special highlight
        const unseenClass = !notif.isSeen ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : '';
        const unseenBadge = !notif.isSeen ? '<span class="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">New</span>' : '';
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${unseenClass}" onclick="markAsSeen('${notif.id}')">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        ${platformIcons[notif.platform] || ''}
                        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">${notif.platform.toUpperCase()}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">•</span>
                        <span class="text-xs text-primary-600 dark:text-primary-400">${typeLabel}</span>
                        ${unseenBadge}
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
                </div>
                <div class="mb-2">
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-200">${notif.author}</span>
                    ${notif.authorHandle ? `<span class="text-xs text-gray-500 dark:text-gray-400">@${notif.authorHandle}</span>` : ''}
                </div>
                ${notif.content ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-2">${notif.content.substring(0, 200)}${notif.content.length > 200 ? '...' : ''}</p>` : ''}
                ${notif.url ? `<a href="${notif.url}" target="_blank" class="text-xs text-primary-600 dark:text-primary-400 hover:underline" onclick="event.stopPropagation()">View on ${notif.platform}</a>` : ''}
            </div>
        `;
    }).join('');
}
