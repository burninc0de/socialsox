// Platform posting functions

export async function testMastodonConfig(instance, token) {
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    const response = await fetch(`${cleanInstance}/api/v1/accounts/verify_credentials`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${errorText}`);
    }
    
    const data = await response.json();
    return { success: true, username: data.username, displayName: data.display_name };
}

export async function testTwitterConfig(apiKey, apiSecret, accessToken, accessTokenSecret) {
    if (window.electron && window.electron.testTwitterConfig) {
        const result = await window.electron.testTwitterConfig(apiKey, apiSecret, accessToken, accessTokenSecret);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        return { success: true, username: result.username };
    } else {
        throw new Error('Twitter testing requires Electron app (run: npm start)');
    }
}

export async function testBlueskyConfig(handle, password) {
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
        throw new Error(`Authentication failed: ${errorText}`);
    }
    
    const session = await sessionResponse.json();
    return { success: true, username: session.handle, did: session.did };
}

export async function postToMastodon(message, instance, token, imageFiles = []) {
    let cleanInstance = instance.trim();
    if (cleanInstance.endsWith('/')) {
        cleanInstance = cleanInstance.slice(0, -1);
    }
    const url = new URL(cleanInstance);
    cleanInstance = `${url.protocol}//${url.host}`;
    
    let mediaIds = [];
    
    if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles.slice(0, 4)) {
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
            mediaIds.push(mediaData.id);
        }
    }
    
    const postData = { status: message };
    if (mediaIds.length > 0) {
        postData.media_ids = mediaIds;
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
    
    const data = await response.json();
    return { success: true, url: data.url };
}

export async function postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageDataArray = []) {
    // Check Twitter's 280 character limit
    if (message.length > 280) {
        throw new Error(`Twitter posts are limited to 280 characters. Your message is ${message.length} characters long.`);
    }
    
    if (window.electron && window.electron.postToTwitter) {
        console.log('Calling Electron backend for Twitter...');
        const result = await window.electron.postToTwitter(message, apiKey, apiSecret, accessToken, accessTokenSecret, imageDataArray);
        console.log('Twitter result:', result);
        
        if (!result.success) {
            let errorMsg = result.error;
            if (result.details) {
                console.error('Twitter error details:', result.details);
                if (result.details.detail) errorMsg = result.details.detail;
                else if (result.details.title) errorMsg = result.details.title;
            }
            throw new Error(errorMsg);
        }
        return { success: true, url: result.url };
    } else {
        throw new Error('Twitter posting requires Electron app (run: npm start)');
    }
}

export async function postToBluesky(message, handle, password, imageFiles = []) {
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
    
    let imageBlobs = [];
    
    if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles.slice(0, 4)) {
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
            imageBlobs.push(uploadData.blob);
        }
    }
    
    const facets = [];
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let match;
    let externalEmbed = null;
    while ((match = urlRegex.exec(message)) !== null) {
        const url = match[0];

        if (window.electron && window.electron.fetchOgPreview) {
            try {
                const og = await window.electron.fetchOgPreview(url);
                if (og && og.success && og.image) {
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

                        break;
                    }
                }
            } catch (e) {
                console.error('OG preview error:', e);
            }
        }

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

    const record = {
        text: message,
        createdAt: new Date().toISOString()
    };

    if (externalEmbed) {
        record.embed = externalEmbed;
    }
    
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
    
    if (imageBlobs.length > 0) {
        record.embed = {
            $type: 'app.bsky.embed.images',
            images: imageBlobs.map(blob => ({
                alt: '',
                image: blob
            }))
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
    
    const data = await postResponse.json();
    const postId = data.uri.split('/').pop();
    const postUrl = `https://bsky.app/profile/${session.did}/post/${postId}`;
    return { success: true, url: postUrl };
}
