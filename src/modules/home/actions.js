import { displayHomeFeed, updateHashtagFollowButton, renderThreadView, showProfileSkeleton } from './render.js';
import { fetchMastodonHashtag, fetchBlueskyHashtag, fetchMastodonUserFeed, fetchBlueskyUserFeed, fetchMastodonThread, fetchBlueskyThread, fetchMastodonProfile, fetchBlueskyProfile } from './api.js';

let currentReplyPost = null;
let currentReplyMode = 'reply'; // 'reply' or 'quote'

// Helper to get post from correct context
function getPost(index, context) {
    if (context === 'thread') {
        return window.currentThreadPosts && window.currentThreadPosts[index];
    }
    return window.currentFeedPosts && window.currentFeedPosts[index];
}

// --- Interaction Handlers ---

window.handleLike = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    if (post.favourited) {
        // Unlike Logic
        if (!confirm('Unlike this post?')) return;
        window.showToast('Unliking...', 'info', 1000);

        try {
            let response;
            if (post.platform === 'mastodon') {
                response = await fetch(`${post.instance}/api/v1/statuses/${post.id}/unfavourite`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${post.token}` }
                });
            } else if (post.platform === 'bluesky') {
                // For Bluesky unlike, we need the rkey of the 'like' record. 
                // We likely don't have it unless we fetched it or saved it from the like response.
                // This is tricky without storing the 'like' uri.
                // Assuming we stored it in post._likeUri or similar, or we have to fetch it.
                // For now, let's just create a toast saying "Not fully supported yet" for Bluesky unlike if missing URI

                // However, we can fetch profile feed again or just try to find it if we can.
                // Simplified: Just say "Unliking on Bluesky requires refresh" if we can't find it easily.
                // BUT, let's try to do it right if we saved it in handleLike below.

                if (post._likeUri) {
                    const rkey = post._likeUri.split('/').pop();
                    response = await fetch('https://bsky.social/xrpc/com.atproto.repo.deleteRecord', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${post.accessJwt}`
                        },
                        body: JSON.stringify({
                            repo: post.did,
                            collection: 'app.bsky.feed.like',
                            rkey: rkey
                        })
                    });
                } else {
                    // Try to fetch it? Too complex for this snippet. 
                    // Let's just error for now or skip.
                    throw new Error("Cannot unlike without refreshing feed first (Bluesky limitation)");
                }
            }

            if (response && !response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error ${response.status}: ${errorText}`);
            }

            window.showToast('Unliked successfully!', 'success');

            post.favourited = false;
            post._likeUri = null;

            const btn = document.getElementById(`like-btn-${index}-${context}`);
            if (btn) {
                // Reset styles
                btn.classList.remove('text-red-600', 'dark:text-red-400', 'font-medium');
                // We need to remove fill-current from the svg/path inside the icon. 
                // Lucide icons use stroke by default. 'fill-current' fills it.
                // Correct way: The icon is an SVG. We should remove the class that adds fill.
                const icon = btn.querySelector('svg');
                if (icon) icon.classList.remove('fill-current', 'text-red-600');

                // Decrement count
                const countSpan = btn.querySelector('span:last-child');
                if (countSpan && !isNaN(parseInt(countSpan.textContent))) {
                    const validCount = Math.max(0, parseInt(countSpan.textContent) - 1);
                    countSpan.textContent = validCount;
                }

                // Reset text
                const textSpan = btn.querySelector('span:nth-child(2)');
                if (textSpan) textSpan.textContent = 'Like';
            }

        } catch (error) {
            console.error('Unlike failed:', error);
            window.showToast(`Unlike failed: ${error.message}`, 'error');
        }
        return;
    }

    // Like Logic
    window.showToast(`Liking post by @${post.authorHandle}...`, 'info', 2000);

    try {
        let response;
        let likeUri = null;

        if (post.platform === 'mastodon') {
            response = await fetch(`${post.instance}/api/v1/statuses/${post.id}/favourite`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
        } else if (post.platform === 'bluesky') {
            response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.feed.like',
                    record: {
                        subject: {
                            uri: post.id,
                            cid: post.cid
                        },
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 403 || response.status === 401) {
                throw new Error('Permission denied. Please ensure your Mastodon Access Token has "write" scopes (write:favourites).');
            }
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        // For Bluesky, save the URI of the like record so we can undo it
        if (post.platform === 'bluesky') {
            const data = await response.json();
            likeUri = data.uri;
        }

        window.showToast('Liked successfully!', 'success');

        // Optimistically update UI
        post.favourited = true;
        if (likeUri) post._likeUri = likeUri;

        const btn = document.getElementById(`like-btn-${index}-${context}`);
        if (btn) {
            btn.classList.add('text-red-600', 'dark:text-red-400', 'font-medium');

            // Fix: ensure the SVG gets the fill-current class
            const icon = btn.querySelector('svg');
            if (icon) {
                icon.classList.add('fill-current');
            }

            // Increment count
            const countSpan = btn.querySelector('span:last-child');
            if (countSpan && !isNaN(parseInt(countSpan.textContent))) {
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }

            // Update button text
            const textSpan = btn.querySelector('span:nth-child(2)');
            if (textSpan) textSpan.textContent = 'Liked';
        }

    } catch (error) {
        console.error('Like failed:', error);
        window.showToast(`Like failed: ${error.message}`, 'error');
    }
}

window.handleBoost = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    // hide menu if visible
    try { window.hideBoostMenu(index, context); } catch (e) { }

    if (post.reblogged) {
        if (!confirm('Undo Boost/Repost?')) return;

        // Undo logic here similar to Like...
        // For now just basic stub or implementation if needed
        // Mastodon: /unreblog
        // Bluesky: deleteRecord

        try {
            if (post.platform === 'mastodon') {
                await fetch(`${post.instance}/api/v1/statuses/${post.id}/unreblog`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${post.token}` }
                });
            } else {
                // Bluesky undo boost requires storing the boost URI.
                if (post._boostUri) {
                    const rkey = post._boostUri.split('/').pop();
                    await fetch('https://bsky.social/xrpc/com.atproto.repo.deleteRecord', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${post.accessJwt}`
                        },
                        body: JSON.stringify({
                            repo: post.did,
                            collection: 'app.bsky.feed.repost',
                            rkey: rkey
                        })
                    });
                } else {
                    throw new Error("Cannot undo boost without refreshing feed first (Bluesky limitation)");
                }
            }

            window.showToast('Boost removed', 'success');
            post.reblogged = false;
            post._boostUri = null;

            const btn = document.getElementById(`boost-btn-${index}-${context}`);
            if (btn) {
                btn.classList.remove('text-green-600', 'dark:text-green-400', 'font-medium');
                const icon = btn.querySelector('svg');
                if (icon) icon.classList.remove('fill-current');

                const countSpan = btn.querySelector('span:last-child');
                if (countSpan && !isNaN(parseInt(countSpan.textContent))) {
                    countSpan.textContent = Math.max(0, parseInt(countSpan.textContent) - 1);
                }

                const textSpan = btn.querySelector('span:nth-child(2)');
                if (textSpan) textSpan.textContent = 'Boost';
            }
            return; // Done
        } catch (e) {
            window.showToast("Undo boost failed: " + e.message, 'error');
            return;
        }
    }

    if (!confirm(`Boost/Repost this post from @${post.authorHandle}?`)) return;

    window.showToast(`Boosting...`, 'info', 2000);

    try {
        let response;
        let boostUri = null;
        if (post.platform === 'mastodon') {
            response = await fetch(`${post.instance}/api/v1/statuses/${post.id}/reblog`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
        } else if (post.platform === 'bluesky') {
            response = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.feed.repost',
                    record: {
                        subject: {
                            uri: post.id,
                            cid: post.cid
                        },
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            if (response.status === 403 || response.status === 401) {
                throw new Error('Permission denied. Please ensure your Mastodon Access Token has "write" scopes (write:reblogs).');
            }
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }

        if (post.platform === 'bluesky') {
            const data = await response.json();
            boostUri = data.uri;
        }

        window.showToast('Boosted successfully!', 'success');

        // Optimistically update UI
        post.reblogged = true;
        if (boostUri) post._boostUri = boostUri;

        const btn = document.getElementById(`boost-btn-${index}-${context}`);
        if (btn) {
            btn.classList.add('text-green-600', 'dark:text-green-400', 'font-medium');

            const icon = btn.querySelector('svg');
            if (icon) icon.classList.add('fill-current');

            // Increment count if visible
            const countSpan = btn.querySelector('span:last-child');
            if (countSpan && !isNaN(parseInt(countSpan.textContent))) {
                countSpan.textContent = parseInt(countSpan.textContent) + 1;
            }

            const textSpan = btn.querySelector('span:nth-child(2)');
            if (textSpan) textSpan.textContent = 'Boosted';
        }

    } catch (error) {
        console.error('Boost failed:', error);
        window.showToast(`Boost failed: ${error.message}`, 'error');
    }
}

window.toggleBoostMenu = function (index, context = 'feed') {
    // Close other menus first
    document.querySelectorAll('[id^="boost-menu-"]').forEach(el => el.classList.add('hidden'));
    const menu = document.getElementById(`boost-menu-${index}-${context}`);
    if (!menu) return;
    const nowHidden = menu.classList.toggle('hidden');

    // If menu is now visible, install a one-time click-outside handler
    if (!nowHidden) {
        if (!window._boostMenuDocumentHandler) {
            window._boostMenuDocumentHandler = function (e) {
                try {
                    const path = e.composedPath ? e.composedPath() : (function (node) {
                        const p = [];
                        let el = node;
                        while (el) { p.push(el); el = el.parentNode; }
                        return p;
                    })(e.target);

                    const clickedInside = path.some(el => el && el.id && (String(el.id).startsWith('boost-menu-') || String(el.id).startsWith('boost-btn-')));
                    if (!clickedInside) {
                        document.querySelectorAll('[id^="boost-menu-"]').forEach(el => el.classList.add('hidden'));
                        document.removeEventListener('click', window._boostMenuDocumentHandler);
                        window._boostMenuDocumentHandler = null;
                    }
                } catch (err) {
                    document.querySelectorAll('[id^="boost-menu-"]').forEach(el => el.classList.add('hidden'));
                    if (window._boostMenuDocumentHandler) {
                        document.removeEventListener('click', window._boostMenuDocumentHandler);
                        window._boostMenuDocumentHandler = null;
                    }
                }
            };
        }
        document.removeEventListener('click', window._boostMenuDocumentHandler);
        document.addEventListener('click', window._boostMenuDocumentHandler);
    } else {
        if (window._boostMenuDocumentHandler) {
            document.removeEventListener('click', window._boostMenuDocumentHandler);
            window._boostMenuDocumentHandler = null;
        }
    }
}

window.hideBoostMenu = function (index, context = 'feed') {
    const menu = document.getElementById(`boost-menu-${index}-${context}`);
    if (menu) menu.classList.add('hidden');
    if (window._boostMenuDocumentHandler) {
        document.removeEventListener('click', window._boostMenuDocumentHandler);
        window._boostMenuDocumentHandler = null;
    }
}

window.toggleAvatarMenu = function (index, context = 'feed') {
    document.querySelectorAll('[id^="avatar-menu-"]').forEach(el => el.classList.add('hidden'));
    const menu = document.getElementById(`avatar-menu-${index}-${context}`);
    if (!menu) return;
    const nowHidden = menu.classList.toggle('hidden');

    if (!nowHidden) {
        if (window.updateAvatarMenuState) window.updateAvatarMenuState(index, context);

        if (!window._avatarMenuDocumentHandler) {
            window._avatarMenuDocumentHandler = function (e) {
                try {
                    const path = e.composedPath ? e.composedPath() : (function (node) {
                        const p = [];
                        let el = node;
                        while (el) { p.push(el); el = el.parentNode; }
                        return p;
                    })(e.target);

                    const clickedInside = path.some(el => el && el.id && (String(el.id).startsWith('avatar-menu-') || String(el.id).startsWith('avatar-')));
                    if (!clickedInside) {
                        document.querySelectorAll('[id^="avatar-menu-"]').forEach(el => el.classList.add('hidden'));
                        document.removeEventListener('click', window._avatarMenuDocumentHandler);
                        window._avatarMenuDocumentHandler = null;
                    }
                } catch (err) {
                    document.querySelectorAll('[id^="avatar-menu-"]').forEach(el => el.classList.add('hidden'));
                    if (window._avatarMenuDocumentHandler) {
                        document.removeEventListener('click', window._avatarMenuDocumentHandler);
                        window._avatarMenuDocumentHandler = null;
                    }
                }
            };
        }
        document.removeEventListener('click', window._avatarMenuDocumentHandler);
        document.addEventListener('click', window._avatarMenuDocumentHandler);
    } else {
        if (window._avatarMenuDocumentHandler) {
            document.removeEventListener('click', window._avatarMenuDocumentHandler);
            window._avatarMenuDocumentHandler = null;
        }
    }
}

window.handleAvatarClick = function (index, context = 'feed') {
    window.toggleAvatarMenu(index, context);
}

window.hideAvatarMenu = function (index, context = 'feed') {
    const menu = document.getElementById(`avatar-menu-${index}-${context}`);
    if (menu) menu.classList.add('hidden');
    if (window._avatarMenuDocumentHandler) {
        document.removeEventListener('click', window._avatarMenuDocumentHandler);
        window._avatarMenuDocumentHandler = null;
    }
}

window.updateAvatarMenuState = async function (index, context = 'feed') {
    const post = getPost(index, context);
    const menu = document.getElementById(`avatar-menu-${index}-${context}`);
    if (!post || !menu) return;

    const menuList = menu.querySelector('div');
    if (!menuList) return;

    let followBtn = document.getElementById(`follow-btn-item-${index}-${context}`);
    if (!followBtn) {
        followBtn = document.createElement('button');
        followBtn.id = `follow-btn-item-${index}-${context}`;
        followBtn.className = "flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start border-b border-gray-100 dark:border-gray-700 mb-1";
        followBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Checking...</span>';
        menuList.insertBefore(followBtn, menuList.firstChild);
        if (window.lucide && window.lucideIcons) window.lucide.createIcons({ icons: window.lucideIcons });
    }

    try {
        let isFollowing = false;

        if (post.platform === 'mastodon') {
            const inst = post.instance.replace(/\/$/, '');
            const resp = await fetch(`${inst}/api/v1/accounts/relationships?id[]=${post.authorId}`, {
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.length > 0) {
                    isFollowing = data[0].following;
                }
            }
        } else if (post.platform === 'bluesky') {
            const resp = await fetch(`https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${post.authorDid}`, {
                headers: { 'Authorization': `Bearer ${post.accessJwt}` }
            });
            if (resp.ok) {
                const data = await resp.json();
                isFollowing = !!(data.viewer && data.viewer.following);
                post._followUri = data.viewer ? data.viewer.following : null;
            }
        }

        followBtn.onclick = () => {
            window.hideAvatarMenu(index, context);
            if (isFollowing) window.handleUnfollow(index, context);
            else window.handleFollow(index, context);
        };

        const actionText = isFollowing ? 'Unfollow' : 'Follow';
        const actionIcon = isFollowing ? 'user-minus' : 'user-plus';
        const actionClass = isFollowing ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200';

        followBtn.className = `flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start border-b border-gray-100 dark:border-gray-700 mb-1 ${actionClass}`;
        followBtn.innerHTML = `<i data-lucide="${actionIcon}" class="w-4 h-4"></i> <span>${actionText}</span>`;

        if (window.lucide && window.lucideIcons) window.lucide.createIcons({ icons: window.lucideIcons });

    } catch (e) {
        console.warn('Failed to check relationship:', e);
        followBtn.innerHTML = '<span class="text-xs text-red-500">Error checking status</span>';
    }
}

window.handleFollow = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    window.showToast(`Following ${post.authorHandle}...`, 'info');
    try {
        if (post.platform === 'mastodon') {
            const inst = post.instance.replace(/\/$/, '');
            await fetch(`${inst}/api/v1/accounts/${post.authorId}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
        } else if (post.platform === 'bluesky') {
            await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.graph.follow',
                    record: {
                        subject: post.authorDid,
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }
        window.showToast(`Followed ${post.authorHandle}`, 'success');
    } catch (e) {
        window.showToast(`Follow failed: ${e.message}`, 'error');
    }
}

window.handleUnfollow = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    if (!confirm(`Unfollow @${post.authorHandle}?`)) return;

    window.showToast(`Unfollowing ${post.authorHandle}...`, 'info');
    try {
        if (post.platform === 'mastodon') {
            const inst = post.instance.replace(/\/$/, '');
            await fetch(`${inst}/api/v1/accounts/${post.authorId}/unfollow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
        } else if (post.platform === 'bluesky') {
            let followUri = post._followUri;
            if (!followUri) {
                const resp = await fetch(`https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${post.authorDid}`, {
                    headers: { 'Authorization': `Bearer ${post.accessJwt}` }
                });
                const data = await resp.json();
                followUri = data.viewer ? data.viewer.following : null;
            }

            if (!followUri) throw new Error('Could not find follow record to delete.');

            const rkey = followUri.split('/').pop();
            await fetch('https://bsky.social/xrpc/com.atproto.repo.deleteRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.graph.follow',
                    rkey: rkey
                })
            });
        }
        window.showToast(`Unfollowed ${post.authorHandle}`, 'success');
    } catch (e) {
        window.showToast(`Unfollow failed: ${e.message}`, 'error');
    }
}

window.handleMuteFromMenu = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;
    const name = post.authorHandle || post.author || 'user';
    window.showToast(`Muting ${name}...`, 'info', 2000);
    try {
        let response;
        if (post.platform === 'mastodon') {
            if (!post.instance || !post.token || !post.authorId) throw new Error('Missing Mastodon instance/token or author id.');
            const inst = post.instance.replace(/\/$/, '');
            response = await fetch(`${inst}/api/v1/accounts/${post.authorId}/mute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
        } else if (post.platform === 'bluesky') {
            if (!post.accessJwt || !post.authorDid) throw new Error('Missing Bluesky session or author DID.');
            response = await fetch('https://bsky.social/xrpc/app.bsky.graph.muteActor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({ actor: post.authorDid })
            });
        } else {
            throw new Error('Platform does not support native mute via this client.');
        }

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error ${response.status}: ${text}`);
        }

        window.showToast('Muted successfully', 'success');

        try {
            window.currentFeedPosts = (window.currentFeedPosts || []).filter(p => {
                if (p.platform !== post.platform) return true;
                if (post.platform === 'mastodon') return p.authorId !== post.authorId;
                if (post.platform === 'bluesky') return p.authorDid !== post.authorDid;
                return true;
            });
            displayHomeFeed(window.currentFeedPosts || []);
        } catch (e) { }
    } catch (error) {
        console.error('Mute failed:', error);
        window.showToast(`Mute failed: ${error.message}`, 'error');
    }
}

window.handleBlockFromMenu = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    if (!confirm(`Are you sure you want to BLOCK @${post.authorHandle}? You will not see their posts.`)) return;

    window.showToast(`Blocking ${post.authorHandle}...`, 'info');
    try {
        if (post.platform === 'mastodon') {
            const inst = post.instance.replace(/\/$/, '');
            const resp = await fetch(`${inst}/api/v1/accounts/${post.authorId}/block`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${post.token}` }
            });
            if (!resp.ok) throw new Error(await resp.text());

        } else if (post.platform === 'bluesky') {
            await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.graph.block',
                    record: {
                        subject: post.authorDid,
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }

        window.showToast(`Blocked @${post.authorHandle}`, 'success');

        window.currentFeedPosts = window.currentFeedPosts.filter(p => {
            if (p.platform === 'mastodon') return p.authorId !== post.authorId;
            if (p.platform === 'bluesky') return p.authorDid !== post.authorDid;
            return true;
        });
        displayHomeFeed(window.currentFeedPosts);

    } catch (e) {
        window.showToast(`Block failed: ${e.message}`, 'error');
    }
}

