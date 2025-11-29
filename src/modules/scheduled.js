// Scheduled posts management

let scheduledData = [];
let schedulePollingInterval = null;

export async function loadScheduled() {
    try {
        scheduledData = await window.electron.readScheduled();
        // Sort by scheduled time (earliest first)
        scheduledData.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
    } catch (error) {
        console.error('Failed to load scheduled posts:', error);
        scheduledData = [];
    }
}

export async function saveScheduled(scheduled) {
    try {
        await window.electron.writeScheduled(scheduled);
    } catch (error) {
        console.error('Failed to save scheduled posts:', error);
    }
}

export async function addScheduledPost(message, platforms, scheduledTime, images = []) {
    try {
        const scheduled = await window.electron.readScheduled();
        const entry = {
            id: Date.now().toString(),
            message: message,
            platforms: platforms,
            scheduledTime: scheduledTime,
            createdAt: new Date().toISOString(),
            images: images
        };
        scheduled.push(entry);

        await saveScheduled(scheduled);
        scheduledData = scheduled;
        displayScheduled();

        // Start polling if this is the first scheduled post
        if (scheduled.length === 1) {
            startSchedulePolling();
        }

        window.showToast('Post scheduled successfully', 'success');
    } catch (error) {
        console.error('Failed to add scheduled post:', error);
        window.showToast('Failed to schedule post', 'error');
    }
}

export async function deleteScheduledPost(id) {
    try {
        const scheduled = await window.electron.readScheduled();
        const filteredScheduled = scheduled.filter(entry => entry.id !== id);
        await saveScheduled(filteredScheduled);
        scheduledData = filteredScheduled;
        displayScheduled();

        // Stop polling if no posts remain
        if (filteredScheduled.length === 0) {
            stopSchedulePolling();
        }

        window.showToast('Scheduled post deleted', 'success');
    } catch (error) {
        console.error('Failed to delete scheduled post:', error);
        window.showToast('Failed to delete scheduled post', 'error');
    }
}

export async function clearScheduled() {
    if (confirm('Are you sure you want to clear all scheduled posts? This action cannot be undone.')) {
        try {
            await window.electron.deleteScheduled();
            scheduledData = [];
            displayScheduled();
            stopSchedulePolling();
            window.showToast('Scheduled posts cleared', 'success');
        } catch (error) {
            console.error('Failed to clear scheduled posts:', error);
            window.showToast('Failed to clear scheduled posts', 'error');
        }
    }
}

