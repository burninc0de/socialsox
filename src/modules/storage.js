// Credentials and settings storage management

const DEFAULT_AI_PROMPT = "Rewrite this message to fit in about 300 characters. DO NOT change the tone or voice. Trim if necessary. Suggest relevant hashtags if we have space.";

export async function saveCredentials() {
    const sensitiveCreds = {
        mastodonToken: document.getElementById('mastodon-token').value,
        twitterKey: document.getElementById('twitter-key').value,
        twitterSecret: document.getElementById('twitter-secret').value,
        twitterToken: document.getElementById('twitter-token').value,
        twitterTokenSecret: document.getElementById('twitter-token-secret').value,
        blueskyPassword: document.getElementById('bluesky-password').value,
        grokApiKey: document.getElementById('grok-api-key').value
    };

    const settings = {
        mastodonInstance: document.getElementById('mastodon-instance').value,
        // Comma-separated list of language codes for home feed filtering (empty = no filter)
        homeLanguagePreferences: (document.getElementById('home-language-preferences')?.value || '').trim(),
        blueskyHandle: document.getElementById('bluesky-handle').value,
        platforms: { ...window.platforms },
        pollingIntervals: {
            mastodon: parseInt(document.getElementById('mastodonInterval').value) || 5,
            twitter: parseInt(document.getElementById('twitterInterval').value) || 60,
            bluesky: parseInt(document.getElementById('blueskyInterval').value) || 5
        },
        notificationExclusions: {
            mastodon: document.getElementById('excludeMastodonNotifications').checked,
            twitter: document.getElementById('excludeTwitterNotifications').checked,
            bluesky: document.getElementById('excludeBlueskyNotifications').checked
        },
        windowControlsStyle: document.getElementById('windowControlsStyle').value || 'macos-circles',
        aiOptimizationEnabled: document.getElementById('aiOptimizationToggle').checked,
        aiSelectedPromptId: localStorage.getItem('socialSoxSelectedPromptId') || 'default'
    };

    try {
        const encrypted = await window.electron.encryptCredentials(JSON.stringify(sensitiveCreds));
        localStorage.setItem('socialSoxEncryptedCredentials', encrypted);
    } catch (error) {
        console.error('Failed to encrypt credentials:', error);
        localStorage.setItem('socialSoxCredentials', JSON.stringify({ ...sensitiveCreds, ...settings }));
        return;
    }

    localStorage.setItem('socialSoxSettings', JSON.stringify(settings));
}

