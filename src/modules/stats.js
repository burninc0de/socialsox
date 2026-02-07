import { getPlatformIcons } from './icons.js';
// Stats and analytics module
import Chart from 'chart.js/auto';

let statsChart = null;

export function showStats() {
    const modal = document.getElementById('statsModal');
    modal.classList.remove('hidden');

    // Add click-outside-to-close functionality
    const handleClickOutside = (event) => {
        if (event.target === modal) {
            closeStatsModal();
        }
    };
    modal.addEventListener('click', handleClickOutside);
    
    // Store the event listener for cleanup
    modal._clickOutsideHandler = handleClickOutside;

    // Load history and notification data
    loadHistoryForStats().then(data => {
        const stats = calculateStats(data.history, data.notifications);
        renderStats(stats);
    });
}

export function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.add('hidden');

    // Remove click-outside event listener
    if (modal._clickOutsideHandler) {
        modal.removeEventListener('click', modal._clickOutsideHandler);
        delete modal._clickOutsideHandler;
    }

    // Destroy existing chart if it exists
    if (statsChart && typeof statsChart.destroy === 'function') {
        statsChart.destroy();
        statsChart = null;
    }
}

async function loadHistoryForStats() {
    try {
        const history = await window.electron.readHistory();
        const notifications = await window.electron.readNotifications();
        return { history, notifications };
    } catch (error) {
        console.error('Failed to load history for stats:', error);
        return { history: [], notifications: [] };
    }
}

