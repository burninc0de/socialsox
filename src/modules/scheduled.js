// Scheduled posts management
import { makeResizable } from './resize.js';

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

export async function updateScheduledPost(id, newValues) {
    try {
        const scheduled = await window.electron.readScheduled();
        const postIndex = scheduled.findIndex(entry => entry.id === id);

        if (postIndex > -1) {
            // Update only provided values
            Object.assign(scheduled[postIndex], newValues);

            await saveScheduled(scheduled);
            scheduledData = scheduled;
            displayScheduled(); // Refresh the view
            window.showToast('Scheduled post updated successfully', 'success');
        } else {
            window.showToast('Could not find the scheduled post to update.', 'error');
        }
    } catch (error) {
        console.error('Failed to update scheduled post:', error);
        window.showToast('An error occurred while updating the post.', 'error');
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
        
        const year = scheduledDate.getFullYear();
        const month = (scheduledDate.getMonth() + 1).toString().padStart(2, '0');
        const day = scheduledDate.getDate().toString().padStart(2, '0');
        const hours = scheduledDate.getHours().toString().padStart(2, '0');
        const minutes = scheduledDate.getMinutes().toString().padStart(2, '0');
        const seconds = scheduledDate.getSeconds().toString().padStart(2, '0');
        const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        const platformsString = entry.platforms.join(', ');

        // Calculate time remaining
        const diff = scheduledDate - now;
        const remainingHours = Math.floor(diff / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const remainingSeconds = Math.floor((diff % (1000 * 60)) / 1000);

        let timeRemaining;
        if (isPast) {
            timeRemaining = 'Sending soon...';
        } else if (remainingHours > 0) {
            timeRemaining = `in ${remainingHours}h ${remainingMinutes} m`;
        } else if (remainingMinutes > 0) {
            timeRemaining = `in ${remainingMinutes}m ${remainingSeconds} s`;
        } else {
            timeRemaining = `in ${remainingSeconds} s`;
        }

        return `
            <div id="scheduled-post-${entry.id}" class="relative bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex flex-col gap-1">
                         <div class="time-display">
                            <span class="text-xs font-semibold ${isPast ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}">${timeString}</span>
                            <br>
                            <span class="text-xs text-gray-500 dark:text-gray-400">${timeRemaining}</span>
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="window.editScheduledPost('${entry.id}')" class="edit-btn text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Edit scheduled post">
                            <i data-lucide="pen" class="w-3.5 h-3.5"></i>
                        </button>
                        <button onclick="deleteScheduledPost('${entry.id}')" class="text-gray-400 hover:text-red-600 dark:hover:text-red-500 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Delete scheduled post">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                        </button>
                    </div>
                </div>
                <div class="message-display text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">${entry.message}</div>
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

    // After rendering, replace icons
    if (window.lucide) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }
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
            // Skip refresh if any post is in edit mode
            const isEditing = document.querySelector('.scheduled-time-input') !== null;
            if (!isEditing) {
                // We need to update scheduledData before displaying
                scheduledData = scheduled;
                // Sort by scheduled time (earliest first)
                scheduledData.sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime));
                displayScheduled();
            }
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
            window.electron.showOSNotification('Scheduled Post Sent', 'Your scheduled post has been sent successfully.');
        } else {
            window.showToast(`✓ ${duePosts.length} scheduled posts sent successfully!`, 'success');
            window.electron.showOSNotification('Scheduled Posts Sent', `${duePosts.length} scheduled posts have been sent successfully.`);
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

// --- Edit Functionality ---

window.editScheduledPost = (id) => {
    const postCard = document.getElementById(`scheduled-post-${id}`);
    if (!postCard) return;

    const entry = scheduledData.find(p => p.id === id);
    if (!entry) return;

    // Replace time display with a text input
    const timeDisplay = postCard.querySelector('.time-display');
    
    const scheduledDate = new Date(entry.scheduledTime);
    const year = scheduledDate.getFullYear();
    const month = (scheduledDate.getMonth() + 1).toString().padStart(2, '0');
    const day = scheduledDate.getDate().toString().padStart(2, '0');
    const hours = scheduledDate.getHours().toString().padStart(2, '0');
    const minutes = scheduledDate.getMinutes().toString().padStart(2, '0');
    const seconds = scheduledDate.getSeconds().toString().padStart(2, '0');
    const originalTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    timeDisplay.innerHTML = `<input type="text" value="${originalTimeString}" class="scheduled-time-input bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 text-xs w-full text-gray-800 dark:text-gray-200">`;

    // Replace message display with a textarea
    const messageDisplay = postCard.querySelector('.message-display');
    messageDisplay.innerHTML = `<div class="relative"><textarea class="scheduled-message-input bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 text-sm w-full h-24 text-gray-800 dark:text-gray-200 resize-none">${entry.message.trim()}</textarea><div class="scheduled-resize-handle absolute bottom-2 right-1 cursor-ns-resize z-10 text-gray-400 dark:text-gray-500"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L2 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 6L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12 10L10 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div></div>`;

    const textarea = messageDisplay.querySelector('.scheduled-message-input');
    const resizeHandle = messageDisplay.querySelector('.scheduled-resize-handle');
    makeResizable(textarea, resizeHandle);

    // Replace edit button with save button
    const editButton = postCard.querySelector('.edit-btn');
    editButton.innerHTML = `<i data-lucide="save" class="w-3.5 h-3.5"></i>`;
    editButton.title = 'Save Changes';
    editButton.onclick = () => window.saveScheduledPost(id);

    // Re-render Lucide icons
    if (window.lucide) {
        window.lucide.createIcons({ icons: window.lucideIcons });
    }
};

window.saveScheduledPost = async (id) => {
    const postCard = document.getElementById(`scheduled-post-${id}`);
    if (!postCard) return;

    const timeInput = postCard.querySelector('.scheduled-time-input');
    const messageInput = postCard.querySelector('.scheduled-message-input');

    const newScheduledTime = new Date(timeInput.value);
    const newMessage = messageInput.value;

    // Basic validation
    if (isNaN(newScheduledTime.getTime())) {
        window.showToast('Invalid date format. Please use a valid date string.', 'error');
        return;
    }

    if (!newMessage.trim()) {
        window.showToast('Message cannot be empty.', 'error');
        return;
    }

    await updateScheduledPost(id, {
        message: newMessage,
        scheduledTime: newScheduledTime.toISOString()
    });
};