// Logic to view thread or reply
window.handleReply = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    // Switch for "Inline" reply in thread view
    if (context === 'thread') {
        const form = document.getElementById(`reply-form-${index}-${context}`);
        if (form) {
            form.classList.toggle('hidden');
            if (!form.classList.contains('hidden')) {
                const ta = document.getElementById(`reply-input-${index}-${context}`);
                if (ta) {
                    if (!ta.value) ta.value = `@${post.authorHandle} `;
                    ta.focus();
                    // Cursor to end
                    const len = ta.value.length;
                    ta.setSelectionRange(len, len);
                }
            }
        }
        return;
    }

    // Default Feed behavior: Open Thread View
    if (context === 'feed') {
        window.showToast('Loading thread...', 'info');
        try {
            let threadPosts = [];
            if (post.platform === 'mastodon') {
                const inst = post.instance.replace(/\/$/, '');
                threadPosts = await fetchMastodonThread(post.id, inst, post.token);
            } else if (post.platform === 'bluesky') {
                const session = { accessJwt: post.accessJwt, did: post.did };
                threadPosts = await fetchBlueskyThread(post.id, session);
            }
            renderThreadView(threadPosts);
        } catch (e) {
            console.error('Thread view failed:', e);
            window.showToast(`Failed to load thread: ${e.message}`, 'error');
            // Fallback to composer
            window.openReplyComposer(post, 'reply');
        }
    }
}