function calculateStats(history, notifications) {
    const dailyStats = {};
    let totalPosts = 0;
    const platformCounts = { mastodon: 0, twitter: 0, bluesky: 0 };
    const hourlyStats = Array(24).fill(0);
    const weeklyStats = Array(7).fill(0);
    
    // Additional metrics
    let failedPosts = 0;
    let totalMessageLength = 0;
    let totalHashtags = 0;
    let totalImages = 0;
    let messagesWithLength = 0;

    // Notification stats
    let totalNotifications = 0;
    const notificationPlatformCounts = { mastodon: 0, twitter: 0, bluesky: 0 };
    const notificationTypeCounts = {};
    const notificationDailyStats = {};
    const notificationHourlyStats = Array(24).fill(0);
    const notificationWeeklyStats = Array(7).fill(0);

    history.forEach(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        const hour = date.getHours();
        const dayOfWeek = date.getDay(); // 0 = Sunday

        // Initialize daily stats for this date
        if (!dailyStats[dateStr]) {
            dailyStats[dateStr] = { mastodon: 0, twitter: 0, bluesky: 0 };
        }

        // Count only successful posts
        let hasSuccessfulPost = false;
        let entryHashtags = 0;
        let entryImages = 0;
        
        entry.results.forEach(result => {
            if (result.success) {
                const platformKey = result.platform.toLowerCase();
                if (platformCounts[platformKey] !== undefined) {
                    platformCounts[platformKey]++;
                    dailyStats[dateStr][platformKey]++;
                    hasSuccessfulPost = true;
                }
            } else {
                failedPosts++;
            }
        });

        // Count hashtags and images for successful posts
        if (hasSuccessfulPost) {
            // Count hashtags in message
            const hashtagMatches = entry.message.match(/#\w+/g);
            if (hashtagMatches) {
                entryHashtags = hashtagMatches.length;
            }
            
            // Count images (assuming images are stored in some way)
            // For now, we'll use a placeholder - this could be enhanced
            entryImages = 0; // TODO: implement image counting
            
            totalHashtags += entryHashtags;
            totalImages += entryImages;
            
            // Message length
            totalMessageLength += entry.message.length;
            messagesWithLength++;
        }

        // Only count this entry if it had at least one successful post
        if (hasSuccessfulPost) {
            totalPosts++;

            // Hourly and weekly stats only for successful posts
            hourlyStats[hour]++;
            weeklyStats[dayOfWeek]++;
        }
    });

    // Calculate averages
    const avgMessageLength = messagesWithLength > 0 ? Math.round(totalMessageLength / messagesWithLength) : 0;
    const avgHashtags = totalPosts > 0 ? (totalHashtags / totalPosts).toFixed(1) : 0;
    const successRate = (totalPosts + failedPosts) > 0 ? Math.round((totalPosts / (totalPosts + failedPosts)) * 100) : 100;

    // Sort dates
    const sortedDates = Object.keys(dailyStats).sort();

    // Find most active day
    let mostActiveDay = null;
    let maxPosts = 0;
    sortedDates.forEach(date => {
        const dayTotal = dailyStats[date].mastodon + dailyStats[date].twitter + dailyStats[date].bluesky;
        if (dayTotal > maxPosts) {
            maxPosts = dayTotal;
            mostActiveDay = date;
        }
    });

    // Process notifications
    notifications.forEach(notification => {
        totalNotifications++;
        
        // Platform counts
        const platformKey = notification.platform?.toLowerCase();
        if (platformKey && notificationPlatformCounts[platformKey] !== undefined) {
            notificationPlatformCounts[platformKey]++;
        }
        
        // Type counts
        const typeKey = notification.type || notification.reason;
        if (typeKey) {
            // Normalize notification types (case-insensitive mapping)
            let normalizedType = typeKey;
            const lowerType = typeKey.toLowerCase();
            
            if (lowerType === 'favourite' || lowerType === 'like') {
                normalizedType = 'Like';
            } else if (lowerType === 'repost' || lowerType === 'reblog') {
                normalizedType = 'Reblog';
            } else if (lowerType === 'reply' || lowerType === 'mention') {
                normalizedType = 'Mention';
            } else if (lowerType === 'follow') {
                normalizedType = 'Follow';
            } else if (lowerType === 'quote') {
                normalizedType = 'Quote';
            } else {
                // Keep original casing for other types
                normalizedType = typeKey.charAt(0).toUpperCase() + typeKey.slice(1).toLowerCase();
            }
            
            notificationTypeCounts[normalizedType] = (notificationTypeCounts[normalizedType] || 0) + 1;
        }
        
        // Time-based stats
        const notifDate = new Date(notification.timestamp);
        const notifDateStr = notifDate.toISOString().split('T')[0];
        const notifHour = notifDate.getHours();
        const notifDayOfWeek = notifDate.getDay();
        
        // Daily notification stats
        if (!notificationDailyStats[notifDateStr]) {
            notificationDailyStats[notifDateStr] = { mastodon: 0, twitter: 0, bluesky: 0 };
        }
        if (platformKey && notificationDailyStats[notifDateStr][platformKey] !== undefined) {
            notificationDailyStats[notifDateStr][platformKey]++;
        }
        
        // Hourly and weekly notification stats
        notificationHourlyStats[notifHour]++;
        notificationWeeklyStats[notifDayOfWeek]++;
    });

    // Sort notification dates
    const sortedNotificationDates = Object.keys(notificationDailyStats).sort();

    // Calculate average posts per day
    const totalDays = sortedDates.length;
    const avgPostsPerDay = totalDays > 0 ? (totalPosts / totalDays).toFixed(1) : 0;

    // Find most active hour
    let mostActiveHour = 0;
    let maxHourPosts = 0;
    hourlyStats.forEach((count, hour) => {
        if (count > maxHourPosts) {
            maxHourPosts = count;
            mostActiveHour = hour;
        }
    });

    // Calculate posting streak (consecutive days with posts)
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate = null;
    
    sortedDates.forEach(dateStr => {
        const date = new Date(dateStr);
        if (lastDate) {
            const diffDays = Math.round((date - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 1;
            }
        } else {
            currentStreak = 1;
        }
        lastDate = date;
    });
    longestStreak = Math.max(longestStreak, currentStreak);

    return {
        totalPosts,
        platformCounts,
        mostActiveDay,
        maxPosts,
        failedPosts,
        avgMessageLength,
        avgHashtags,
        successRate,
        avgPostsPerDay,
        mostActiveHour,
        longestStreak,
        totalDays,
        notifications: {
            total: totalNotifications,
            platformCounts: notificationPlatformCounts,
            typeCounts: notificationTypeCounts,
            daily: {
                dates: sortedNotificationDates,
                mastodon: sortedNotificationDates.map(date => notificationDailyStats[date]?.mastodon || 0),
                twitter: sortedNotificationDates.map(date => notificationDailyStats[date]?.twitter || 0),
                bluesky: sortedNotificationDates.map(date => notificationDailyStats[date]?.bluesky || 0)
            },
            hourly: notificationHourlyStats,
            weekly: notificationWeeklyStats
        },
        daily: {
            dates: sortedDates,
            mastodon: sortedDates.map(date => dailyStats[date].mastodon),
            twitter: sortedDates.map(date => dailyStats[date].twitter),
            bluesky: sortedDates.map(date => dailyStats[date].bluesky)
        },
        hourly: hourlyStats,
        weekly: weeklyStats
    };
}

async function renderStats(stats) {
    await renderSummaryStats(stats);
    await renderDailyChart(stats.daily);
    renderHourlyChart(stats.hourly);
    renderWeeklyChart(stats.weekly);
    renderNotificationsChart(stats.notifications);
}

async function renderSummaryStats(stats) {
    const summaryEl = document.getElementById('statsSummary');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const platformIcons = await getPlatformIcons();
    const mastodonIcon = platformIcons.mastodon;
    const twitterIcon = platformIcons.twitter;
    const blueskyIcon = platformIcons.bluesky;

    summaryEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">${stats.totalPosts}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="${mastodonIcon}" alt="Mastodon" class="w-5 h-5">
                    <span class="text-2xl font-bold text-indigo-600">${stats.platformCounts.mastodon}</span>
                </div>
                <div class="text-sm text-gray-700 dark:text-white font-medium">Mastodon</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="${twitterIcon}" alt="Twitter" class="w-5 h-5">
                    <span class="text-2xl font-bold text-blue-500">${stats.platformCounts.twitter}</span>
                </div>
                <div class="text-sm text-gray-700 dark:text-white font-medium">Twitter</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="${blueskyIcon}" alt="Bluesky" class="w-5 h-5">
                    <span class="text-2xl font-bold text-sky-500">${stats.platformCounts.bluesky}</span>
                </div>
                <div class="text-sm text-gray-700 dark:text-white font-medium">Bluesky</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">${stats.notifications.total}</div>
                <div class="text-sm text-gray-700 dark:text-white font-medium">Notifications</div>
            </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Most Active Day</div>
                <div class="text-lg font-bold text-primary-600 dark:text-primary-400">${stats.mostActiveDay ? new Date(stats.mostActiveDay).toLocaleDateString() : 'No data'}</div>
                <div class="text-xs text-gray-700 dark:text-white">${stats.maxPosts} posts</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Avg Posts/Day</div>
                <div class="text-lg font-bold text-green-600 dark:text-green-400">${stats.avgPostsPerDay}</div>
                <div class="text-xs text-gray-700 dark:text-white">over ${stats.totalDays} days</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Most Active Hour</div>
                <div class="text-lg font-bold text-orange-600 dark:text-orange-400">${stats.mostActiveHour}:00</div>
                <div class="text-xs text-gray-700 dark:text-white">${stats.hourly[stats.mostActiveHour]} posts</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Longest Streak</div>
                <div class="text-lg font-bold text-pink-600 dark:text-pink-400">${stats.longestStreak}</div>
                <div class="text-xs text-gray-700 dark:text-white">consecutive days</div>
            </div>
        </div>
    `;
}

async function renderDailyChart(dailyStats) {
    const ctx = document.getElementById('dailyChart').getContext('2d');

    if (statsChart) statsChart.destroy();

    if (dailyStats.dates.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }

    // Load images as data URLs
    const platformIcons = await getPlatformIcons();
    const mastodonDataUrl = platformIcons.mastodon;
    const twitterDataUrl = platformIcons.twitter;
    const blueskyDataUrl = platformIcons.bluesky;

    // Create image objects for platform SVGs
    const mastodonIcon = new Image();
    mastodonIcon.src = mastodonDataUrl;
    mastodonIcon.width = 16;
    mastodonIcon.height = 16;

    const twitterIcon = new Image();
    twitterIcon.src = twitterDataUrl;
    twitterIcon.width = 16;
    twitterIcon.height = 16;

    const blueskyIcon = new Image();
    blueskyIcon.src = blueskyDataUrl;
    blueskyIcon.width = 16;
    blueskyIcon.height = 16;

    // Wait for all images to load
    await Promise.all([
        new Promise((resolve) => { mastodonIcon.onload = resolve; }),
        new Promise((resolve) => { twitterIcon.onload = resolve; }),
        new Promise((resolve) => { blueskyIcon.onload = resolve; })
    ]);

    statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyStats.dates,
            datasets: [
                {
                    label: 'Mastodon',
                    data: dailyStats.mastodon,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointStyle: mastodonIcon
                },
                {
                    label: 'Twitter',
                    data: dailyStats.twitter,
                    borderColor: '#1da1f2',
                    backgroundColor: 'rgba(29, 161, 242, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointStyle: twitterIcon
                },
                {
                    label: 'Bluesky',
                    data: dailyStats.bluesky,
                    borderColor: '#0085ff',
                    backgroundColor: 'rgba(0, 133, 255, 0.1)',
                    tension: 0.4,
                    fill: false,
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointStyle: blueskyIcon
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        },
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                    borderColor: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Posts',
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function renderHourlyChart(hourlyStats) {
    const ctx = document.getElementById('hourlyChart').getContext('2d');

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: 24}, (_, i) => `${i}:00`),
            datasets: [{
                label: 'Posts',
                data: hourlyStats,
                backgroundColor: 'rgba(99, 102, 241, 0.6)',
                borderColor: '#6366f1',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    },
                    ticks: {
                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Posts',
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#6b7280'
                    },
                    grid: {
                        color: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function renderNotificationsChart(notifications) {
    const ctx = document.getElementById('metricsChart').getContext('2d');

    // Create data for notification types
    const typeLabels = Object.keys(notifications.typeCounts);
    const typeData = Object.values(notifications.typeCounts);

    // Color mapping for notification types
    const typeColors = {
        Mention: '#3b82f6',
        Reblog: '#22c55e',
        Like: '#ef4444',
        Follow: '#ec4899',
        Quote: '#64748b'
    };

    // Create display labels (map Reblog to Repost for better UX)
    const displayLabels = typeLabels.map(type => type === 'Reblog' ? 'Repost' : type);

    const backgroundColors = typeLabels.map(type => typeColors[type] || '#6b7280');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: displayLabels,
            datasets: [{
                data: typeData,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: document.documentElement.classList.contains('dark') ? '#374151' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((context.parsed / total) * 100);
                            return `${context.label}: ${context.parsed} (${percentage}%)`;
                        }
                    },
                    backgroundColor: document.documentElement.classList.contains('dark') ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                    bodyColor: document.documentElement.classList.contains('dark') ? '#fff' : '#000',
                    borderColor: document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }
            }
        }
    });
}

function renderWeeklyChart(weeklyStats) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: dayNames,
            datasets: [{
                data: weeklyStats,
                backgroundColor: [
                    '#ef4444', '#f97316', '#eab308', '#22c55e',
                    '#06b6d4', '#3b82f6', '#8b5cf6'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151'
                    }
                },
            }
        }
    });
}