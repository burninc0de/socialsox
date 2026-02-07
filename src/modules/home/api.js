
export async function fetchMastodonHome(instance, token, limit = 20, maxId = null) {
    let cleanInstance = instance.trim();
    if (!cleanInstance.startsWith('http')) {
        cleanInstance = 'https://' + cleanInstance;
    }
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }

    // Validate URL
    try {
        new URL(cleanInstance);
    } catch (e) {
        throw new Error(`Invalid Mastodon Instance URL: ${cleanInstance}`);
    }

    let url = `${cleanInstance}/api/v1/timelines/home?limit=${limit}`;
    if (maxId) {
        url += `&max_id=${maxId}`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Mastodon Unauthorized: Check your access token.');
        }
        if (response.status === 403) {
            throw new Error('Mastodon/Forbidden: Check scope (need read or read:statuses).');
        }
        throw new Error(`Mastodon Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error('Mastodon API returned unexpected data format');
    }

    const posts = data.map(status => {
        // Handle Boosts/Reblogs
        const isReblog = !!status.reblog;
        const displayStatus = isReblog ? status.reblog : status;
        const boostedBy = isReblog ? (status.account.display_name || status.account.username) : null;
        const boostedByHandle = isReblog ? status.account.acct : null;

        return {
            id: displayStatus.id, // ID of the actual content post (for fav/boost)
            originalId: status.id, // ID of the timeline entry (redundant but good for debug)
            platform: 'mastodon',
            // Mastodon provides an instance-side language hint (IETF/ISO codes like 'en', 'de').
            // We'll surface it so the UI can use it for filtering.
            language: displayStatus.language || null,
            author: displayStatus.account.display_name || displayStatus.account.username,
            authorHandle: displayStatus.account.acct,
            authorId: displayStatus.account.id,
            avatar: displayStatus.account.avatar,
            content: displayStatus.content,
            timestamp: status.created_at, // Use timeline entry timestamp (when it was boosted)
            url: displayStatus.url,
            media: displayStatus.media_attachments,
            instance: cleanInstance,
            token: token,
            reblogged: displayStatus.reblogged, // "Have *I* reblogged this?"
            favourited: displayStatus.favourited,
            boostedBy: boostedBy,
            boostedByHandle: boostedByHandle,
            replyTo: displayStatus.in_reply_to_id ? (displayStatus.mentions?.[0]?.acct || 'unknown') : null,
            repliesCount: displayStatus.replies_count,
            reblogsCount: displayStatus.reblogs_count,
            favouritesCount: displayStatus.favourites_count
        };
    });

    // Return posts with pagination info (last post's ID for next page)
    return {
        posts,
        nextCursor: posts.length > 0 ? posts[posts.length - 1].originalId : null
    };
}

export async function fetchBlueskyHome(handle, password, limit = 20, cursor = null) {
    // Create session
    const sessionResponse = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle, password: password })
    });

    if (!sessionResponse.ok) {
        throw new Error('Bluesky auth failed. Check credentials.');
    }

    const session = await sessionResponse.json();

    // Get timeline
    let url = `https://bsky.social/xrpc/app.bsky.feed.getTimeline?limit=${limit}`;
    if (cursor) {
        url += `&cursor=${cursor}`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${session.accessJwt}`
        }
    });

    if (!response.ok) {
        throw new Error(`Bluesky: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    const postsOut = [];
    for (const item of data.feed) {
        // Handle Reposts
        const isRepost = item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost';
        const post = item.post; // This is always the hydrated post
        const boostedBy = isRepost ? (item.reason.by.displayName || item.reason.by.handle) : null;

        // Handle Replies (check if the post record itself is a reply)
        const record = post.record;

        // Determine timestamp: if repost, use repost time (item.reason.indexedAt), else post time
        const timestamp = isRepost ? item.reason.indexedAt : post.indexedAt;

        const out = {
            id: post.uri,
            cid: post.cid,
            platform: 'bluesky',
            author: post.author.displayName || post.author.handle,
            authorHandle: post.author.handle,
            authorDid: post.author.did,
            avatar: post.author.avatar,
            content: record.text,
            facets: record.facets || null,
            embed: post.embed || record.embed || null,
            timestamp: timestamp,
            url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
            media: post.embed?.images?.map(img => ({
                type: 'image',
                preview_url: img.thumb,
                url: img.fullsize
            })) || (post.embed?.record?.embeds?.[0]?.images?.map(img => ({
                type: 'image',
                preview_url: img.thumb,
                url: img.fullsize
            }))),
            accessJwt: session.accessJwt,
            did: session.did,
            reply: record.reply, // Logic object
            boostedBy: boostedBy,
            replyTo: record.reply ? 'User' : null,
            favourited: !!post.viewer?.like,
            reblogged: !!post.viewer?.repost,
            repliesCount: post.replyCount,
            reblogsCount: post.repostCount,
            favouritesCount: post.likeCount
        };

        // If this post embeds another record (quote), try to fetch that record so we can render it inline
        try {
            if (out.embed && String(out.embed.$type || '').startsWith('app.bsky.embed.record') && out.embed.record && out.embed.record.uri) {
                const uriParts = out.embed.record.uri.split('/');
                const quotedDid = uriParts[2];
                const quotedPostId = uriParts[uriParts.length - 1];
                const quotedResp = await fetch(`https://bsky.social/xrpc/com.atproto.repo.getRecord?repo=${quotedDid}&collection=app.bsky.feed.post&rkey=${quotedPostId}`, {
                    headers: {
                        'Authorization': `Bearer ${session.accessJwt}`
                    }
                });
                if (quotedResp.ok) {
                    const quotedData = await quotedResp.json();
                    out.embeddedRecord = quotedData.value || quotedData;
                }
            }
        } catch (e) {
            console.warn('Failed to fetch embedded quoted record:', e);
        }

        postsOut.push(out);
    }

    return {
        posts: postsOut,
        nextCursor: data.cursor || null
    };
}

export async function fetchMastodonHashtag(tag, instance, token) {
    let cleanInstance = instance.trim();
    if (!cleanInstance.startsWith('http')) cleanInstance = 'https://' + cleanInstance;
    cleanInstance = cleanInstance.replace(/\/$/, '');

    // Use encodeURIComponent for tag
    const response = await fetch(`${cleanInstance}/api/v1/timelines/tag/${encodeURIComponent(tag)}?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Mastodon tag error');
    const data = await response.json();
    return data.map(status => {
        // Map fields
        const isReblog = !!status.reblog;
        const displayStatus = isReblog ? status.reblog : status;
        const boostedBy = isReblog ? (status.account.display_name || status.account.username) : null;

        return {
            id: displayStatus.id,
            platform: 'mastodon',
            author: displayStatus.account.display_name || displayStatus.account.username,
            authorHandle: displayStatus.account.acct,
            authorId: displayStatus.account.id,
            avatar: displayStatus.account.avatar,
            content: displayStatus.content,
            timestamp: status.created_at,
            url: displayStatus.url,
            media: displayStatus.media_attachments,
            instance: cleanInstance,
            token: token,
            reblogged: displayStatus.reblogged,
            favourited: displayStatus.favourited,
            replyTo: displayStatus.in_reply_to_id ? (displayStatus.mentions?.[0]?.acct || 'unknown') : null,
            boostedBy: boostedBy
        };
    });
}

export async function fetchBlueskyHashtag(tag, session) {
    // Bluesky doesn't have a direct "tag timeline" endpoint easily accessible without custom feeds or search.
    // Use app.bsky.feed.searchPosts
    const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent('#' + tag)}&limit=25`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` }
    });
    if (!response.ok) throw new Error('Bluesky search error');
    const data = await response.json();

    // Map search results to feed format
    return data.posts.map(post => {
        return {
            id: post.uri,
            cid: post.cid,
            platform: 'bluesky',
            author: post.author.displayName || post.author.handle,
            authorHandle: post.author.handle,
            authorDid: post.author.did,
            avatar: post.author.avatar,
            content: post.record.text,
            facets: post.record.facets,
            embed: post.embed,
            timestamp: post.indexedAt,
            url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
            media: post.embed?.images?.map(img => ({ type: 'image', preview_url: img.thumb, url: img.fullsize })),
            accessJwt: session.accessJwt,
            did: session.did,
            reply: null,
            boostedBy: null,
            favourited: !!post.viewer?.like,
            reblogged: !!post.viewer?.repost
        };
    });
}

export async function fetchMastodonProfile(accountId, instance, token) {
    const cleanInstance = instance.replace(/\/$/, '');
    
    // Try with auth first
    let response = await fetch(`${cleanInstance}/api/v1/accounts/${accountId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // If 403 (scope issue), try without auth (public endpoint)
    if (response.status === 403) {
        console.log('Mastodon profile: Trying without auth (public endpoint)');
        response = await fetch(`${cleanInstance}/api/v1/accounts/${accountId}`);
    }
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Mastodon profile fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch Mastodon profile (${response.status}): ${errorText}`);
    }
    return await response.json();
}

export async function fetchBlueskyProfile(actorDid, session) {
    const response = await fetch(`https://bsky.social/xrpc/app.bsky.actor.getProfile?actor=${actorDid}`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` }
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error('Bluesky profile fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch Bluesky profile (${response.status}): ${errorText}`);
    }
    return await response.json();
}

export async function fetchMastodonUserFeed(accountId, instance, token) {
    const response = await fetch(`${instance}/api/v1/accounts/${accountId}/statuses?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Mastodon fetch error');
    const data = await response.json();
    return data.map(status => {
        return {
            id: status.id,
            platform: 'mastodon',
            author: status.account.display_name || status.account.username,
            authorHandle: status.account.acct,
            authorId: status.account.id,
            avatar: status.account.avatar,
            content: status.content,
            timestamp: status.created_at,
            url: status.url,
            media: status.media_attachments,
            instance: instance,
            token: token,
            reblogged: status.reblogged,
            favourited: status.favourited,
            replyTo: status.in_reply_to_id ? (status.mentions?.[0]?.acct || 'unknown') : null,
            boostedBy: null
        };
    });
}

export async function fetchBlueskyUserFeed(actorDid, session) {
    const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getAuthorFeed?actor=${actorDid}&limit=25`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` }
    });
    if (!response.ok) throw new Error('Bluesky fetch error');
    const data = await response.json();

    const postsOut = [];
    for (const item of data.feed) {
        const post = item.post;
        const isRepost = item.reason && item.reason.$type === 'app.bsky.feed.defs#reasonRepost';
        const boostedBy = isRepost ? (item.reason.by.displayName || item.reason.by.handle) : null;
        const timestamp = isRepost ? item.reason.indexedAt : post.indexedAt;

        postsOut.push({
            id: post.uri,
            cid: post.cid,
            platform: 'bluesky',
            author: post.author.displayName || post.author.handle,
            authorHandle: post.author.handle,
            authorDid: post.author.did,
            avatar: post.author.avatar,
            content: post.record.text,
            facets: post.record.facets,
            embed: post.embed,
            timestamp: timestamp,
            url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
            media: post.embed?.images?.map(img => ({ type: 'image', preview_url: img.thumb, url: img.fullsize })),
            accessJwt: session.accessJwt,
            did: session.did,
            reply: post.record.reply,
            boostedBy: boostedBy,
            replyTo: post.record.reply ? 'User' : null,
            favourited: !!post.viewer?.like,
            reblogged: !!post.viewer?.repost
        });
    }
    return postsOut;
}

export async function fetchMastodonThread(postId, instance, token) {
    const cleanInstance = instance.replace(/\/$/, '');

    // 1. Fetch Context
    const contextResp = await fetch(`${cleanInstance}/api/v1/statuses/${postId}/context`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!contextResp.ok) throw new Error('Failed to fetch Mastodon thread context');
    const context = await contextResp.json();

    // 2. Fetch the post itself (to have the focused post details)
    const postResp = await fetch(`${cleanInstance}/api/v1/statuses/${postId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!postResp.ok) throw new Error('Failed to fetch Mastodon post details');
    const post = await postResp.json();

    // Combine them: Ancestors -> Post -> Descendants
    const all = [...context.ancestors, post, ...context.descendants];

    // Map to our common format
    return all.map(status => ({
        id: status.id,
        platform: 'mastodon',
        author: status.account.display_name || status.account.username,
        authorHandle: status.account.acct,
        authorId: status.account.id,
        avatar: status.account.avatar,
        content: status.content,
        timestamp: status.created_at,
        url: status.url,
        media: status.media_attachments,
        instance: cleanInstance,
        token: token,
        reblogged: status.reblogged,
        favourited: status.favourited,
        replyTo: status.in_reply_to_id ? (status.mentions?.[0]?.acct || 'unknown') : null,
        repliesCount: status.replies_count,
        reblogsCount: status.reblogs_count,
        favouritesCount: status.favourites_count,
        isFocused: status.id === postId
    }));
}

export async function fetchBlueskyThread(uri, session) {
    const response = await fetch(`https://bsky.social/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}`, {
        headers: { 'Authorization': `Bearer ${session.accessJwt}` }
    });

    if (!response.ok) throw new Error('Failed to fetch Bluesky thread');
    const data = await response.json();
    const thread = data.thread;

    if (!thread || thread.$type !== 'app.bsky.feed.defs#threadViewPost') {
        throw new Error('Thread not found or blocked');
    }

    // Flatten the thread: Ancestors -> Focus -> Replies
    // Bluesky thread is a tree. `parent` is the immediate parent.

    const ancestors = [];
    let current = thread.parent;
    while (current) {
        if (current.$type === 'app.bsky.feed.defs#threadViewPost') {
            ancestors.unshift(current);
            current = current.parent;
        } else {
            break; // blocked or missing
        }
    }

    const replies = thread.replies || [];
    // We only take direct replies for the linear view, or we could flatten all?
    // Let's take direct replies for now, as flattening a generic tree is complex for UI
    // But user asked for "whole thread". Usually that implies at least the linear conversation.

    const rawPosts = [...ancestors, thread, ...replies.filter(r => r.$type === 'app.bsky.feed.defs#threadViewPost')];

    const mapPost = (item, isFocused) => {
        const post = item.post;
        return {
            id: post.uri,
            cid: post.cid,
            platform: 'bluesky',
            author: post.author.displayName || post.author.handle,
            authorHandle: post.author.handle,
            authorDid: post.author.did,
            avatar: post.author.avatar,
            content: post.record.text,
            facets: post.record.facets,
            embed: post.embed,
            timestamp: post.indexedAt,
            url: `https://bsky.app/profile/${post.author.did}/post/${post.uri.split('/').pop()}`,
            media: post.embed?.images?.map(img => ({ type: 'image', preview_url: img.thumb, url: img.fullsize })),
            accessJwt: session.accessJwt,
            did: session.did,
            reply: post.record.reply,
            favourited: !!post.viewer?.like,
            reblogged: !!post.viewer?.repost,
            repliesCount: post.replyCount,
            reblogsCount: post.repostCount,
            favouritesCount: post.likeCount,
            isFocused: isFocused
        };
    };

    return rawPosts.map(p => mapPost(p, p === thread));
}