window.handleQuote = function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;
    window.openReplyComposer(post, 'quote');
}

// Re-usable send function (core logic)
async function executeSendReply(post, message, mode) {
    if (mode === 'quote') {
        if (post.platform === 'mastodon') {
            const resp = await fetch(`${post.instance}/api/v1/statuses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${post.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: `${message}${message ? '\n\n' : ''}${post.url}`
                })
            });
            if (!resp.ok) throw new Error(await resp.text());
        } else if (post.platform === 'bluesky') {
            const record = {
                text: `${message}`,
                createdAt: new Date().toISOString()
            };
            if (post.id) {
                record.embed = {
                    $type: 'app.bsky.embed.record',
                    record: {
                        uri: post.id,
                        cid: post.cid
                    }
                };
            }

            const resp = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.feed.post',
                    record: record
                })
            });
            if (!resp.ok) throw new Error(await resp.text());
        }
    } else {
        // Reply
        if (post.platform === 'mastodon') {
            const resp = await fetch(`${post.instance}/api/v1/statuses`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${post.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status: message,
                    in_reply_to_id: post.id
                })
            });
            if (!resp.ok) throw new Error(await resp.text());
        } else if (post.platform === 'bluesky') {
            const root = post.reply ? post.reply.root : { uri: post.id, cid: post.cid };
            const parent = { uri: post.id, cid: post.cid };

            const resp = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${post.accessJwt}`
                },
                body: JSON.stringify({
                    repo: post.did,
                    collection: 'app.bsky.feed.post',
                    record: {
                        text: message,
                        reply: {
                            root: root,
                            parent: parent
                        },
                        createdAt: new Date().toISOString()
                    }
                })
            });
            if (!resp.ok) throw new Error(await resp.text());
        }
    }
}