export async function loadCredentials() {
    try {
        let sensitiveCreds = {};
        let settings = {};

        const encrypted = localStorage.getItem('socialSoxEncryptedCredentials');
        if (encrypted) {
            try {
                const decrypted = await window.electron.decryptCredentials(encrypted);
                sensitiveCreds = JSON.parse(decrypted);
            } catch (error) {
                console.error('Failed to parse old credentials:', error);
                localStorage.removeItem('socialSoxEncryptedCredentials');
                window.showStatus?.('Corrupted encrypted credentials cleared. Please re-enter your credentials.', 'info');
            }
        }

        const settingsSaved = localStorage.getItem('socialSoxSettings');
        if (settingsSaved) {
            try {
                settings = JSON.parse(settingsSaved);
            } catch (error) {
                console.error('Failed to parse settings:', error);
                localStorage.removeItem('socialSoxSettings');
            }
        }

        if (!encrypted && !settingsSaved) {
            const saved = localStorage.getItem('socialSoxCredentials');
            if (saved) {
                try {
                    const creds = JSON.parse(saved);
                    sensitiveCreds = {
                        mastodonToken: creds.mastodonToken || '',
                        twitterKey: creds.twitterKey || '',
                        twitterSecret: creds.twitterSecret || '',
                        twitterToken: creds.twitterToken || '',
                        twitterTokenSecret: creds.twitterTokenSecret || '',
                        blueskyPassword: creds.blueskyPassword || '',
                        grokApiKey: creds.grokApiKey || ''
                    };
                    settings = {
                        mastodonInstance: creds.mastodonInstance || '',
                        blueskyHandle: creds.blueskyHandle || '',
                        platforms: creds.platforms || {},
                        pollingIntervals: creds.pollingIntervals || {},
                        notificationExclusions: creds.notificationExclusions || {}
                    };
                    await saveCredentials();
                } catch (error) {
                    console.error('Failed to parse old credentials:', error);
                    localStorage.removeItem('socialSoxCredentials');
                    window.showStatus?.('Corrupted credentials cleared. Please re-enter your credentials.', 'info');
                }
            }
        }

        document.getElementById('mastodon-instance').value = settings.mastodonInstance || '';
        // Load home language preferences (empty = no filter)
        if (typeof document.getElementById('home-language-preferences') !== 'undefined' && document.getElementById('home-language-preferences')) {
            document.getElementById('home-language-preferences').value = settings.homeLanguagePreferences || '';
        }
        document.getElementById('mastodon-token').value = sensitiveCreds.mastodonToken || '';
        document.getElementById('twitter-key').value = sensitiveCreds.twitterKey || '';
        document.getElementById('twitter-secret').value = sensitiveCreds.twitterSecret || '';
        document.getElementById('twitter-token').value = sensitiveCreds.twitterToken || '';
        document.getElementById('twitter-token-secret').value = sensitiveCreds.twitterTokenSecret || '';
        document.getElementById('bluesky-handle').value = settings.blueskyHandle || '';
        document.getElementById('bluesky-password').value = sensitiveCreds.blueskyPassword || '';
        document.getElementById('grok-api-key').value = sensitiveCreds.grokApiKey || '';
        
        if (settings.platforms) {
            Object.assign(window.platforms, settings.platforms);
        }
        
        if (settings.pollingIntervals) {
            document.getElementById('mastodonInterval').value = settings.pollingIntervals.mastodon || 5;
            document.getElementById('mastodonIntervalValue').textContent = settings.pollingIntervals.mastodon || 5;
            document.getElementById('twitterInterval').value = settings.pollingIntervals.twitter || 60;
            document.getElementById('twitterIntervalValue').textContent = settings.pollingIntervals.twitter || 60;
            document.getElementById('blueskyInterval').value = settings.pollingIntervals.bluesky || 5;
            document.getElementById('blueskyIntervalValue').textContent = settings.pollingIntervals.bluesky || 5;
        } else {
            document.getElementById('mastodonInterval').value = 5;
            document.getElementById('mastodonIntervalValue').textContent = 5;
            document.getElementById('twitterInterval').value = 60;
            document.getElementById('twitterIntervalValue').textContent = 60;
            document.getElementById('blueskyInterval').value = 5;
            document.getElementById('blueskyIntervalValue').textContent = 5;
        }
        
        if (settings.notificationExclusions) {
            document.getElementById('excludeMastodonNotifications').checked = settings.notificationExclusions.mastodon || false;
            document.getElementById('excludeTwitterNotifications').checked = settings.notificationExclusions.twitter || false;
            document.getElementById('excludeBlueskyNotifications').checked = settings.notificationExclusions.bluesky || false;
        }
        
        if (settings.windowControlsStyle) {
            document.getElementById('windowControlsStyle').value = settings.windowControlsStyle;
        } else {
            document.getElementById('windowControlsStyle').value = 'macos-circles';
        }
        
        // Apply window controls style
        updateWindowControlsStyle(settings.windowControlsStyle || 'macos-circles');
        
        // Load AI optimization settings
        const aiOptimizationEnabled = settings.aiOptimizationEnabled || false;
        document.getElementById('aiOptimizationToggle').checked = aiOptimizationEnabled;
        document.getElementById('aiApiKeySection').style.display = aiOptimizationEnabled ? 'block' : 'none';
        document.getElementById('optimizeBtn').style.display = aiOptimizationEnabled ? 'block' : 'none';
        document.getElementById('cropBtn').style.display = aiOptimizationEnabled ? 'block' : 'none';
        document.getElementById('hashtagBtn').style.display = aiOptimizationEnabled ? 'block' : 'none';
        document.getElementById('grammarBtn').style.display = aiOptimizationEnabled ? 'block' : 'none';
        document.getElementById('aiPromptSelectContainer').style.display = aiOptimizationEnabled ? 'block' : 'none';
        
        // Load selected prompt ID
        const selectedPromptId = settings.aiSelectedPromptId || 'default';
        localStorage.setItem('socialSoxSelectedPromptId', selectedPromptId);
        
        // Update prompt select (this will be called after DOM is ready)
        setTimeout(() => {
            if (window.updatePromptSelect) {
                window.updatePromptSelect(selectedPromptId);
            }
        }, 100);
        
        document.querySelectorAll('.platform-toggle').forEach(btn => {
            const platform = btn.dataset.platform;
            const isActive = window.platforms[platform];
            btn.classList.toggle('active', isActive);
        });
    } catch (error) {
        console.error('Error loading credentials from localStorage:', error);
        window.showStatus?.('Error loading saved credentials. Storage may be corrupted. Try "Reset All Data" in Settings.', 'error');
    }
}

