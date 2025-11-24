// Platform selection state
const platforms = {
    mastodon: true,
    twitter: true,
    bluesky: true
};

// Load credentials from localStorage on page load
window.addEventListener('DOMContentLoaded', () => {
    loadCredentials();
    
    // Character counter
    document.getElementById('message').addEventListener('input', updateCharCount);
    
    // Platform toggles
    document.querySelectorAll('.platform-toggle').forEach(btn => {
        btn.addEventListener('click', function() {
            const platform = this.dataset.platform;
            platforms[platform] = !platforms[platform];
            this.classList.toggle('active');
        });
    });
    
    // Save credentials on change
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', saveCredentials);
    });
});

function toggleCollapsible() {
    const content = document.getElementById('credentials');
    const arrow = document.getElementById('arrow');
    content.classList.toggle('open');
    arrow.classList.toggle('open');
}

function updateCharCount() {
    const message = document.getElementById('message').value;
    const count = message.length;
    const countEl = document.getElementById('charCount');
    
    countEl.textContent = `${count} characters`;
    
    if (count > 280) {
        countEl.className = 'char-count error';
    } else if (count > 250) {
        countEl.className = 'char-count warning';
    } else {
        countEl.className = 'char-count';
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
        blueskyPassword: document.getElementById('bluesky-password').value
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
    }
}

function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}

async function postToMastodon(message, instance, token) {
    // Ensure instance URL doesn't have trailing slash or username path
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    // Remove any path after the domain (like /@username)
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    const response = await fetch(`${cleanInstance}/api/v1/statuses`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: message })
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
    }
    
    return await response.json();
}

async function postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret) {
    // Check if we're in Electron (has window.electron)
    if (window.electron && window.electron.postToTwitter) {
        console.log('Calling Electron backend for Twitter...');
        const result = await window.electron.postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret);
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

async function postToBluesky(message, handle, password) {
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
    
    // Create post
    const postResponse = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${session.accessJwt}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            repo: session.did,
            collection: 'app.bsky.feed.post',
            record: {
                text: message,
                createdAt: new Date().toISOString()
            }
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
    
    try {
        // Mastodon
        if (platforms.mastodon) {
            const instance = document.getElementById('mastodon-instance').value;
            const token = document.getElementById('mastodon-token').value;
            
            if (instance && token) {
                try {
                    await postToMastodon(message, instance, token);
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
                    await postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret);
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
                    await postToBluesky(message, handle, password);
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
        
        // Clear message if all successful
        if (hasSuccess && !hasFailure) {
            document.getElementById('message').value = '';
            updateCharCount();
        }
        
    } catch (error) {
        showStatus('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Post to Selected Platforms';
    }
}