window.submitInlineReply = async function (index, context) {
    const post = getPost(index, context);
    if (!post) return;

    const ta = document.getElementById(`reply-input-${index}-${context}`);
    const message = ta.value.trim();
    if (!message) return;

    const btn = document.getElementById(`reply-submit-${index}-${context}`);
    const oldHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>';
    if (window.lucide) window.lucide.createIcons({ icons: window.lucideIcons });

    try {
        await executeSendReply(post, message, 'reply');

        ta.value = '';
        document.getElementById(`reply-form-${index}-${context}`).classList.add('hidden');
        window.showToast('Reply sent successfully!', 'success');

    } catch (e) {
        window.showToast(`Failed: ${e.message}`, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = oldHtml;
        }
    }
}

window.openReplyComposer = function (post, mode) {
    currentReplyPost = post;
    currentReplyMode = mode || 'reply';

    const modal = document.getElementById('replyModal');
    const context = document.getElementById('replyContext');
    const textarea = document.getElementById('replyMessage');
    const charCount = document.getElementById('replyCharCount');

    let previewText = post.content || '';
    if (previewText.includes('<')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = previewText;
        previewText = tempDiv.textContent || tempDiv.innerText || '';
    }

    const actionText = mode === 'quote' ? 'Quoting' : 'Replying to';
    context.innerHTML = `<strong>${actionText} @${post.authorHandle}:</strong><br>${previewText.substring(0, 150)}${previewText.length > 150 ? '...' : ''}`;

    if (mode === 'reply') {
        textarea.value = `@${post.authorHandle} `;
    } else {
        textarea.value = '';
    }

    charCount.textContent = `${textarea.value.length} characters`;

    modal.classList.remove('hidden');
    textarea.focus();

    textarea.oninput = () => {
        charCount.textContent = `${textarea.value.length} characters`;
    };
}

