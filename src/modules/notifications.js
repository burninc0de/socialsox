// Notification fetching, polling, and display

export let notificationPollingIntervals = {
    mastodon: null,
    twitter: null,
    bluesky: null
};

export function getAllCachedNotifications() {
    const cached = localStorage.getItem('allNotifications');
    return cached ? JSON.parse(cached) : [];
}

export function saveAllNotifications(notifications) {
    localStorage.setItem('allNotifications', JSON.stringify(notifications));
}

export function clearNotificationsCache() {
    localStorage.removeItem('allNotifications');
    localStorage.removeItem('mastodonLastNotificationId');
    localStorage.removeItem('twitterLastMentionId');
    localStorage.removeItem('blueskyLastNotificationTimestamp');
    
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    notificationsList.innerHTML = '';
    noNotifications.style.display = 'block';
    noNotifications.textContent = 'Click "Load Notifications" to check for replies, likes, and mentions across your platforms.';
    window.showStatus('Notification cache cleared!', 'success');
}

export function startNotificationPolling() {
    stopNotificationPolling();
    
    const settings = JSON.parse(localStorage.getItem('socialSoxSettings') || '{}');
    const intervals = settings.pollingIntervals || { mastodon: 5, twitter: 60, bluesky: 5 };
    const exclusions = settings.notificationExclusions || {};
    
    ['mastodon', 'twitter', 'bluesky'].filter(platform => !exclusions[platform]).forEach(platform => {
        const intervalMinutes = intervals[platform];
        const intervalMs = intervalMinutes * 60 * 1000;
        
        notificationPollingIntervals[platform] = setInterval(() => {
            console.log(`Auto-checking ${platform} notifications...`);
            loadPlatformNotifications(platform, true);
        }, intervalMs);
    });
}

export function restartNotificationPolling() {
    startNotificationPolling();
}

export function stopNotificationPolling() {
    Object.keys(notificationPollingIntervals).forEach(platform => {
        if (notificationPollingIntervals[platform]) {
            clearInterval(notificationPollingIntervals[platform]);
            notificationPollingIntervals[platform] = null;
        }
    });
}

export async function loadPlatformNotifications(platform, silent = true) {
    const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
    window.showToast(`Checking ${platformName}...`, 'info', silent ? 1500 : 2000);
    
    const newNotifications = [];
    
    try {
        if (platform === 'mastodon') {
            const mastodonInstance = document.getElementById('mastodon-instance').value;
            const mastodonToken = document.getElementById('mastodon-token').value;
            
            if (mastodonInstance && mastodonToken) {
                const lastSeenId = localStorage.getItem('mastodonLastNotificationId');
                const mastodonNotifs = await fetchMastodonNotifications(mastodonInstance, mastodonToken, lastSeenId);
                newNotifications.push(...mastodonNotifs.map(n => ({ ...n, platform: 'mastodon' })));
                
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
                
                if (blueskyNotifs.length > 0) {
                    const latestTimestamp = blueskyNotifs.reduce((latest, n) => {
                        return new Date(n.timestamp) > new Date(latest) ? n.timestamp : latest;
                    }, blueskyNotifs[0].timestamp);
                    localStorage.setItem('blueskyLastNotificationTimestamp', latestTimestamp);
                }
            }
        }
        
        const cachedNotifications = getAllCachedNotifications();
        const cachedIds = new Set(cachedNotifications.map(n => n.id));
        
        const uniqueNewNotifications = newNotifications
            .filter(n => !cachedIds.has(n.id))
            .map(n => ({ ...n, isNew: true }));
        
        if (uniqueNewNotifications.length > 0) {
            const updatedCache = [...cachedNotifications, ...uniqueNewNotifications];
            localStorage.setItem('allNotifications', JSON.stringify(updatedCache));
            
            displayNotifications(updatedCache);
            
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
            window.showStatus(`Failed to load ${platform} notifications: ${error.message}`, 'error');
        }
    }
}

export async function loadNotifications(silent = false) {
    const btn = document.getElementById('loadNotificationsBtn');
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    if (!silent) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Loading...';
        if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
            lucide.createIcons({icons: window.lucideIcons});
        }
    }
    
    noNotifications.style.display = 'none';
    
    try {
        const settings = JSON.parse(localStorage.getItem('socialSoxSettings') || '{}');
        const exclusions = settings.notificationExclusions || {};
        
        const platformsToCheck = ['mastodon', 'twitter', 'bluesky'].filter(platform => !exclusions[platform]);
        const loadPromises = platformsToCheck.map(platform => 
            loadPlatformNotifications(platform, silent)
        );
        
        await Promise.all(loadPromises);
        
        const allNotifications = getAllCachedNotifications();
        displayNotifications(allNotifications);
        
        if (!silent) {
            window.showStatus('Notifications loaded!', 'success');
        }
        
    } catch (error) {
        console.error('Error loading notifications:', error);
        if (!silent) {
            window.showStatus(`Error loading notifications: ${error.message}`, 'error');
        }
    } finally {
        if (!silent) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Load Notifications';
            if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
                lucide.createIcons({icons: window.lucideIcons});
            }
        }
    }
}

export function markAsSeen(notificationId) {
    const allNotifs = getAllCachedNotifications();
    const notif = allNotifs.find(n => n.id === notificationId);
    if (notif) {
        notif.dismissed = true;
        notif.isNew = false;
        saveAllNotifications(allNotifs);
        displayNotifications(allNotifs);
    }
}

