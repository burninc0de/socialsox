// Posting history management

let historyData = [];
let historyDisplayed = false;

export async function loadHistory() {
    try {
        historyData = await window.electron.readHistory();
    } catch (error) {
        console.error('Failed to load history:', error);
        historyData = [];
    }
}

export async function loadAndDisplayHistory() {
    await loadHistory();
    displayHistory(historyData);
}

export async function saveHistory(history) {
    try {
        await window.electron.writeHistory(history);
        // Trigger sync if enabled
        if (window.syncEnabled && window.syncDirPath) {
            try {
                await window.manualSync();
            } catch (syncError) {
                console.error('Failed to sync after saving history:', syncError);
            }
        }
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

export async function deleteHistoryEntry(timestamp) {
    try {
        const history = await window.electron.readHistory();
        const filteredHistory = history.filter(entry => entry.timestamp !== timestamp);
        await saveHistory(filteredHistory);
        displayHistory(filteredHistory);
        window.showToast('History entry deleted', 'success');
    } catch (error) {
        console.error('Failed to delete history entry:', error);
        window.showToast('Failed to delete history entry', 'error');
    }
}

export async function clearHistory() {
    if (confirm('Are you sure you want to clear all posting history? This action cannot be undone.')) {
        try {
            await window.electron.deleteHistory();
            displayHistory([]);
            window.showToast('Posting history cleared', 'success');
        } catch (error) {
            console.error('Failed to clear history:', error);
            window.showToast('Failed to clear history', 'error');
        }
    }
}

export async function addHistoryEntry(message, selectedPlatforms, results) {
    try {
        const history = await window.electron.readHistory();
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
        
        await saveHistory(history);
        displayHistory(history);
    } catch (error) {
        console.error('Failed to add history entry:', error);
    }
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
        
        // Build results display with links
        const resultsDisplay = entry.results.map(result => {
            if (result.success) {
                return `<a href="${result.url}" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">✓ ${result.platform}</a>`;
            } else {
                return `<span class="text-red-600 dark:text-red-400">✗ ${result.platform}: ${result.error}</span>`;
            }
        }).join('<br>');
        
        return `
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${timeString}</span>
                        <span class="text-xs text-gray-600 dark:text-gray-300">${platformsString}</span>
                    </div>
                    <button onclick="(async () => { await deleteHistoryEntry('${entry.timestamp}'); })(); event.stopPropagation();" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-sm leading-none w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" title="Delete entry">×</button>
                </div>
                <p class="text-sm text-gray-800 dark:text-gray-200 mb-2 whitespace-pre-wrap">${entry.message}</p>
                <div class="text-xs text-gray-600 dark:text-gray-400">${resultsDisplay}</div>
            </div>
        `;
    }).join('');
}