export async function exportCredentials() {
    try {
            const creds = {
            mastodonInstance: document.getElementById('mastodon-instance').value,
            homeLanguagePreferences: (document.getElementById('home-language-preferences')?.value || '').trim(),
            mastodonToken: document.getElementById('mastodon-token').value,
            twitterKey: document.getElementById('twitter-key').value,
            twitterSecret: document.getElementById('twitter-secret').value,
            twitterToken: document.getElementById('twitter-token').value,
            twitterTokenSecret: document.getElementById('twitter-token-secret').value,
            blueskyHandle: document.getElementById('bluesky-handle').value,
            blueskyPassword: document.getElementById('bluesky-password').value,
            grokApiKey: document.getElementById('grok-api-key').value,
            aiOptimizationEnabled: document.getElementById('aiOptimizationToggle').checked,
            aiSelectedPromptId: localStorage.getItem('socialSoxSelectedPromptId') || 'default',
            aiCustomPrompts: localStorage.getItem('socialSoxCustomPrompts') || '{}'
        };

        if (window.electron && window.electron.exportCredentials) {
            const result = await window.electron.exportCredentials(creds);
            if (result.success) {
                window.showStatus('Credentials exported successfully!', 'success');
            } else if (!result.canceled) {
                window.showStatus('Failed to export credentials: ' + result.error, 'error');
            }
        } else {
            const dataStr = JSON.stringify(creds, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'socialsox-credentials.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            window.showStatus('Credentials exported to download!', 'success');
        }
    } catch (error) {
        window.showStatus('Export failed: ' + error.message, 'error');
    }
}

export async function importCredentials() {
    try {
        if (window.electron && window.electron.importCredentials) {
            const result = await window.electron.importCredentials();
            if (result.success && result.credentials) {
                const creds = result.credentials;
                        document.getElementById('mastodon-instance').value = creds.mastodonInstance || '';
                        if (document.getElementById('home-language-preferences')) {
                            document.getElementById('home-language-preferences').value = creds.homeLanguagePreferences || '';
                        }
                document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                document.getElementById('twitter-key').value = creds.twitterKey || '';
                document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                document.getElementById('twitter-token').value = creds.twitterToken || '';
                document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                document.getElementById('grok-api-key').value = creds.grokApiKey || '';
                document.getElementById('aiOptimizationToggle').checked = creds.aiOptimizationEnabled || false;
                document.getElementById('aiApiKeySection').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                document.getElementById('optimizeBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                document.getElementById('cropBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                document.getElementById('hashtagBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                document.getElementById('grammarBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                document.getElementById('aiPromptSelectContainer').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                
                // Import custom prompts
                if (creds.aiCustomPrompts) {
                    localStorage.setItem('socialSoxCustomPrompts', creds.aiCustomPrompts);
                }
                
                // Import selected prompt ID
                if (creds.aiSelectedPromptId) {
                    localStorage.setItem('socialSoxSelectedPromptId', creds.aiSelectedPromptId);
                }
                
                await saveCredentials();
                
                // Update prompt select to show imported prompts
                if (window.updatePromptSelect) {
                    window.updatePromptSelect(creds.aiSelectedPromptId || 'default');
                }
                
                window.showStatus('Credentials imported successfully!', 'success');
            } else if (!result.canceled) {
                window.showStatus('Failed to import credentials: ' + result.error, 'error');
            }
        } else {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await file.text();
                        const creds = JSON.parse(text);
                        
                        document.getElementById('mastodon-instance').value = creds.mastodonInstance || '';
                        if (document.getElementById('home-language-preferences')) {
                            document.getElementById('home-language-preferences').value = creds.homeLanguagePreferences || 'en';
                        }
                        document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                        document.getElementById('twitter-key').value = creds.twitterKey || '';
                        document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                        document.getElementById('twitter-token').value = creds.twitterToken || '';
                        document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                        document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                        document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                        document.getElementById('grok-api-key').value = creds.grokApiKey || '';
                        document.getElementById('aiOptimizationToggle').checked = creds.aiOptimizationEnabled || false;
                        document.getElementById('aiApiKeySection').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        document.getElementById('optimizeBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        document.getElementById('cropBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        document.getElementById('hashtagBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        document.getElementById('grammarBtn').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        document.getElementById('aiPromptSelectContainer').style.display = (creds.aiOptimizationEnabled || false) ? 'block' : 'none';
                        
                        // Import custom prompts
                        if (creds.aiCustomPrompts) {
                            localStorage.setItem('socialSoxCustomPrompts', creds.aiCustomPrompts);
                        }
                        
                        // Import selected prompt ID
                        if (creds.aiSelectedPromptId) {
                            localStorage.setItem('socialSoxSelectedPromptId', creds.aiSelectedPromptId);
                        }
                        
                        await saveCredentials();
                        
                        // Update prompt select to show imported prompts
                        if (window.updatePromptSelect) {
                            window.updatePromptSelect(creds.aiSelectedPromptId || 'default');
                        }
                        
                        window.showStatus('Credentials imported successfully!', 'success');
                    } catch (error) {
                        window.showStatus('Failed to parse credentials file: ' + error.message, 'error');
                    }
                }
            };
            input.click();
        }
    } catch (error) {
        window.showStatus('Import failed: ' + error.message, 'error');
    }
}

export function updateWindowControlsStyle(style) {
    const controlsContainer = document.querySelector('.window-controls');
    if (!controlsContainer) return;
    
    controlsContainer.innerHTML = '';
    
    if (style === 'lucide-icons') {
        // VSCode-style icon buttons
        controlsContainer.className = 'window-controls flex h-full';

        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'w-10 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400';
        minimizeBtn.onclick = () => window.electron.minimizeWindow();
        minimizeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 6H11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

        const maximizeBtn = document.createElement('button');
        maximizeBtn.className = 'w-10 h-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-gray-600 dark:text-gray-400';
        maximizeBtn.onclick = () => window.electron.maximizeWindow();
        maximizeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="9" height="9" stroke="currentColor" stroke-width="1.2"/></svg>';

        const closeBtn = document.createElement('button');
        closeBtn.className = 'w-10 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-gray-600 dark:text-gray-400';
        closeBtn.onclick = () => window.electron.closeWindow();
        closeBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
        
        controlsContainer.appendChild(minimizeBtn);
        controlsContainer.appendChild(maximizeBtn);
        controlsContainer.appendChild(closeBtn);
    } else {
        // Default macOS circles
        controlsContainer.className = 'window-controls flex gap-2.5';
        
        const minimizeBtn = document.createElement('button');
        minimizeBtn.className = 'w-3 h-3 rounded-full bg-yellow-400 hover:opacity-70 transition-opacity';
        minimizeBtn.onclick = () => window.electron.minimizeWindow();
        
        const maximizeBtn = document.createElement('button');
        maximizeBtn.className = 'w-3 h-3 rounded-full bg-green-500 hover:opacity-70 transition-opacity';
        maximizeBtn.onclick = () => window.electron.maximizeWindow();
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'w-3 h-3 rounded-full bg-red-500 hover:opacity-70 transition-opacity';
        closeBtn.onclick = () => window.electron.closeWindow();
        
        controlsContainer.appendChild(minimizeBtn);
        controlsContainer.appendChild(maximizeBtn);
        controlsContainer.appendChild(closeBtn);
    }
    
    // Re-create Lucide icons if available
    if (typeof lucide !== 'undefined' && typeof window.lucideIcons !== 'undefined') {
        lucide.createIcons({icons: window.lucideIcons});
    }
    // Remove title bar right padding for compact (basic) controls so they sit
    // flush with the window edge. Restore to default for other styles.
    const titleBar = document.querySelector('.title-bar');
    if (titleBar) {
        if (style === 'lucide-icons') {
            titleBar.style.paddingRight = '0';
        } else {
            titleBar.style.paddingRight = '';
        }
    }
}
