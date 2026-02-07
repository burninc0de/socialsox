import { fetchMastodonHome, fetchBlueskyHome } from './api.js';
import { displayHomeFeed, appendToHomeFeed, showSkeletonLoaders } from './render.js';
import './actions.js'; // Import for side effects (window handlers)

// Pagination state
window.homeFeedPagination = {
    mastodonCursor: null,
    blueskyCursor: null,
    isLoading: false,
    hasMore: true
};

let infiniteScrollObserver = null;

function setupInfiniteScroll() {
    // Remove existing observer if any
    if (infiniteScrollObserver) {
        infiniteScrollObserver.disconnect();
    }

    const feedList = document.getElementById('homeFeedList');
    if (!feedList) return;

    // Create a sentinel element at the bottom
    let sentinel = document.getElementById('feed-sentinel');
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'feed-sentinel';
        sentinel.className = 'h-10 flex items-center justify-center';
        feedList.parentElement.appendChild(sentinel);
    }

    // Create intersection observer
    infiniteScrollObserver = new IntersectionObserver(
        (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && window.homeFeedPagination.hasMore && !window.homeFeedPagination.isLoading) {
                loadMorePosts();
            }
        },
        { rootMargin: '100px' }
    );

    infiniteScrollObserver.observe(sentinel);
}

async function loadMorePosts() {
    if (window.homeFeedPagination.isLoading || !window.homeFeedPagination.hasMore) {
        return;
    }

    window.homeFeedPagination.isLoading = true;

    // Show skeleton loaders
    let sentinel = document.getElementById('feed-sentinel');
    const feedList = document.getElementById('homeFeedList');
    
    if (feedList && sentinel) {
        const skeletonHtml = Array(3).fill(0).map(() => `
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
        
        sentinel.insertAdjacentHTML('beforebegin', skeletonHtml);
    }

    try {
        const posts = [];
        const promises = [];

        const mixVal = parseInt(localStorage.getItem('socialSoxFeedMix') || '50', 10);
        const total = 40;
        const blueskyLimit = Math.round((mixVal / 100) * total);
        const mastodonLimit = total - blueskyLimit;

        // Mastodon
        const mastodonInstance = document.getElementById('mastodon-instance').value;
        const mastodonToken = document.getElementById('mastodon-token').value;
        if (mastodonInstance && mastodonToken && mastodonLimit > 0) {
            promises.push(fetchMastodonHome(
                mastodonInstance, 
                mastodonToken, 
                mastodonLimit,
                window.homeFeedPagination.mastodonCursor
            ).then(result => {
                posts.push(...result.posts);
                window.homeFeedPagination.mastodonCursor = result.nextCursor;
            }).catch(e => {
                console.error('Mastodon pagination error:', e);
            }));
        }

        // Bluesky
        const blueskyHandle = document.getElementById('bluesky-handle').value;
        const blueskyPassword = document.getElementById('bluesky-password').value;
        if (blueskyHandle && blueskyPassword && blueskyLimit > 0) {
            promises.push(fetchBlueskyHome(
                blueskyHandle, 
                blueskyPassword, 
                blueskyLimit,
                window.homeFeedPagination.blueskyCursor
            ).then(result => {
                posts.push(...result.posts);
                window.homeFeedPagination.blueskyCursor = result.nextCursor;
            }).catch(e => {
                console.error('Bluesky pagination error:', e);
            }));
        }

        await Promise.all(promises);

        // Remove skeleton loaders
        if (feedList) {
            const skeletons = feedList.querySelectorAll('.animate-pulse');
            skeletons.forEach(skeleton => {
                if (skeleton.parentElement === feedList) {
                    skeleton.remove();
                }
            });
        }

        if (posts.length === 0) {
            window.homeFeedPagination.hasMore = false;
            if (sentinel) {
                sentinel.innerHTML = '<span class="text-sm text-gray-400">No more posts</span>';
            }
        } else {
            appendToHomeFeed(posts);
        }

    } catch (error) {
        console.error('Error loading more posts:', error);
    } finally {
        window.homeFeedPagination.isLoading = false;
    }
}

export async function loadHomeFeed(silent = false) {
    const btn = document.getElementById('refreshHomeBtn');
    const noPosts = document.getElementById('homeNoPosts');

    if (!silent && btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Refreshing...';
        if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
            lucide.createIcons({ icons: window.lucideIcons });
        }
    }

    if (noPosts) noPosts.style.display = 'none';
    
    // Show skeleton loaders while loading
    if (!silent) {
        showSkeletonLoaders(5);
    }

    // Reset Header to default state
    const headerTitle = document.querySelector('#homeContent h2');
    const headerSubtitle = document.querySelector('#homeContent p.text-gray-500');
    if (headerTitle) {
        headerTitle.textContent = 'Home Feed';
        headerTitle.className = "text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2";
    }
    if (headerSubtitle) headerSubtitle.textContent = 'Updates from people you follow';

    // Hide Follow Hashtag button if it exists separately
    const followBtn = document.getElementById('followHashtagBtn');
    if (followBtn) followBtn.remove();

    // Reset pagination state
    window.homeFeedPagination = {
        mastodonCursor: null,
        blueskyCursor: null,
        isLoading: false,
        hasMore: true
    };

    try {
        const posts = [];
        const promises = [];

        const mixVal = parseInt(localStorage.getItem('socialSoxFeedMix') || '50', 10);
        const total = 40;
        const blueskyLimit = Math.round((mixVal / 100) * total);
        const mastodonLimit = total - blueskyLimit;

        // Mastodon
        const mastodonInstance = document.getElementById('mastodon-instance').value;
        const mastodonToken = document.getElementById('mastodon-token').value;
        if (mastodonInstance && mastodonToken && mastodonLimit > 0) {
            promises.push(fetchMastodonHome(mastodonInstance, mastodonToken, mastodonLimit)
                .then(result => {
                    if (result.posts.length === 0 && !silent) {
                        window.showToast('Mastodon: 0 posts found in home feed', 'info');
                    }
                    posts.push(...result.posts);
                    window.homeFeedPagination.mastodonCursor = result.nextCursor;
                })
                .catch(e => {
                    console.error('Mastodon home feed error:', e);
                    if (!silent) window.showToast(`${e.message}`, 'error', 5000);
                }));
        }

        // Bluesky
        const blueskyHandle = document.getElementById('bluesky-handle').value;
        const blueskyPassword = document.getElementById('bluesky-password').value;
        if (blueskyHandle && blueskyPassword && blueskyLimit > 0) {
            promises.push(fetchBlueskyHome(blueskyHandle, blueskyPassword, blueskyLimit)
                .then(result => {
                    posts.push(...result.posts);
                    window.homeFeedPagination.blueskyCursor = result.nextCursor;
                })
                .catch(e => {
                    console.error('Bluesky home feed error:', e);
                    if (!silent) window.showToast(`Bluesky error: ${e.message}`, 'error');
                }));
        }

        await Promise.all(promises);

        displayHomeFeed(posts);

        // Setup infinite scroll after initial load
        setupInfiniteScroll();

        if (!silent) {
            window.showStatus('Feed updated!', 'success');
        }

    } catch (error) {
        console.error('Error loading home feed:', error);
        if (!silent) {
            window.showStatus(`Error loading feed: ${error.message}`, 'error');
        }
    } finally {
        if (!silent && btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh';
            if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
                lucide.createIcons({ icons: window.lucideIcons });
            }
        }
    }
}