export function markAllAsRead() {
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
        window.showToast('All notifications marked as read', 'success');
    } else {
        window.showToast('No unread notifications to mark', 'info');
    }
}

export function testNotification() {
    if (window.electron && window.electron.showOSNotification) {
        window.electron.showOSNotification(
            'Test Notification',
            'This is a test notification from SocialSox!',
            'test'
        );
        window.showToast('Test notification sent!', 'success');
    } else {
        window.showToast('Notifications not supported', 'error');
    }
}


// Fetch functions for each platform
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
    
    const processedNotifications = await Promise.all(notifications.map(async n => {
        let url = '';
        if (n.status?.url) {
            url = n.status.url;
        } else if (n.status?.account?.acct && cleanInstance) {
            url = `${cleanInstance}/@${n.status.account.acct}`;
            if (n.status?.id) {
                url += `/${n.status.id}`;
            }
        } else {
            url = n.account?.url || '';
        }
        
        let replyingTo = null;
        let quotingTo = null;
        
        if (n.type === 'mention' && n.status?.in_reply_to_id) {
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
        throw new Error('Twitter notifications require Electron app. Restart with: npm start');
    }
    
    const lastSeenId = localStorage.getItem('twitterLastMentionId');
    
    const result = await window.electron.fetchTwitterNotifications(apiKey, apiSecret, accessToken, accessTokenSecret, lastSeenId);
    
    if (!result.success) {
        if (result.error && result.error.includes('Too Many Requests')) {
            throw new Error('Twitter rate limit reached. Wait 15 minutes before retrying.');
        }
        throw new Error(result.error);
    }
    
    if (result.latestId) {
        localStorage.setItem('twitterLastMentionId', result.latestId);
    }
    
    return result.data;
}

async function fetchBlueskyNotifications(handle, password) {
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
    
    const processedNotifications = await Promise.all(data.notifications.map(async n => {
        let url = null;
        const authorDid = n.author?.did;
        let subjectContent = null;
        let replyingTo = null;
        let quotingTo = null;
        
        if (n.reason === 'follow') {
            if (authorDid) {
                url = `https://bsky.app/profile/${authorDid}`;
            }
        } else if (n.reason === 'like' || n.reason === 'repost') {
            const subjectUri = n.record?.subject?.uri;
            if (subjectUri) {
                const uriParts = subjectUri.split('/');
                const subjectDid = uriParts[2];
                const postId = uriParts[uriParts.length - 1];
                if (subjectDid && postId) {
                    url = `https://bsky.app/profile/${subjectDid}/post/${postId}`;
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
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            if (authorDid && postId) {
                url = `https://bsky.app/profile/${authorDid}/post/${postId}`;
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
            const uriParts = n.uri.split('/');
            const postId = uriParts[uriParts.length - 1];
            if (authorDid && postId) {
                url = `https://bsky.app/profile/${authorDid}/post/${postId}`;
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

async function displayNotifications(notifications) {
    const notificationsList = document.getElementById('notificationsList');
    const noNotifications = document.getElementById('noNotifications');
    
    const visibleNotifications = notifications.filter(n => !n.dismissed);
    
    visibleNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (visibleNotifications.length === 0) {
        notificationsList.innerHTML = '';
        noNotifications.style.display = 'block';
        noNotifications.textContent = 'No notifications!';
        return;
    }
    
    noNotifications.style.display = 'none';
    
    const assetsPath = await window.electron.getAssetsPath();
    const platformIcons = {
        mastodon: `<img src="file://${assetsPath}/masto.svg" alt="M" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">`,
        twitter: `<img src="file://${assetsPath}/twit.svg" alt="X" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">`,
        bluesky: `<img src="file://${assetsPath}/bsky.svg" alt="B" class="w-4 h-4 inline-block dark:brightness-0 dark:invert">`
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
                    
                    if ((notif.type === 'like' || notif.type === 'repost' || notif.type === 'favourite' || notif.type === 'reblog') && notif.subjectContent) {
                        displayContent = notif.subjectContent;
                        return `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">${displayContent.substring(0, 150)}${displayContent.length > 150 ? '...' : ''}</div>`;
                    } else if (notif.type === 'mention') {
                        return `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400">${displayContent.substring(0, 150)}${displayContent.length > 150 ? '...' : ''}</div>`;
                    }
                    
                    return displayContent ? `<p class="text-sm text-gray-700 dark:text-gray-300 mb-2">${displayContent.substring(0, 200)}${displayContent.length > 200 ? '...' : ''}</p>` : '';
                })()}
                ${notif.replyingTo ? `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400"><strong>Replying to:</strong> ${notif.replyingTo.substring(0, 150)}${notif.replyingTo.length > 150 ? '...' : ''}</div>` : ''}
                ${notif.quotingTo ? `<div class="mb-2 p-2 bg-gray-100 dark:bg-gray-600 rounded text-xs text-gray-600 dark:text-gray-400"><strong>Quoting:</strong> ${notif.quotingTo.substring(0, 150)}${notif.quotingTo.length > 150 ? '...' : ''}</div>` : ''}
                ${notif.url ? `<a href="${notif.url}" class="text-xs text-primary-600 dark:text-primary-400 hover:underline">View on ${notif.platform}</a>` : ''}
            </div>
        `;
    }).join('');
}
