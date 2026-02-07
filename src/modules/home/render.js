import { getPlatformIcons } from '../icons.js';

// Show skeleton loaders
export function showSkeletonLoaders(count = 5) {
    const feedList = document.getElementById('homeFeedList');
    const noPosts = document.getElementById('homeNoPosts');
    
    if (noPosts) noPosts.style.display = 'none';
    
    const skeletonHtml = Array(count).fill(0).map(() => `
        <div class="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm mb-4 animate-pulse">
            <div class="flex items-start gap-3 mb-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                <div class="flex-1">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
            <div class="space-y-2">
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
            </div>
            <div class="flex gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
            </div>
        </div>
    `).join('');
    
    feedList.innerHTML = skeletonHtml;
}

// Show profile skeleton loader
export function showProfileSkeleton() {
    const feedList = document.getElementById('homeFeedList');
    const noPosts = document.getElementById('homeNoPosts');
    
    if (noPosts) noPosts.style.display = 'none';
    
    // Remove any existing profile header
    const existingHeader = document.getElementById('profileHeader');
    if (existingHeader) existingHeader.remove();
    
    const profileSkeletonHtml = `
        <div id="profileHeader" class="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
            <div class="h-32 bg-gray-200 dark:bg-gray-700"></div>
            
            <div class="p-6 -mt-16 relative">
                <div class="flex items-start justify-between">
                    <div class="flex items-start gap-4">
                        <div class="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600 border-4 border-white dark:border-gray-800"></div>
                        <div class="mt-12 space-y-2">
                            <div class="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                        </div>
                    </div>
                    
                    <div class="mt-12 h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>
                
                <div class="mt-4 space-y-2">
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full max-w-2xl"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 max-w-2xl"></div>
                    <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 max-w-2xl"></div>
                </div>
                
                <div class="mt-4 flex gap-6">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                </div>
            </div>
        </div>
    `;
    
    feedList.insertAdjacentHTML('beforebegin', profileSkeletonHtml);
    
    // Show post skeletons below
    showSkeletonLoaders(3);
}

// Sanitize posts for debug output
export function sanitizePostForDebug(post) {
    try {
        return JSON.parse(JSON.stringify(post, function (k, v) {
            if (!k) return v;
            if (k === 'accessJwt' || k === 'token' || k === 'did') return '[REDACTED]';
            return v;
        }));
    } catch (e) {
        const clone = Object.assign({}, post);
        if ('accessJwt' in clone) clone.accessJwt = '[REDACTED]';
        if ('token' in clone) clone.token = '[REDACTED]';
        if ('did' in clone) clone.did = '[REDACTED]';
        return clone;
    }
}