window.closeReplyModal = function () {
    document.getElementById('replyModal').classList.add('hidden');
    currentReplyPost = null;
    currentReplyMode = 'reply';
}

window.sendReply = async function () {
    if (!currentReplyPost) return;

    const mode = currentReplyMode || 'reply';
    const message = document.getElementById('replyMessage').value.trim();
    if (mode === 'reply' && !message) {
        window.showToast('Please enter a reply message', 'error');
        return;
    }

    const btn = document.getElementById('sendReplyBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Sending...';
    if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
        lucide.createIcons({ icons: window.lucideIcons });
    }

    try {
        await executeSendReply(currentReplyPost, message, mode);

        window.showToast('Reply sent successfully!', 'success');
        window.closeReplyModal();

    } catch (error) {
        console.error('Reply failed:', error);
        window.showToast(`Reply failed: ${error.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
        if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
            lucide.createIcons({ icons: window.lucideIcons });
        }
    }
}

async function checkMastodonTagStatus(tag, instance, token, btn) {
    try {
        let cleanInstance = instance.trim();
        if (!cleanInstance.startsWith('http')) cleanInstance = 'https://' + cleanInstance;
        cleanInstance = cleanInstance.replace(/\/$/, '');

        const cleanTag = tag.replace(/^#/, '');

        const response = await fetch(`${cleanInstance}/api/v1/tags/${encodeURIComponent(cleanTag)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            const isFollowing = data.following;
            updateHashtagFollowButton(btn, isFollowing);
        }
    } catch (e) {
        console.warn('Failed to check tag status', e);
    }
}

window.handleHashtagClick = async function (tag, platform) {
    const feedList = document.getElementById('homeFeedList');

    // Show back button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
        backBtn.style.display = 'flex';
        if (window.lucide && window.lucideIcons) {
            window.lucide.createIcons({ icons: window.lucideIcons });
        }
    }

    // Show skeleton loaders
    const { showSkeletonLoaders } = await import('./render.js');
    showSkeletonLoaders(5);

    // Jump to top AFTER skeleton loaders are inserted
    window.scrollTo(0, 0);

    try {
        const posts = [];
        const promises = [];

        const mastodonInstance = document.getElementById('mastodon-instance').value;
        const mastodonToken = document.getElementById('mastodon-token').value;

        if (mastodonInstance && mastodonToken) {
            promises.push(fetchMastodonHashtag(tag, mastodonInstance, mastodonToken)
                .then(p => posts.push(...p))
                .catch(e => console.warn('Mastodon tag fetch error', e)));
        }

        const blueskyHandle = document.getElementById('bluesky-handle').value;
        const blueskyPassword = document.getElementById('bluesky-password').value;

        if (blueskyHandle && blueskyPassword) {
            const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: blueskyHandle, password: blueskyPassword })
            });
            if (sessionResponse.ok) {
                const session = await sessionResponse.json();
                promises.push(fetchBlueskyHashtag(tag, session)
                    .then(p => posts.push(...p))
                    .catch(e => console.warn('Bluesky tag fetch error', e)));
            }
        }

        await Promise.all(promises);
        displayHomeFeed(posts);

        window.showStatus(`Showing results for #${tag}`, 'success');

        const headerTitle = document.querySelector('#homeContent h2');
        const headerSubtitle = document.querySelector('#homeContent p.text-gray-500');

        if (headerTitle) {
            headerTitle.textContent = `#${tag}`;
            headerTitle.className = "text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2";
        }
        if (headerSubtitle) headerSubtitle.textContent = `Posts tagged with #${tag}`;

        const mInstance = document.getElementById('mastodon-instance').value;
        const mToken = document.getElementById('mastodon-token').value;

        if (mInstance && mToken && headerTitle) {
            let followBtn = document.getElementById('followHashtagBtn');
            if (!followBtn) {
                followBtn = document.createElement('button');
                followBtn.id = 'followHashtagBtn';
                followBtn.className = "ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-md transition-colors border border-blue-200 dark:border-blue-800";
                headerTitle.appendChild(followBtn);
            }

            checkMastodonTagStatus(tag, mInstance, mToken, followBtn);

            followBtn.onclick = (e) => {
                e.stopPropagation();
                window.handleToggleHashtagFollow(tag);
            };
            followBtn.style.display = 'inline-flex';

            if (window.lucide && window.lucideIcons) window.lucide.createIcons({ icons: window.lucideIcons });
        }

    } catch (e) {
        window.showStatus(`Error loading hashtag: ${e.message}`, 'error');
        feedList.innerHTML = `<div class="text-center text-red-500 p-10">Error: ${e.message}</div>`;
    }
}

