// UI helper functions

export function showStatus(message, type) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.className = 'mt-5 p-4 rounded-lg text-sm whitespace-pre-line block';
    
    if (type === 'success') {
        status.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-800', 'dark:text-green-200', 'border', 'border-green-300', 'dark:border-green-600');
        setTimeout(() => {
            status.classList.add('hidden');
        }, 5000);
    } else if (type === 'error') {
        status.classList.add('bg-red-100', 'dark:bg-red-900', 'text-red-800', 'dark:text-red-200', 'border', 'border-red-300', 'dark:border-red-600');
    } else if (type === 'info') {
        status.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-800', 'dark:text-blue-200', 'border', 'border-blue-300', 'dark:border-blue-600');
    }
}

export function showPlatformStatus(platform, message, type) {
    const platformStatuses = document.getElementById('platformStatuses');
    const statusElement = document.getElementById(`${platform.toLowerCase()}Status`);
    
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = 'p-3 rounded-lg text-sm block';
    
    if (type === 'success') {
        statusElement.classList.add('bg-green-100', 'dark:bg-green-900', 'text-green-800', 'dark:text-green-200', 'border', 'border-green-300', 'dark:border-green-600');
    } else if (type === 'error') {
        statusElement.classList.add('bg-red-100', 'dark:bg-red-900', 'text-red-800', 'dark:text-red-200', 'border', 'border-red-300', 'dark:border-red-600');
    } else if (type === 'info') {
        statusElement.classList.add('bg-blue-100', 'dark:bg-blue-900', 'text-blue-800', 'dark:text-blue-200', 'border', 'border-blue-300', 'dark:border-blue-600');
    }
    
    // Show the platform statuses container
    platformStatuses.classList.remove('hidden');
    statusElement.classList.remove('hidden');
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.classList.add('hidden');
            // Hide container if all statuses are hidden
            const allStatuses = platformStatuses.querySelectorAll('div[id$="Status"]');
            const visibleStatuses = Array.from(allStatuses).filter(s => !s.classList.contains('hidden'));
            if (visibleStatuses.length === 0) {
                platformStatuses.classList.add('hidden');
            }
        }, 5000);
    }
}

export function clearPlatformStatuses() {
    const platformStatuses = document.getElementById('platformStatuses');
    const allStatuses = platformStatuses.querySelectorAll('div[id$="Status"]');
    allStatuses.forEach(status => status.classList.add('hidden'));
    platformStatuses.classList.add('hidden');
}

export function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

export function updateCharCount() {
    const message = document.getElementById('message').value;
    const charCount = message.length;
    const graphemeCount = countGraphemes(message);
    const countEl = document.getElementById('charCount');
    
    // Get selected platforms
    const selectedPlatforms = Object.keys(window.platforms || {}).filter(p => window.platforms[p]);
    
    let warnings = [];
    let isOverLimit = false;
    
    if (selectedPlatforms.includes('twitter') && charCount > 280) {
        warnings.push('Twitter (280 chars)');
        isOverLimit = true;
    }
    
    if (selectedPlatforms.includes('bluesky') && graphemeCount > 300) {
        warnings.push('Bluesky (300 graphemes)');
        isOverLimit = true;
    }
    
    // For Mastodon, no strict limit, but show if over 500 for warning
    if (selectedPlatforms.includes('mastodon') && charCount > 500) {
        warnings.push('Mastodon (500+ chars)');
        isOverLimit = true;
    }
    
    countEl.className = 'text-right text-xs mb-5';
    
    if (isOverLimit) {
        if (charCount === graphemeCount) {
            countEl.textContent = `${charCount} characters - Over limit for: ${warnings.join(', ')}`;
        } else {
            countEl.textContent = `${charCount} chars / ${graphemeCount} graphemes - Over limit for: ${warnings.join(', ')}`;
        }
        countEl.classList.add('text-red-500');
    } else {
        if (charCount === graphemeCount) {
            countEl.textContent = `${charCount} characters`;
        } else {
            countEl.textContent = `${charCount} chars / ${graphemeCount} graphemes`;
        }
        countEl.classList.add('text-gray-500', 'dark:text-gray-400');
    }
}

function countGraphemes(str) {
    if (!str) return 0;
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(str)].length;
}

export function switchTab(tab) {
    // Save current tab to localStorage
    localStorage.setItem('socialSoxActiveTab', tab);
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('text-primary-600', 'dark:text-primary-400', 'border-primary-600', 'dark:border-primary-400');
        btn.classList.add('text-gray-500', 'dark:text-gray-400', 'border-transparent');
    });
    
    document.getElementById(tab + 'Content').classList.remove('hidden');
    
    document.getElementById(tab + 'Tab').classList.remove('text-gray-500', 'dark:text-gray-400', 'border-transparent');
    document.getElementById(tab + 'Tab').classList.add('text-primary-600', 'dark:text-primary-400', 'border-b-2', 'border-primary-600', 'dark:border-primary-400');
    
    // Load cached notifications when switching to notifications tab
    if (tab === 'notifications' && window.loadCachedNotifications) {
        window.loadCachedNotifications();
    }
    
    // Load and display history when switching to history tab
    if (tab === 'history' && window.loadAndDisplayHistory) {
        window.loadAndDisplayHistory();
    }
    
    // Load and display scheduled posts when switching to scheduled tab
    if (tab === 'scheduled' && window.loadAndDisplayScheduled) {
        window.loadAndDisplayScheduled();
    }
    
    // Clear status message when switching tabs
    const status = document.getElementById('status');
    status.classList.add('hidden');
}

export function toggleCollapsible() {
    const content = document.getElementById('credentials');
    const arrow = document.getElementById('arrow');
    
    if (content.style.maxHeight === '1000px') {
        content.style.maxHeight = '0';
        arrow.style.transform = 'rotate(0deg)';
    } else {
        content.style.maxHeight = '1000px';
        arrow.style.transform = 'rotate(180deg)';
    }
}
