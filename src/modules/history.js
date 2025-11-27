// Posting history management

export function loadHistory() {
    const history = JSON.parse(localStorage.getItem('postingHistory') || '[]');
    displayHistory(history);
}

export function saveHistory(history) {
    localStorage.setItem('postingHistory', JSON.stringify(history));
}

export function clearHistory() {
    if (confirm('Are you sure you want to clear all posting history? This action cannot be undone.')) {
        localStorage.removeItem('postingHistory');
        displayHistory([]);
        window.showToast('Posting history cleared', 'success');
    }
}

export function addHistoryEntry(message, selectedPlatforms, results) {
    const history = JSON.parse(localStorage.getItem('postingHistory') || '[]');
    const entry = {
        timestamp: new Date().toISOString(),
        message: message,
        platforms: selectedPlatforms,
        results: results
    };
    history.unshift(entry);
    
    if (history.length > 100) {
        history.splice(100);
    }
    
    saveHistory(history);
    displayHistory(history);
}

export function displayHistory(history) {
    const historyList = document.getElementById('historyList');
    const noHistory = document.getElementById('noHistory');
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        noHistory.style.display = 'block';
        return;
    }
    
    noHistory.style.display = 'none';
    
    historyList.innerHTML = history.map(entry => {
        const date = new Date(entry.timestamp);
        const timeString = date.toLocaleString();
        const platformsString = entry.platforms.join(', ');
        const resultsString = entry.results.join('\n');
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
                    <span class="text-xs text-gray-600 dark:text-gray-300">${platformsString}</span>
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">${entry.message}</p>
                <div class="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">${resultsString}</div>
            </div>
        `;
    }).join('');
}