window.handleToggleHashtagFollow = async function (tag) {
    if (!tag) return;
    const mastodonInstance = document.getElementById('mastodon-instance').value;
    const mastodonToken = document.getElementById('mastodon-token').value;
    const btn = document.getElementById('followHashtagBtn');

    if (!mastodonInstance || !mastodonToken) {
        window.showToast('Mastodon credentials required to manage hashtags', 'error');
        return;
    }

    const isFollowing = btn && btn.dataset.following === 'true';
    const action = isFollowing ? 'unfollow' : 'follow';
    const cleanTag = tag.replace(/^#/, '');

    window.showToast(`${isFollowing ? 'Unfollowing' : 'Following'} #${cleanTag}...`, 'info');
    if (btn) btn.disabled = true;

    try {
        let cleanInstance = mastodonInstance.trim();
        if (!cleanInstance.startsWith('http')) cleanInstance = 'https://' + cleanInstance;
        cleanInstance = cleanInstance.replace(/\/$/, '');

        const response = await fetch(`${cleanInstance}/api/v1/tags/${encodeURIComponent(cleanTag)}/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mastodonToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            if (response.status === 403) {
                throw new Error(`Permission denied. You likely need the "write:follows" scope on your token. Details: ${errText}`);
            }
            throw new Error(`${response.status} ${response.statusText}${errText ? ': ' + errText : ''}`);
        }

        window.showToast(`${isFollowing ? 'Unfollowed' : 'Followed'} #${cleanTag}!`, 'success');
        updateHashtagFollowButton(btn, !isFollowing);

    } catch (e) {
        console.error('Toggle tag follow error:', e);
        window.showToast(`Action failed: ${e.message}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

window.handleProfileClick = async function (index, context = 'feed') {
    const post = getPost(index, context);
    if (!post) return;

    if (context === 'thread') {
        document.getElementById('threadModal').classList.add('hidden');
    }

    const feedList = document.getElementById('homeFeedList');
    const homeContent = document.getElementById('homeContent');
    const name = post.author || post.authorHandle;

    // Show back button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) {
        backBtn.style.display = 'flex';
        if (window.lucide && window.lucideIcons) {
            window.lucide.createIcons({ icons: window.lucideIcons });
        }
    }

    // Show profile skeleton loader
    showProfileSkeleton();

    // Jump to top AFTER skeleton loader is inserted
    window.scrollTo(0, 0);

    try {
        let posts = [];
        let profile = null;

        if (post.platform === 'mastodon') {
            const inst = post.instance.replace(/\/$/, '');
            
            // Try to fetch profile, but don't fail if it errors
            try {
                profile = await fetchMastodonProfile(post.authorId, inst, post.token);
            } catch (profileError) {
                console.warn('Failed to fetch Mastodon profile:', profileError);
                window.showToast('Profile info unavailable, showing posts only', 'info', 2000);
            }
            
            posts = await fetchMastodonUserFeed(post.authorId, inst, post.token);

        } else if (post.platform === 'bluesky') {
            const session = { accessJwt: post.accessJwt, did: post.did };
            
            // Try to fetch profile, but don't fail if it errors
            try {
                profile = await fetchBlueskyProfile(post.authorDid, session);
            } catch (profileError) {
                console.warn('Failed to fetch Bluesky profile:', profileError);
                window.showToast('Profile info unavailable, showing posts only', 'info', 2000);
            }
            
            posts = await fetchBlueskyUserFeed(post.authorDid, session);
        }

        // Display profile header if we got it
        if (profile) {
            displayProfileHeader(profile, post.platform);
        }

        displayHomeFeed(posts);
        window.showStatus(`Showing profile: ${name}`, 'success');

    } catch (e) {
        console.error('Profile view error:', e);
        window.showStatus(`Error loading profile: ${e.message}`, 'error');
        feedList.innerHTML = `<div class="text-center text-red-500 p-10">Error: ${e.message}</div>`;
    }
}

function displayProfileHeader(profile, platform) {
    const homeContent = document.getElementById('homeContent');
    const feedList = document.getElementById('homeFeedList');
    
    // Remove existing profile header (including skeleton)
    const existingHeader = document.getElementById('profileHeader');
    if (existingHeader) existingHeader.remove();
    
    let displayName, handle, bio, avatar, banner, followersCount, followingCount, postsCount, url;
    
    if (platform === 'mastodon') {
        displayName = profile.display_name || profile.username;
        handle = profile.acct;
        bio = profile.note; // HTML
        avatar = profile.avatar;
        banner = profile.header;
        followersCount = profile.followers_count;
        followingCount = profile.following_count;
        postsCount = profile.statuses_count;
        url = profile.url;
    } else if (platform === 'bluesky') {
        displayName = profile.displayName || profile.handle;
        handle = profile.handle;
        bio = profile.description; // Plain text
        avatar = profile.avatar;
        banner = profile.banner;
        followersCount = profile.followersCount;
        followingCount = profile.followsCount;
        postsCount = profile.postsCount;
        url = `https://bsky.app/profile/${profile.did}`;
    }
    
    // Create profile header HTML
    const headerHtml = `
        <div id="profileHeader" class="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            ${banner ? `<div class="h-32 bg-cover bg-center" style="background-image: url('${banner}')"></div>` : '<div class="h-32 bg-gradient-to-r from-blue-400 to-purple-500"></div>'}
            
            <div class="p-6 -mt-16 relative">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-4">
                        ${avatar ? 
                            `<img src="${avatar}" alt="${displayName}" class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800">` :
                            `<div class="w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-3xl">${displayName ? displayName.charAt(0).toUpperCase() : '?'}</div>`
                        }
                        <div class="mt-12">
                            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">${displayName || handle}</h2>
                            <p class="text-gray-500 dark:text-gray-400">@${handle}</p>
                        </div>
                    </div>
                    
                    <div class="mt-12 flex gap-2">
                        <button id="profileFollowBtn" class="px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium">
                            <i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i>
                            <span>Loading...</span>
                        </button>
                        <button id="profileMuteBtn" class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2">
                            <i data-lucide="message-circle-x" class="w-4 h-4"></i>
                            <span>Mute</span>
                        </button>
                        <button id="profileBlockBtn" class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2">
                            <i data-lucide="ban" class="w-4 h-4"></i>
                            <span>Block</span>
                        </button>
                        <a href="${url}" target="_blank" class="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors flex items-center gap-2">
                            <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                    </div>
                </div>
                
                ${bio ? `<div class="mt-4 text-gray-700 dark:text-gray-300 text-sm leading-relaxed max-w-2xl">${bio}</div>` : ''}
                
                <div class="mt-4 flex gap-6 text-sm">
                    <div class="flex items-center gap-1">
                        <span class="font-bold text-gray-900 dark:text-white">${postsCount.toLocaleString()}</span>
                        <span class="text-gray-500 dark:text-gray-400">Posts</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="font-bold text-gray-900 dark:text-white">${followingCount.toLocaleString()}</span>
                        <span class="text-gray-500 dark:text-gray-400">Following</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <span class="font-bold text-gray-900 dark:text-white">${followersCount.toLocaleString()}</span>
                        <span class="text-gray-500 dark:text-gray-400">Followers</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    feedList.insertAdjacentHTML('beforebegin', headerHtml);
    
    if (window.lucide && window.lucideIcons) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }
    
    // Store profile data for button handlers
    window._currentProfileData = {
        platform,
        profile,
        authorId: platform === 'mastodon' ? profile.id : null,
        authorDid: platform === 'bluesky' ? profile.did : null,
        handle: handle
    };
    
    // Setup button handlers and check follow status
    setupProfileButtons(profile, platform);
}

async function setupProfileButtons(profile, platform) {
    const followBtn = document.getElementById('profileFollowBtn');
    const muteBtn = document.getElementById('profileMuteBtn');
    const blockBtn = document.getElementById('profileBlockBtn');
    
    if (!followBtn) return;
    
    try {
        let isFollowing = false;
        let followUri = null;
        
        // Check follow status
        if (platform === 'mastodon') {
            const inst = document.getElementById('mastodon-instance').value.replace(/\/$/, '');
            const token = document.getElementById('mastodon-token').value;
            
            const resp = await fetch(`${inst}/api/v1/accounts/relationships?id[]=${profile.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.length > 0) {
                    isFollowing = data[0].following;
                }
            }
        } else if (platform === 'bluesky') {
            isFollowing = !!(profile.viewer && profile.viewer.following);
            followUri = profile.viewer ? profile.viewer.following : null;
        }
        
        // Update follow button
        if (isFollowing) {
            followBtn.className = 'px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center gap-2 font-medium';
            followBtn.innerHTML = '<i data-lucide="user-minus" class="w-4 h-4"></i><span>Unfollow</span>';
        } else {
            followBtn.className = 'px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium';
            followBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i><span>Follow</span>';
        }
        
        if (window.lucide && window.lucideIcons) {
            window.lucide.createIcons({ icons: window.lucideIcons });
        }
        
        // Button click handlers
        followBtn.onclick = async () => {
            if (isFollowing) {
                await handleProfileUnfollow();
            } else {
                await handleProfileFollow();
            }
        };
        
        muteBtn.onclick = async () => {
            await handleProfileMute();
        };
        
        blockBtn.onclick = async () => {
            await handleProfileBlock();
        };
        
    } catch (e) {
        console.error('Failed to setup profile buttons:', e);
        followBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i><span>Follow</span>';
        if (window.lucide && window.lucideIcons) {
            window.lucide.createIcons({ icons: window.lucideIcons });
        }
    }
}

async function handleProfileFollow() {
    const data = window._currentProfileData;
    if (!data) return;
    
    window.showToast(`Following @${data.handle}...`, 'info');
    
    try {
        if (data.platform === 'mastodon') {
            const inst = document.getElementById('mastodon-instance').value.replace(/\/$/, '');
            const token = document.getElementById('mastodon-token').value;
            
            await fetch(`${inst}/api/v1/accounts/${data.authorId}/follow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else if (data.platform === 'bluesky') {
            const handle = document.getElementById('bluesky-handle').value;
            const password = document.getElementById('bluesky-password').value;
            
            const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: handle, password: password })
            });
            const session = await sessionResp.json();
            
            await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessJwt}`
                },
                body: JSON.stringify({
                    repo: session.did,
                    collection: 'app.bsky.graph.follow',
                    record: {
                        subject: data.authorDid,
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }
        
        window.showToast(`Followed @${data.handle}!`, 'success');
        
        // Update button
        const followBtn = document.getElementById('profileFollowBtn');
        if (followBtn) {
            followBtn.className = 'px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors flex items-center gap-2 font-medium';
            followBtn.innerHTML = '<i data-lucide="user-minus" class="w-4 h-4"></i><span>Unfollow</span>';
            followBtn.onclick = handleProfileUnfollow;
            if (window.lucide && window.lucideIcons) {
                window.lucide.createIcons({ icons: window.lucideIcons });
            }
        }
    } catch (e) {
        console.error('Follow failed:', e);
        window.showToast(`Follow failed: ${e.message}`, 'error');
    }
}

async function handleProfileUnfollow() {
    const data = window._currentProfileData;
    if (!data) return;
    
    if (!confirm(`Unfollow @${data.handle}?`)) return;
    
    window.showToast(`Unfollowing @${data.handle}...`, 'info');
    
    try {
        if (data.platform === 'mastodon') {
            const inst = document.getElementById('mastodon-instance').value.replace(/\/$/, '');
            const token = document.getElementById('mastodon-token').value;
            
            await fetch(`${inst}/api/v1/accounts/${data.authorId}/unfollow`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else if (data.platform === 'bluesky') {
            const handle = document.getElementById('bluesky-handle').value;
            const password = document.getElementById('bluesky-password').value;
            
            const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: handle, password: password })
            });
            const session = await sessionResp.json();
            
            // Get profile to find follow URI
            const profileResp = await fetch(`https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${data.authorDid}`, {
                headers: { 'Authorization': `Bearer ${session.accessJwt}` }
            });
            const profileData = await profileResp.json();
            const followUri = profileData.viewer?.following;
            
            if (!followUri) throw new Error('Could not find follow record');
            
            const rkey = followUri.split('/').pop();
            await fetch('https://bsky.social/xrpc/com.atproto.repo.deleteRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessJwt}`
                },
                body: JSON.stringify({
                    repo: session.did,
                    collection: 'app.bsky.graph.follow',
                    rkey: rkey
                })
            });
        }
        
        window.showToast(`Unfollowed @${data.handle}`, 'success');
        
        // Update button
        const followBtn = document.getElementById('profileFollowBtn');
        if (followBtn) {
            followBtn.className = 'px-4 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium';
            followBtn.innerHTML = '<i data-lucide="user-plus" class="w-4 h-4"></i><span>Follow</span>';
            followBtn.onclick = handleProfileFollow;
            if (window.lucide && window.lucideIcons) {
                window.lucide.createIcons({ icons: window.lucideIcons });
            }
        }
    } catch (e) {
        console.error('Unfollow failed:', e);
        window.showToast(`Unfollow failed: ${e.message}`, 'error');
    }
}