export function displayScheduled() {
    const scheduledList = document.getElementById('scheduledList');
    const noScheduled = document.getElementById('noScheduled');

    if (scheduledData.length === 0) {
        scheduledList.innerHTML = '';
        noScheduled.style.display = 'block';
        return;
    }

    noScheduled.style.display = 'none';

    scheduledList.innerHTML = scheduledData.map(entry => {
        const scheduledDate = new Date(entry.scheduledTime);
        const now = new Date();
        const isPast = scheduledDate < now;
        const timeString = scheduledDate.toLocaleString();
        const platformsString = entry.platforms.join(', ');

        // Debug logging
        console.log('Scheduled post debug:', JSON.stringify({
            id: entry.id,
            scheduledTime: entry.scheduledTime,
            scheduledDate: scheduledDate.toString(),
            now: now.toString(),
            isPast: isPast,
            diff: scheduledDate - now
        }, null, 2));

        // Calculate time remaining
        const diff = scheduledDate - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeRemaining;
        if (isPast) {
            timeRemaining = 'Sending soon...';
        } else if (hours > 0) {
            timeRemaining = `in ${hours}h ${minutes} m`;
        } else if (minutes > 0) {
            timeRemaining = `in ${minutes}m ${seconds} s`;
        } else {
            timeRemaining = `in ${seconds} s`;
        }

        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-semibold ${isPast ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}">${timeString}</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400">${timeRemaining}</span>
                    </div>
                    <button onclick="(async () => { await deleteScheduledPost('${entry.id}'); })(); event.stopPropagation();" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Delete scheduled post">×</button>
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">${entry.message}</p>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-600 dark:text-gray-300">Platforms:</span>
                    <span class="text-xs text-gray-600 dark:text-gray-400">${platformsString}</span>
                </div>
                ${entry.images && entry.images.length > 0 ? `
                    <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        📎 ${entry.images.length} image${entry.images.length > 1 ? 's' : ''} attached
                    </div>
                ` : ''
            }
            </div>
    `;
    }).join('');
}

export async function loadAndDisplayScheduled() {
    await loadScheduled();
    displayScheduled();
}

export async function checkAndSendDuePosts() {
    try {
        const scheduled = await window.electron.readScheduled();

        // Stop polling if no posts remain (safety check)
        if (scheduled.length === 0) {
            stopSchedulePolling();
            return;
        }

        // Always refresh display if on scheduled tab to update countdowns
        const scheduledContent = document.getElementById('scheduledContent');
        if (scheduledContent && !scheduledContent.classList.contains('hidden')) {
            // We need to update scheduledData before displaying
            scheduledData = scheduled;
            // Sort by scheduled time (earliest first)
            scheduledData.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
            displayScheduled();
        }

        const now = new Date();
        const duePosts = scheduled.filter(entry => new Date(entry.scheduledTime) <= now);

        if (duePosts.length === 0) {
            return;
        }

        console.log(`Found ${duePosts.length} due post(s) to send`);

        // Send each due post
        for (const post of duePosts) {
            console.log('Sending scheduled post:', post.id);

            // Set the platforms
            post.platforms.forEach(platform => {
                window.platforms[platform] = true;
                const btn = document.querySelector(`.platform-toggle[data-platform="${platform}"]`);
                if (btn) {
                    btn.classList.add('active', 'border-primary-500', 'bg-primary-500', 'text-white');
                    btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                }
            });

            // Set the message
            document.getElementById('message').value = post.message;

            // Handle images if present
            if (post.images && post.images.length > 0) {
                // Convert base64 images back to File objects
                const imageFiles = [];
                for (let i = 0; i < post.images.length; i++) {
                    const base64 = post.images[i];
                    const response = await fetch(base64);
                    const blob = await response.blob();
                    const file = new File([blob], `scheduled-image-${i}.jpg`, { type: 'image/jpeg' });
                    imageFiles.push(file);

                }

                // Set images in the upload module
                if (window.setSelectedImages) {
                    window.setSelectedImages(imageFiles);
                }
            }

            // Post it
            await window.postToAll();

            // Remove from scheduled list
            const remainingScheduled = scheduled.filter(entry => entry.id !== post.id);
            await saveScheduled(remainingScheduled);
        }

        // Show toast notification for sent posts
        if (duePosts.length === 1) {
            window.showToast('✓ Scheduled post sent successfully!', 'success');
        } else {
            window.showToast(`✓ ${duePosts.length} scheduled posts sent successfully!`, 'success');
        }

        // Refresh the display
        await loadAndDisplayScheduled();

        // Stop polling if no posts remain
        const remainingPosts = await window.electron.readScheduled();
        if (remainingPosts.length === 0) {
            stopSchedulePolling();
        }

    } catch (error) {
        console.error('Error checking/sending due posts:', error);
    }
}

export function startSchedulePolling() {
    // Check immediately on start
    checkAndSendDuePosts();

    // Then check every 30 seconds
    if (!schedulePollingInterval) {
        schedulePollingInterval = setInterval(checkAndSendDuePosts, 30000);
        console.log('Schedule polling started (30s interval)');
    }
}

export function stopSchedulePolling() {
    if (schedulePollingInterval) {
        clearInterval(schedulePollingInterval);
        schedulePollingInterval = null;
        console.log('Schedule polling stopped');
    }
}
