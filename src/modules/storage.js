// Credentials and settings storage management

export async function saveCredentials() {
    const sensitiveCreds = {
        mastodonToken: document.getElementById('mastodon-token').value,
        twitterKey: document.getElementById('twitter-key').value,
        twitterSecret: document.getElementById('twitter-secret').value,
        twitterToken: document.getElementById('twitter-token').value,
        twitterTokenSecret: document.getElementById('twitter-token-secret').value,
        blueskyPassword: document.getElementById('bluesky-password').value
    };

    const settings = {
        mastodonInstance: document.getElementById('mastodon-instance').value,
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
        }
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
                        blueskyPassword: creds.blueskyPassword || ''
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
        document.getElementById('mastodon-token').value = sensitiveCreds.mastodonToken || '';
        document.getElementById('twitter-key').value = sensitiveCreds.twitterKey || '';
        document.getElementById('twitter-secret').value = sensitiveCreds.twitterSecret || '';
        document.getElementById('twitter-token').value = sensitiveCreds.twitterToken || '';
        document.getElementById('twitter-token-secret').value = sensitiveCreds.twitterTokenSecret || '';
        document.getElementById('bluesky-handle').value = settings.blueskyHandle || '';
        document.getElementById('bluesky-password').value = sensitiveCreds.blueskyPassword || '';
        
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
        
        document.querySelectorAll('.platform-toggle').forEach(btn => {
            const platform = btn.dataset.platform;
            const isActive = window.platforms[platform];
            btn.classList.toggle('active', isActive);
            if (isActive) {
                btn.classList.remove('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                btn.classList.add('border-primary-500', 'bg-primary-500', 'text-white');
            } else {
                btn.classList.add('border-gray-300', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-700', 'text-gray-800', 'dark:text-gray-200');
                btn.classList.remove('border-primary-500', 'bg-primary-500', 'text-white');
            }
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
            mastodonToken: document.getElementById('mastodon-token').value,
            twitterKey: document.getElementById('twitter-key').value,
            twitterSecret: document.getElementById('twitter-secret').value,
            twitterToken: document.getElementById('twitter-token').value,
            twitterTokenSecret: document.getElementById('twitter-token-secret').value,
            blueskyHandle: document.getElementById('bluesky-handle').value,
            blueskyPassword: document.getElementById('bluesky-password').value
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
                document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                document.getElementById('twitter-key').value = creds.twitterKey || '';
                document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                document.getElementById('twitter-token').value = creds.twitterToken || '';
                document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                
                await saveCredentials();
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
                        document.getElementById('mastodon-token').value = creds.mastodonToken || '';
                        document.getElementById('twitter-key').value = creds.twitterKey || '';
                        document.getElementById('twitter-secret').value = creds.twitterSecret || '';
                        document.getElementById('twitter-token').value = creds.twitterToken || '';
                        document.getElementById('twitter-token-secret').value = creds.twitterTokenSecret || '';
                        document.getElementById('bluesky-handle').value = creds.blueskyHandle || '';
                        document.getElementById('bluesky-password').value = creds.blueskyPassword || '';
                        
                        await saveCredentials();
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