async function handleProfileMute() {
    const data = window._currentProfileData;
    if (!data) return;
    
    if (!confirm(`Mute @${data.handle}? You won't see their posts anymore.`)) return;
    
    window.showToast(`Muting @${data.handle}...`, 'info');
    
    try {
        if (data.platform === 'mastodon') {
            const inst = document.getElementById('mastodon-instance').value.replace(/\/$/, '');
            const token = document.getElementById('mastodon-token').value;
            
            await fetch(`${inst}/api/v1/accounts/${data.authorId}/mute`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else if (data.platform === 'bluesky') {
            const handle = document.getElementById('bluesky-handle').value;
            const password = document.getElementById('bluesky-password').value;
            
            const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: handle, password: password })
            });
            const session = await sessionResp.json();
            
            await fetch('https://bsky.social/xrpc/app.bsky.graph.muteActor', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessJwt}`
                },
                body: JSON.stringify({ actor: data.authorDid })
            });
        }
        
        window.showToast(`Muted @${data.handle}`, 'success');
        
        // Optionally go back to home feed
        setTimeout(() => {
            if (window.loadHomeFeed) window.loadHomeFeed();
        }, 1000);
        
    } catch (e) {
        console.error('Mute failed:', e);
        window.showToast(`Mute failed: ${e.message}`, 'error');
    }
}

async function handleProfileBlock() {
    const data = window._currentProfileData;
    if (!data) return;
    
    if (!confirm(`Block @${data.handle}? You will not see their posts and they won't be able to follow you.`)) return;
    
    window.showToast(`Blocking @${data.handle}...`, 'info');
    
    try {
        if (data.platform === 'mastodon') {
            const inst = document.getElementById('mastodon-instance').value.replace(/\/$/, '');
            const token = document.getElementById('mastodon-token').value;
            
            await fetch(`${inst}/api/v1/accounts/${data.authorId}/block`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } else if (data.platform === 'bluesky') {
            const handle = document.getElementById('bluesky-handle').value;
            const password = document.getElementById('bluesky-password').value;
            
            const sessionResp = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: handle, password: password })
            });
            const session = await sessionResp.json();
            
            await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.accessJwt}`
                },
                body: JSON.stringify({
                    repo: session.did,
                    collection: 'app.bsky.graph.block',
                    record: {
                        subject: data.authorDid,
                        createdAt: new Date().toISOString()
                    }
                })
            });
        }
        
        window.showToast(`Blocked @${data.handle}`, 'success');
        
        // Go back to home feed
        setTimeout(() => {
            if (window.loadHomeFeed) window.loadHomeFeed();
        }, 1000);
        
    } catch (e) {
        console.error('Block failed:', e);
        window.showToast(`Block failed: ${e.message}`, 'error');
    }
}

window.backToHomeFeed = function () {
    // Hide back button
    const backBtn = document.getElementById('backToHomeBtn');
    if (backBtn) backBtn.style.display = 'none';
    
    // Remove profile header if exists
    const profileHeader = document.getElementById('profileHeader');
    if (profileHeader) profileHeader.remove();
    
    // Clear follow hashtag button if exists
    const followBtn = document.getElementById('followHashtagBtn');
    if (followBtn) followBtn.remove();
    
    // Reset header
    const headerTitle = document.querySelector('#homeContent h2');
    const headerSubtitle = document.querySelector('#homeContent p.text-gray-500');
    if (headerTitle) {
        headerTitle.textContent = 'Home Feed';
        headerTitle.className = "text-xl font-bold text-gray-800 dark:text-gray-100";
    }
    if (headerSubtitle) headerSubtitle.textContent = 'Updates from people you follow';
    
    // Reload home feed
    if (window.loadHomeFeed) {
        window.loadHomeFeed();
    }
};

window.addHomeLangExclude = async function (lang) {
    try {
        if (!lang) return;
        const pretty = String(lang);
        if (!confirm(`Do you want to filter out this language (${pretty}) from your Home feed?`)) return;

        const input = document.getElementById('home-language-preferences');
        if (!input) {
            window.showToast && window.showToast('Settings input not found', 'error');
            return;
        }

        const parts = (input.value || '').split(',').map(s => s.trim()).filter(Boolean).map(s => s.split('-')[0].toLowerCase());
        const key = String(lang).split('-')[0].toLowerCase();
        if (parts.includes(key)) {
            window.showToast && window.showToast(`${lang} is already excluded`, 'info');
            return;
        }

        parts.push(key);
        input.value = parts.join(',');

        if (window.saveCredentials) {
            try { await window.saveCredentials(); } catch (e) { console.warn('Failed to save settings:', e); }
        }

        if (window.loadHomeFeed) {
            try { await window.loadHomeFeed(true); } catch (e) { /* ignore */ }
        }

        window.showToast && window.showToast(`Added ${lang} to language exclude list`, 'success');
    } catch (e) {
        console.error('addHomeLangExclude failed:', e);
        window.showToast && window.showToast('Failed to update language preferences', 'error');
    }
}