export function updateHashtagFollowButton(btn, isFollowing) {
    if (!btn) return;
    btn.dataset.following = isFollowing;

    // Remove all generic color classes first
    btn.classList.remove(
        'bg-green-50', 'text-green-600', 'border-green-200', 'dark:bg-green-900/30', 'dark:text-green-400', 'dark:border-green-800',
        'bg-blue-50', 'text-blue-600', 'border-blue-200', 'dark:bg-blue-900/30', 'dark:text-blue-400', 'dark:border-blue-800'
    );

    if (isFollowing) {
        btn.innerHTML = '<i data-lucide="check" class="w-3 h-3"></i> Following';
        btn.classList.add('bg-green-50', 'text-green-600', 'border-green-200', 'dark:bg-green-900/30', 'dark:text-green-400', 'dark:border-green-800');
    } else {
        btn.innerHTML = '<i data-lucide="plus" class="w-3 h-3"></i> Follow';
        btn.classList.add('bg-blue-50', 'text-blue-600', 'border-blue-200', 'dark:bg-blue-900/30', 'dark:text-blue-400', 'dark:border-blue-800');
    }
    if (window.lucide && window.lucideIcons) window.lucide.createIcons({ icons: window.lucideIcons });
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderWithFacets(rawText, facets) {
    if (!facets || !Array.isArray(facets) || facets.length === 0) {
        // simple linkify fallback
        const linked = escapeHtml(rawText).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="text-blue-500 hover:underline">$1</a>');
        return linked.replace(/\n/g, '<br>');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const bytes = encoder.encode(rawText);
    const sorted = [...facets].sort((a, b) => a.index.byteStart - b.index.byteStart);

    let out = '';
    let cursor = 0;
    for (const f of sorted) {
        const start = f.index.byteStart;
        const end = f.index.byteEnd;
        const prefix = decoder.decode(bytes.slice(cursor, start));
        out += escapeHtml(prefix);

        const middle = decoder.decode(bytes.slice(start, end));

        const feature = (f.features && f.features[0]) || null;
        if (feature) {
            if (feature.$type === 'app.bsky.richtext.facet#link' && feature.uri) {
                const href = escapeHtml(feature.uri);
                if (href.includes('/hashtag/')) {
                    const tagMatch = href.split('/hashtag/')[1];
                    if (tagMatch) {
                        const decodedTag = decodeURIComponent(tagMatch);
                        out += `<a href="#" onclick="event.preventDefault(); window.handleHashtagClick('${decodedTag.replace(/'/g, "\\'")}', 'bluesky'); return false;" class="text-blue-500 hover:underline">#${escapeHtml(middle.replace(/^#/, ''))}</a>`;
                    } else {
                        out += `<a href="${href}" target="_blank" class="text-blue-500 hover:underline">${escapeHtml(middle)}</a>`;
                    }
                } else {
                    out += `<a href="${href}" target="_blank" class="text-blue-500 hover:underline">${escapeHtml(middle)}</a>`;
                }
            } else if (feature.$type === 'app.bsky.richtext.facet#tag' && feature.tag) {
                out += `<a href="#" onclick="event.preventDefault(); window.handleHashtagClick('${feature.tag.replace(/'/g, "\\'")}', 'bluesky'); return false;" class="text-blue-500 hover:underline">#${escapeHtml(feature.tag)}</a>`;
            } else if (feature.$type === 'app.bsky.richtext.facet#mention' && feature.did) {
                out += `<a href="https://bsky.app/profile/${feature.did}" target="_blank" class="text-blue-500 hover:underline">${escapeHtml(middle)}</a>`;
            } else {
                out += escapeHtml(middle);
            }
        } else {
            out += escapeHtml(middle);
        }
        cursor = end;
    }
    if (cursor < bytes.length) out += escapeHtml(decoder.decode(bytes.slice(cursor)));
    return out.replace(/\n/g, '<br>');
}

// Reusable Post Renderer
export function createPostHtml(post, index, context = 'feed', platformIcons = {}) {
    const date = new Date(post.timestamp);
    const timeString = date.toLocaleString();
    const isThreadPost = context === 'thread';
    const isFocused = post.isFocused; // For thread view

    let langBadge = '';
    if (post.platform === 'mastodon' && post.language) {
        const langRaw = String(post.language);
        const langLabel = langRaw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const langArg = langRaw.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        // Note: keeping window calls global, but they might need context if they interact with post lists. 
        // addHomeLangExclude typically works on stored preferences, so it's fine.
        langBadge = '<button type="button" onclick="(event&&event.stopPropagation&&event.stopPropagation(),event&&event.preventDefault&&event.preventDefault(),window.addHomeLangExclude(\'' + langArg + '\'))" class="ml-2 inline-flex items-center text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full hover:opacity-90">' + langLabel + '</button>';
    }

    let contextHeader = '';
    if (post.boostedBy) {
        contextHeader += `
            <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                <i data-lucide="repeat-2" class="w-3 h-3"></i> ${post.boostedBy} boosted
                ${post.platform === 'mastodon' && post.boostedByHandle ? `<span class="opacity-75">(@${post.boostedByHandle})</span>` : ''}
            </div>`;
    }
    // Only show "Replying to" in feed view, or if it's the top of a thread
    if (post.replyTo && !isThreadPost) {
        contextHeader += `
            <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                <i data-lucide="message-circle" class="w-3 h-3"></i> Replying to ${post.replyTo !== 'User' ? '@' + post.replyTo : 'thread'}
            </div>`;
    }

    let contentHtml = '';
    if (post.platform === 'bluesky') {
        const text = post.content || '';
        contentHtml = renderWithFacets(text, post.facets);

        const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        if ((!contentHtml || stripTags(contentHtml) === '') && post.embed) {
            const eb = post.embed;
            if (eb && eb.external && String(eb.$type || '').startsWith('app.bsky.embed.external')) {
                const uri = eb.external.uri || '';
                const title = eb.external.title || uri || 'External Link';
                const description = eb.external.description || '';
                const thumb = eb.external.thumb || null;

                const descHtml = description ? escapeHtml(description) : '';
                const overlayHtml = (title || descHtml) ? `
                    <div class="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                        <div class="p-2 text-xs text-white backdrop-blur-sm">
                            ${title ? `<div class="font-medium text-sm">${escapeHtml(title)}</div>` : ''}
                            ${descHtml ? `<div class="mt-1 text-xs opacity-90">${escapeHtml(descHtml)}</div>` : ''}
                        </div>
                    </div>` : '';

                const thumbBlock = thumb ? `
                    <div class="mt-2">
                        <div class="group inline-block relative">
                            <div class="w-40 h-40 md:w-48 md:h-48 rounded-md overflow-hidden cursor-pointer" onclick="window.open('${escapeHtml(uri)}','_blank')">
                                <img src="${escapeHtml(thumb)}" alt="${descHtml ? escapeHtml(descHtml) : ''}" class="w-full h-full object-cover">
                                ${overlayHtml}
                            </div>
                        </div>
                    </div>` : '';

                contentHtml = `<div class="p-2 rounded-md bg-gray-50 dark:bg-gray-900 inline-block">
                    ${thumbBlock}
                </div>`;

            } else if (String(eb.$type || '') === 'app.bsky.embed.images' || String(eb.$type || '').startsWith('app.bsky.embed.images')) {
                contentHtml = '<span class="text-gray-400 italic">Image post</span>';
            }
        }
    } else {
        // Mastodon content is safe HTML from API
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(post.content, 'text/html');
            const tags = doc.querySelectorAll('a[rel~="tag"], a.hashtag, a.mention.hashtag');
            let changed = false;

            tags.forEach(a => {
                const href = a.getAttribute('href');
                if (!href) return;
                const parts = href.split('/tags/');
                if (parts.length > 1) {
                    const tag = parts[1].replace(/\/$/, '');
                    a.setAttribute('href', '#');
                    a.setAttribute('onclick', `event.preventDefault(); window.handleHashtagClick('${tag.replace(/'/g, "\\'")}', 'mastodon'); return false;`);
                    a.classList.add('text-blue-500', 'hover:underline');
                    a.removeAttribute('target');
                    changed = true;
                }
            });

            contentHtml = changed ? doc.body.innerHTML : post.content;
        } catch (e) {
            console.warn('Error rewriting Mastodon tags', e);
            contentHtml = post.content;
        }
    }

    if (!contentHtml) contentHtml = '<span class="text-gray-400 italic">No text content</span>';

    let mediaHtml = '';
    if (post.media && post.media.length > 0) {
        mediaHtml = `<div class="mt-3 grid grid-cols-2 gap-2">
            ${post.media.map(m => {
            if (m.type === 'image' || m.preview_url) {
                const url = m.url || m.preview_url;
                return `<div class="relative group">
                        <img src="${m.preview_url || m.url}" class="rounded-lg w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity" onclick="window.open('${url}', '_blank')">
                    </div>`;
            }
            return '';
        }).join('')}
        </div>`;
    }

    let embeddedHtml = '';
    if (post.embed && String(post.embed.$type || '').startsWith('app.bsky.embed.record')) {
        let er = post.embeddedRecord || null;
        if (er && er.value) er = er.value;
        if (er) {
            const erText = er.text || '';
            const erAuthor = (er.author && (er.author.displayName || er.author.handle)) || '';
            const erHandle = er.author?.handle || '';

            let erUrl = '';
            if (post.embed && post.embed.record && post.embed.record.uri) {
                const uriParts = post.embed.record.uri.split('/');
                const quotedDid = uriParts[2];
                const quotedPostId = uriParts[uriParts.length - 1];
                erUrl = `https://bsky.app/profile/${quotedDid}/post/${quotedPostId}`;
            } else if (er.uri) {
                erUrl = er.uri;
            }

            embeddedHtml = `<div class="mt-3 p-3 border border-gray-100 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-sm">
                ${erAuthor ? `<div class="font-medium text-gray-900 dark:text-white">${escapeHtml(erAuthor)}</div>` : ''}
                ${erHandle ? `<div class="text-xs text-gray-500 dark:text-gray-400">@${escapeHtml(erHandle)}</div>` : ''}
                ${erText ? `<div class="mt-2 text-sm text-gray-800 dark:text-gray-200">${escapeHtml(erText)}</div>` : ''}
                ${erUrl ? `<div class="mt-2 text-xs"><a href="${escapeHtml(erUrl)}" target="_blank" class="text-blue-600 dark:text-blue-400 hover:underline">View quoted post</a></div>` : ''}
            </div>`;
        }
    }

    const initial = post.author ? post.author.charAt(0).toUpperCase() : '?';

    // Counts safely formatted
    const replyCount = post.repliesCount || 0;
    const reblogCount = post.reblogsCount || 0;
    const likeCount = post.favouritesCount || 0;

    const actionButtons = `
        <div class="flex gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button id="reply-btn-${index}-${context}" onclick="window.handleReply(${index}, '${context}')" class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-sm">
                <i data-lucide="message-circle" class="w-4 h-4"></i> 
                <span>Reply</span>
                ${replyCount > 0 ? `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full ml-1">${replyCount}</span>` : ''}
            </button>
            <div class="relative inline-block text-left">
                <button id="boost-btn-${index}-${context}" onclick="window.toggleBoostMenu(${index}, '${context}')" class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${post.reblogged ? 'text-green-600 dark:text-green-400 font-medium' : ''}">
                    <i data-lucide="repeat-2" class="w-4 h-4"></i>
                    <span>${post.reblogged ? 'Boosted' : 'Boost'}</span>
                    ${reblogCount > 0 ? `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">${reblogCount}</span>` : ''}
                </button>

                <div id="boost-menu-${index}-${context}" class="hidden origin-top-right absolute right-0 mt-2 w-28 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                    <div class="py-1">
                        <button onclick="(function(){window.hideBoostMenu(${index}, '${context}'); window.handleBoost(${index}, '${context}');})()" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start"> 
                            <i data-lucide="repeat-2" class="w-4 h-4"></i>
                            <span>Boost</span>
                        </button>
                        <button onclick="(function(){window.hideBoostMenu(${index}, '${context}'); window.handleQuote(${index}, '${context}');})()" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start"> 
                            <i data-lucide="quote" class="w-4 h-4"></i>
                            <span>Quote</span>
                        </button>
                    </div>
                </div>
            </div>
            <button id="like-btn-${index}-${context}" onclick="window.handleLike(${index}, '${context}')" class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm ${post.favourited ? 'text-red-600 dark:text-red-400 font-medium' : ''}">
                <i data-lucide="heart" class="w-4 h-4 ${post.favourited ? 'fill-current' : ''}"></i> 
                <span>${post.favourited ? 'Liked' : 'Like'}</span>
                ${likeCount > 0 ? `<span class="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full ml-1">${likeCount}</span>` : ''}
            </button>
        </div>
    `;

    const bgClass = isFocused
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700';

    return `
        <div class="${bgClass} rounded-xl p-5 border shadow-sm mb-4 hover:shadow-md transition-shadow relative">
            ${contextHeader}
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                        ${post.avatar ?
            `<img id="avatar-${index}-${context}" src="${post.avatar}" class="w-10 h-10 rounded-full object-cover bg-gray-200 dark:bg-gray-700 cursor-pointer" onclick="window.handleAvatarClick(${index}, '${context}')" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNlNWU3ZWIiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9ImFyaWFsIiBmb250LXNpemU9IjIwIiBmaWxsPSIjOWNhM2FmIiBkeT0iLjNlbSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+PzwvdGV4dD48L3N2Zz4='">` :
            `<div id="avatar-${index}-${context}" class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm cursor-pointer" onclick="window.handleAvatarClick(${index}, '${context}')">${initial}</div>`
        }
                        <div class="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-0.5">
                            ${post.platform in platformIcons ? `<img src="${platformIcons[post.platform]}" class="w-4 h-4">` : ''}
                        </div>

                        <div id="avatar-menu-${index}-${context}" class="hidden origin-top-left absolute top-0 left-full ml-2 mt-0 w-36 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                            <div class="py-1">
                                <button onclick="(function(){window.hideAvatarMenu(${index}, '${context}'); window.handleMuteFromMenu(${index}, '${context}');})()" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start">
                                    <i data-lucide="message-circle-x" class="w-4 h-4"></i>
                                    <span>Mute</span>
                                </button>
                                <button onclick="(function(){window.hideAvatarMenu(${index}, '${context}'); window.handleBlockFromMenu(${index}, '${context}');})()" class="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 w-full justify-start">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                    <span>Block</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="font-bold text-gray-900 dark:text-white leading-tight"><button onclick="window.handleProfileClick(${index}, '${context}')" class="hover:underline text-left">${post.author}</button></div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 font-medium"><button onclick="window.handleProfileClick(${index}, '${context}')" class="text-gray-500 hover:underline text-left">@${post.authorHandle}</button></div>
                    </div>
                </div>
                
                <a href="${post.url}" target="_blank" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors whitespace-nowrap ml-2">
                    ${timeString}${langBadge}
                </a>
            </div>
            
            <div class="text-sm text-gray-800 dark:text-gray-200 leading-relaxed break-words post-content">
                ${contentHtml}
            </div>
            
            ${embeddedHtml}

            ${mediaHtml}

            ${actionButtons}
            
            <div id="reply-form-${index}-${context}" class="hidden mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div class="flex gap-3">
                    <div class="flex-1">
                        <textarea id="reply-input-${index}-${context}" 
                            class="w-full p-3 text-sm rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 placeholder-gray-400 text-gray-800 dark:text-gray-100 resize-y font-sans" 
                            rows="2" 
                            placeholder="Type your reply..."
                            oninput="this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'"></textarea>
                        <div class="flex justify-end items-center mt-2 gap-2">
                            <button id="reply-submit-${index}-${context}" onclick="window.submitInlineReply(${index}, '${context}')" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-full transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm">
                                <span>Reply</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export async function displayHomeFeed(posts) {
    const feedList = document.getElementById('homeFeedList');
    const noPosts = document.getElementById('homeNoPosts');

    if (posts.length === 0) {
        feedList.innerHTML = '';
        if (noPosts) {
            noPosts.style.display = 'block';
            noPosts.textContent = 'No posts found in your home feed.';
        }
        return;
    }

    // Exclude Mastodon posts by user-configured language list
    const prefElem = document.getElementById('home-language-preferences');
    let excludedLangs = null;
    if (prefElem && prefElem.value && String(prefElem.value).trim().length > 0) {
        const parts = String(prefElem.value).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        excludedLangs = new Set(parts.map(p => p.split('-')[0]));
    }

    if (excludedLangs) {
        posts = posts.filter(p => {
            if (p.platform !== 'mastodon') return true;
            const langRaw = p.language || null;
            const lang = langRaw ? String(langRaw).split('-')[0].toLowerCase() : null;
            if (!lang) return true;
            return !excludedLangs.has(lang);
        });
    }

    if (noPosts) noPosts.style.display = 'none';

    // Save posts to memory for interactions
    window.currentFeedPosts = posts;

    // Pre-load icons
    const platformIcons = await getPlatformIcons();

    // Sort by date descending
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const problematicPosts = [];

    const itemsHtml = posts.map((post, index) => {
        if (post.platform === 'bluesky' && !post.content && !post.embed) {
            problematicPosts.push(sanitizePostForDebug(post));
        }
        return createPostHtml(post, index, 'feed', platformIcons);
    }).join('');

    feedList.innerHTML = itemsHtml;

    if (problematicPosts.length > 0) {
        // ... debug handling ...
        const safeJson = (obj) => {
            try {
                const seen = new WeakSet();
                return JSON.stringify(obj, function (k, v) {
                    if (typeof v === 'function') return undefined;
                    if (v && typeof v === 'object') {
                        if (seen.has(v)) return '[Circular]';
                        seen.add(v);
                    }
                    return v;
                }, 2);
            } catch (e) {
                return String(e);
            }
        };

        try {
            if (window.electron && window.electron.writeDebugLog) {
                window.electron.writeDebugLog(problematicPosts, 'bluesky-debug.json');
            } else {
                let header = document.getElementById('blueskyDebugHeader');
                if (!header) {
                    header = document.createElement('div');
                    header.id = 'blueskyDebugHeader';
                    header.className = 'p-3 bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-200 dark:border-yellow-800 text-xs';
                    const appRoot = document.getElementById('app') || document.body;
                    appRoot.insertBefore(header, appRoot.firstChild);
                }
                header.textContent = safeJson(problematicPosts);
            }
        } catch (e) {
            console.warn('Failed to write debug log:', e);
        }
    }

    if (window.lucide && window.lucide.createIcons && window.lucideIcons) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }
}

export async function appendToHomeFeed(newPosts) {
    if (newPosts.length === 0) return;

    // Exclude Mastodon posts by user-configured language list
    const prefElem = document.getElementById('home-language-preferences');
    let excludedLangs = null;
    if (prefElem && prefElem.value && String(prefElem.value).trim().length > 0) {
        const parts = String(prefElem.value).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
        excludedLangs = new Set(parts.map(p => p.split('-')[0]));
    }

    if (excludedLangs) {
        newPosts = newPosts.filter(p => {
            if (p.platform !== 'mastodon') return true;
            const langRaw = p.language || null;
            const lang = langRaw ? String(langRaw).split('-')[0].toLowerCase() : null;
            if (!lang) return true;
            return !excludedLangs.has(lang);
        });
    }

    if (newPosts.length === 0) return;

    const feedList = document.getElementById('homeFeedList');
    if (!feedList) return;

    // Append to current posts
    const currentPosts = window.currentFeedPosts || [];
    const currentIndex = currentPosts.length;
    
    // Add new posts to the global array
    window.currentFeedPosts = [...currentPosts, ...newPosts];

    // Pre-load icons
    const platformIcons = await getPlatformIcons();

    // Sort new posts by date descending
    newPosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Generate HTML for new posts with updated indices
    const itemsHtml = newPosts.map((post, index) => {
        return createPostHtml(post, currentIndex + index, 'feed', platformIcons);
    }).join('');

    // Append to feed
    feedList.insertAdjacentHTML('beforeend', itemsHtml);

    if (window.lucide && window.lucide.createIcons && window.lucideIcons) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }
}

export async function renderThreadView(posts) {
    // Save to thread memory
    window.currentThreadPosts = posts;

    let modal = document.getElementById('threadModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'threadModal';
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div class="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
                    <h3 class="text-lg font-bold text-gray-800 dark:text-white">Thread</h3>
                    <button onclick="document.getElementById('threadModal').classList.add('hidden')" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <i data-lucide="x" class="w-5 h-5 text-gray-500"></i>
                    </button>
                </div>
                <div id="threadContent" class="p-4 overflow-y-auto"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const content = document.getElementById('threadContent');
    const platformIcons = await getPlatformIcons();
    const html = posts.map((p, i) => createPostHtml(p, i, 'thread', platformIcons)).join('');

    content.innerHTML = html;
    modal.classList.remove('hidden');

    if (window.lucide && window.lucide.createIcons && window.lucideIcons) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }

    // scroll to focused post
    const focusedIndex = posts.findIndex(p => p.isFocused);
    if (focusedIndex >= 0) {
        setTimeout(() => {
            const el = document.getElementById(`reply-btn-${focusedIndex}-thread`)?.closest('.bg-blue-50');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
}
