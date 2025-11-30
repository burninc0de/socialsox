// Stats and analytics module

let statsChart = null;

export function showStats() {
    const modal = document.getElementById('statsModal');
    modal.classList.remove('hidden');

    // Load history data
    loadHistoryForStats().then(history => {
        const stats = calculateStats(history);
        renderStats(stats);
    });
}

export function closeStatsModal() {
    const modal = document.getElementById('statsModal');
    modal.classList.add('hidden');

    // Destroy existing chart if it exists
    if (statsChart && typeof statsChart.destroy === 'function') {
        statsChart.destroy();
        statsChart = null;
    }
}

async function loadHistoryForStats() {
    try {
        return await window.electron.readHistory();
    } catch (error) {
        console.error('Failed to load history for stats:', error);
        return [];
    }
}

function calculateStats(history) {
    const dailyStats = {};
    let totalPosts = 0;
    const platformCounts = { mastodon: 0, twitter: 0, bluesky: 0 };
    const hourlyStats = Array(24).fill(0);
    const weeklyStats = Array(7).fill(0);

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
        entry.results.forEach(result => {
            if (result.success) {
                const platformKey = result.platform.toLowerCase();
                if (platformCounts[platformKey] !== undefined) {
                    platformCounts[platformKey]++;
                    dailyStats[dateStr][platformKey]++;
                    hasSuccessfulPost = true;
                }
            }
        });

        // Only count this entry if it had at least one successful post
        if (hasSuccessfulPost) {
            totalPosts++;

            // Hourly and weekly stats only for successful posts
            hourlyStats[hour]++;
            weeklyStats[dayOfWeek]++;
        }
    });

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

    return {
        totalPosts,
        platformCounts,
        mostActiveDay,
        maxPosts,
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

function renderStats(stats) {
    renderSummaryStats(stats);
    renderDailyChart(stats.daily);
    renderHourlyChart(stats.hourly);
    renderWeeklyChart(stats.weekly);
}

function renderSummaryStats(stats) {
    const summaryEl = document.getElementById('statsSummary');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    summaryEl.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="text-2xl font-bold text-primary-600 dark:text-primary-400">${stats.totalPosts}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Total Posts</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="assets/masto.svg" alt="Mastodon" class="w-5 h-5">
                    <span class="text-2xl font-bold text-indigo-600">${stats.platformCounts.mastodon}</span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Mastodon</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="assets/twit.svg" alt="Twitter" class="w-5 h-5">
                    <span class="text-2xl font-bold text-blue-500">${stats.platformCounts.twitter}</span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Twitter</div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                <div class="flex items-center justify-center gap-2 mb-1">
                    <img src="assets/bsky.svg" alt="Bluesky" class="w-5 h-5">
                    <span class="text-2xl font-bold text-sky-500">${stats.platformCounts.bluesky}</span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">Bluesky</div>
            </div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Most Active Day</div>
            <div class="text-xl text-primary-600 dark:text-primary-400">${stats.mostActiveDay ? new Date(stats.mostActiveDay).toLocaleDateString() : 'No data'}</div>
            <div class="text-sm text-gray-600 dark:text-gray-400">${stats.maxPosts} posts</div>
        </div>
    `;
}

function renderDailyChart(dailyStats) {
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

    // Create image objects for platform SVGs
    const mastodonIcon = new Image();
    mastodonIcon.src = 'assets/masto.svg';
    mastodonIcon.width = 16;
    mastodonIcon.height = 16;

    const twitterIcon = new Image();
    twitterIcon.src = 'assets/twit.svg';
    twitterIcon.width = 16;
    twitterIcon.height = 16;

    const blueskyIcon = new Image();
    blueskyIcon.src = 'assets/bsky.svg';
    blueskyIcon.width = 16;
    blueskyIcon.height = 16;

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
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: document.body.classList.contains('dark') ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    titleColor: document.body.classList.contains('dark') ? '#fff' : '#000',
                    bodyColor: document.body.classList.contains('dark') ? '#fff' : '#000',
                    borderColor: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date',
                        color: document.body.classList.contains('dark') ? '#e5e7eb' : '#374151'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Posts',
                        color: document.body.classList.contains('dark') ? '#e5e7eb' : '#374151'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.body.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
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
                        color: document.body.classList.contains('dark') ? '#e5e7eb' : '#374151'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Posts',
                        color: document.body.classList.contains('dark') ? '#e5e7eb' : '#374151'
                    },
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                        color: document.body.classList.contains('dark') ? '#d1d5db' : '#6b7280'
                    },
                    grid: {
                        color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            }
        }
    });
}

function renderWeeklyChart(weeklyStats) {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
                    display: false
                }
            }
        }
    });
}