const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');
const os = require('os');

// Import test runner first and set up globals
const testRunner = require('./test-runner');
global.describe = testRunner.describe;
global.it = testRunner.it;
global.beforeEach = testRunner.beforeEach;
global.afterEach = testRunner.afterEach;

// Test suite for sync logic
// Core principle: Sync directory is the SINGLE SOURCE OF TRUTH

describe('Sync Logic Tests', () => {
    let testDir;
    let localDir;
    let syncDir;
    let historyPath;
    let schedulePath;
    let notificationsPath;
    let deletedIdsPath;
    let remoteHistoryPath;
    let remoteSchedulePath;
    let remoteNotificationsPath;
    let remoteDeletedIdsPath;

    // Mock sync function that mirrors main.js logic
    async function performSync() {
        const files = [
            {
                local: historyPath,
                remote: remoteHistoryPath,
                idField: 'timestamp',
                sortField: 'timestamp',
                deletedKey: 'history'
            },
            {
                local: schedulePath,
                remote: remoteSchedulePath,
                idField: 'id',
                sortField: 'scheduledTime',
                deletedKey: 'scheduled'
            },
            {
                local: notificationsPath,
                remote: remoteNotificationsPath,
                idField: 'id',
                sortField: 'timestamp',
                deletedKey: 'notifications'
            }
        ];

        // Read local deleted IDs tracker
        let localDeletedIds = {};
        try {
            const deletedContent = await fs.readFile(deletedIdsPath, 'utf8');
            localDeletedIds = JSON.parse(deletedContent);
        } catch (error) {
            localDeletedIds = { history: [], notifications: [], scheduled: [] };
        }

        // Read remote deleted IDs tracker
        let remoteDeletedIds = {};
        try {
            const deletedContent = await fs.readFile(remoteDeletedIdsPath, 'utf8');
            remoteDeletedIds = JSON.parse(deletedContent);
        } catch (error) {
            remoteDeletedIds = { history: [], notifications: [], scheduled: [] };
        }

        // Merge deleted IDs from both local and remote
        const mergedDeletedIds = {
            history: [...new Set([...(localDeletedIds.history || []), ...(remoteDeletedIds.history || [])])],
            notifications: [...new Set([...(localDeletedIds.notifications || []), ...(remoteDeletedIds.notifications || [])])],
            scheduled: [...new Set([...(localDeletedIds.scheduled || []), ...(remoteDeletedIds.scheduled || [])])]
        };

        for (const file of files) {
            // Read remote file (upstream source of truth)
            let remoteData = [];
            try {
                const remoteContent = await fs.readFile(file.remote, 'utf8');
                remoteData = JSON.parse(remoteContent);
            } catch (error) {
                // Remote doesn't exist or is invalid
            }

            // Read local file
            let localData = [];
            try {
                const localContent = await fs.readFile(file.local, 'utf8');
                localData = JSON.parse(localContent);
            } catch (error) {
                // Local doesn't exist or is invalid
            }

            // Get deleted IDs for this file type (from merged deletions)
            const deleted = new Set(mergedDeletedIds[file.deletedKey] || []);

            // Filter out deleted items from both remote and local
            remoteData = remoteData.filter(item => !deleted.has(String(item[file.idField])));
            localData = localData.filter(item => !deleted.has(String(item[file.idField])));

            // Merge: Remote is source of truth, but we add local items not in remote
            const remoteIds = new Set(remoteData.map(item => item[file.idField]));
            const localOnlyItems = localData.filter(item => !remoteIds.has(item[file.idField]));

            // Combine: all remote items + local items not in remote
            const mergedData = [...remoteData, ...localOnlyItems];

            // Sort by appropriate field for consistent ordering
            mergedData.sort((a, b) => {
                const aVal = a[file.sortField];
                const bVal = b[file.sortField];
                if (aVal < bVal) return -1;
                if (aVal > bVal) return 1;
                return 0;
            });

            // Write merged data to both locations
            const mergedContent = JSON.stringify(mergedData, null, 2);
            await fs.writeFile(file.local, mergedContent);
            await fs.writeFile(file.remote, mergedContent);
        }

        // Save merged deleted IDs tracker to BOTH local and remote
        const mergedDeletedContent = JSON.stringify(mergedDeletedIds, null, 2);
        await fs.writeFile(deletedIdsPath, mergedDeletedContent);
        await fs.writeFile(remoteDeletedIdsPath, mergedDeletedContent);
    }

    async function trackDeletedId(type, id) {
        let deletedIds = { history: [], notifications: [], scheduled: [] };
        try {
            const content = await fs.readFile(deletedIdsPath, 'utf8');
            deletedIds = JSON.parse(content);
        } catch (error) {
            // File doesn't exist, use defaults
        }

        if (!deletedIds[type]) {
            deletedIds[type] = [];
        }

        const idString = String(id);
        if (!deletedIds[type].includes(idString)) {
            deletedIds[type].push(idString);
            await fs.writeFile(deletedIdsPath, JSON.stringify(deletedIds, null, 2));
        }
    }

    beforeEach(async () => {
        // Create temporary test directories
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'socialsox-test-'));
        localDir = path.join(testDir, 'local');
        syncDir = path.join(testDir, 'sync');

        await fs.mkdir(localDir, { recursive: true });
        await fs.mkdir(syncDir, { recursive: true });

        historyPath = path.join(localDir, 'history.json');
        schedulePath = path.join(localDir, 'schedule.json');
        notificationsPath = path.join(localDir, 'notifications.json');
        deletedIdsPath = path.join(localDir, 'deleted-ids.json');

        remoteHistoryPath = path.join(syncDir, 'history.json');
        remoteSchedulePath = path.join(syncDir, 'schedule.json');
        remoteNotificationsPath = path.join(syncDir, 'notifications.json');
        remoteDeletedIdsPath = path.join(syncDir, 'deleted-ids.json');
    });

    afterEach(async () => {
        // Clean up test directories
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('Basic Sync Operations', () => {
        it('should create remote files from local on first sync', async () => {
            // Setup: Local has data, remote is empty
            const localHistory = [
                { timestamp: '2024-01-01T10:00:00Z', message: 'Test post 1', platforms: ['mastodon'] }
            ];
            await fs.writeFile(historyPath, JSON.stringify(localHistory, null, 2));

            // Perform sync
            await performSync();

            // Verify: Remote now has the data
            const remoteContent = await fs.readFile(remoteHistoryPath, 'utf8');
            const remoteData = JSON.parse(remoteContent);
            assert.strictEqual(remoteData.length, 1);
            assert.strictEqual(remoteData[0].message, 'Test post 1');
        });

        it('should pull remote data to local on first sync', async () => {
            // Setup: Remote has data, local is empty
            const remoteScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Christmas post', platforms: ['twitter'] }
            ];
            await fs.writeFile(remoteSchedulePath, JSON.stringify(remoteScheduled, null, 2));

            // Perform sync
            await performSync();

            // Verify: Local now has the data
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].id, 'sch1');
        });

        it('should merge local and remote items without duplicates', async () => {
            // Setup: Both have different items
            const localHistory = [
                { timestamp: '2024-01-01T10:00:00Z', message: 'Local post', platforms: ['mastodon'] }
            ];
            const remoteHistory = [
                { timestamp: '2024-01-02T10:00:00Z', message: 'Remote post', platforms: ['twitter'] }
            ];
            await fs.writeFile(historyPath, JSON.stringify(localHistory, null, 2));
            await fs.writeFile(remoteHistoryPath, JSON.stringify(remoteHistory, null, 2));

            // Perform sync
            await performSync();

            // Verify: Both have all items
            const localContent = await fs.readFile(historyPath, 'utf8');
            const localData = JSON.parse(localContent);
            const remoteContent = await fs.readFile(remoteHistoryPath, 'utf8');
            const remoteData = JSON.parse(remoteContent);

            assert.strictEqual(localData.length, 2);
            assert.strictEqual(remoteData.length, 2);
            assert.deepStrictEqual(localData, remoteData);
        });
    });

    describe('Remote as Source of Truth', () => {
        it('should prefer remote data when same ID exists in both', async () => {
            // Setup: Same ID, different content
            const localScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Local version', platforms: ['mastodon'] }
            ];
            const remoteScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Remote version', platforms: ['twitter'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(localScheduled, null, 2));
            await fs.writeFile(remoteSchedulePath, JSON.stringify(remoteScheduled, null, 2));

            // Perform sync
            await performSync();

            // Verify: Remote version wins (source of truth)
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].message, 'Remote version');
            assert.deepStrictEqual(localData[0].platforms, ['twitter']);
        });

        it('should remove items from local that were deleted from remote', async () => {
            // Setup: Local has item that remote doesn't
            const localScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Should be removed', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Should stay', platforms: ['twitter'] }
            ];
            const remoteScheduled = [
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Should stay', platforms: ['twitter'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(localScheduled, null, 2));
            await fs.writeFile(remoteSchedulePath, JSON.stringify(remoteScheduled, null, 2));

            // Mark sch1 as deleted in remote
            await fs.writeFile(remoteDeletedIdsPath, JSON.stringify({ history: [], notifications: [], scheduled: ['sch1'] }, null, 2));

            // Perform sync
            await performSync();

            // Verify: sch1 is gone from local
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].id, 'sch2');
        });
    });

    describe('Deletion Tracking', () => {
        it('should track local deletion and propagate to remote', async () => {
            // Setup: Both have the same items
            const scheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(scheduled, null, 2));
            await fs.writeFile(remoteSchedulePath, JSON.stringify(scheduled, null, 2));

            // User deletes sch1 locally
            await trackDeletedId('scheduled', 'sch1');

            // Perform sync
            await performSync();

            // Verify: sch1 is gone from both local and remote
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            const remoteContent = await fs.readFile(remoteSchedulePath, 'utf8');
            const remoteData = JSON.parse(remoteContent);

            assert.strictEqual(localData.length, 1);
            assert.strictEqual(remoteData.length, 1);
            assert.strictEqual(localData[0].id, 'sch2');
            assert.strictEqual(remoteData[0].id, 'sch2');

            // Verify: deletion is tracked in remote deleted-ids
            const remoteDeletedContent = await fs.readFile(remoteDeletedIdsPath, 'utf8');
            const remoteDeleted = JSON.parse(remoteDeletedContent);
            assert(remoteDeleted.scheduled.includes('sch1'));
        });

        it('should merge deletions from multiple machines', async () => {
            // Setup: Machine A deleted item1, Machine B deleted item2
            const initialScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] },
                { id: 'sch3', scheduledTime: '2024-12-27T10:00:00Z', message: 'Post 3', platforms: ['bluesky'] }
            ];
            await fs.writeFile(remoteSchedulePath, JSON.stringify(initialScheduled, null, 2));

            // Machine A deleted sch1
            await fs.writeFile(remoteDeletedIdsPath, JSON.stringify({ history: [], notifications: [], scheduled: ['sch1'] }, null, 2));

            // Machine B (local) has all three and deletes sch2
            await fs.writeFile(schedulePath, JSON.stringify(initialScheduled, null, 2));
            await trackDeletedId('scheduled', 'sch2');

            // Perform sync
            await performSync();

            // Verify: Both deletions are respected
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].id, 'sch3');

            // Verify: Both deletions tracked in merged deleted-ids
            const localDeletedContent = await fs.readFile(deletedIdsPath, 'utf8');
            const localDeleted = JSON.parse(localDeletedContent);
            assert(localDeleted.scheduled.includes('sch1'));
            assert(localDeleted.scheduled.includes('sch2'));
        });

        it('should prevent deleted items from reappearing', async () => {
            // Setup: Item was deleted and sync happened
            const remoteScheduled = [
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] }
            ];
            await fs.writeFile(remoteSchedulePath, JSON.stringify(remoteScheduled, null, 2));
            await fs.writeFile(remoteDeletedIdsPath, JSON.stringify({ history: [], notifications: [], scheduled: ['sch1'] }, null, 2));

            // Machine B still has the deleted item locally
            const localScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Should not come back', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(localScheduled, null, 2));

            // Perform sync
            await performSync();

            // Verify: sch1 does NOT reappear in remote
            const remoteContent = await fs.readFile(remoteSchedulePath, 'utf8');
            const remoteData = JSON.parse(remoteContent);
            assert.strictEqual(remoteData.length, 1);
            assert.strictEqual(remoteData[0].id, 'sch2');

            // Verify: sch1 is removed from local
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].id, 'sch2');
        });
    });

    describe('Multi-Machine Scenarios', () => {
        it('should handle two machines adding different items', async () => {
            // Setup: Remote (Machine A) has item1
            const remoteHistory = [
                { timestamp: '2024-01-01T10:00:00Z', message: 'Machine A post', platforms: ['mastodon'], results: [] }
            ];
            await fs.writeFile(remoteHistoryPath, JSON.stringify(remoteHistory, null, 2));

            // Local (Machine B) has item2
            const localHistory = [
                { timestamp: '2024-01-02T10:00:00Z', message: 'Machine B post', platforms: ['twitter'], results: [] }
            ];
            await fs.writeFile(historyPath, JSON.stringify(localHistory, null, 2));

            // Machine B syncs
            await performSync();

            // Verify: Both machines end up with both items
            const localContent = await fs.readFile(historyPath, 'utf8');
            const localData = JSON.parse(localContent);
            const remoteContent = await fs.readFile(remoteHistoryPath, 'utf8');
            const remoteData = JSON.parse(remoteContent);

            assert.strictEqual(localData.length, 2);
            assert.strictEqual(remoteData.length, 2);
            assert.deepStrictEqual(localData, remoteData);
        });

        it('should handle Machine A deleting, Machine B syncing', async () => {
            // Setup: Both machines start with same data
            const initialScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] }
            ];
            await fs.writeFile(remoteSchedulePath, JSON.stringify(initialScheduled, null, 2));
            await fs.writeFile(schedulePath, JSON.stringify(initialScheduled, null, 2));

            // Machine A deletes sch1 and syncs (simulated by updating remote)
            await fs.writeFile(remoteSchedulePath, JSON.stringify([initialScheduled[1]], null, 2));
            await fs.writeFile(remoteDeletedIdsPath, JSON.stringify({ history: [], notifications: [], scheduled: ['sch1'] }, null, 2));

            // Machine B syncs
            await performSync();

            // Verify: Machine B now sees the deletion
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
            assert.strictEqual(localData[0].id, 'sch2');
        });

        it('should handle simultaneous additions and deletions', async () => {
            // Setup: Remote has items 1,2,3
            const remoteScheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] },
                { id: 'sch3', scheduledTime: '2024-12-27T10:00:00Z', message: 'Post 3', platforms: ['bluesky'] }
            ];
            await fs.writeFile(remoteSchedulePath, JSON.stringify(remoteScheduled, null, 2));

            // Local has items 2,3,4 (deleted 1, added 4)
            const localScheduled = [
                { id: 'sch2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] },
                { id: 'sch3', scheduledTime: '2024-12-27T10:00:00Z', message: 'Post 3', platforms: ['bluesky'] },
                { id: 'sch4', scheduledTime: '2024-12-28T10:00:00Z', message: 'Post 4', platforms: ['mastodon'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(localScheduled, null, 2));
            await trackDeletedId('scheduled', 'sch1');

            // Perform sync
            await performSync();

            // Verify: Result is 2,3,4 (1 deleted, 4 added)
            const finalContent = await fs.readFile(schedulePath, 'utf8');
            const finalData = JSON.parse(finalContent);
            assert.strictEqual(finalData.length, 3);
            
            const ids = finalData.map(item => item.id).sort();
            assert.deepStrictEqual(ids, ['sch2', 'sch3', 'sch4']);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty local and remote', async () => {
            // Perform sync with no data
            await performSync();

            // Verify: Empty arrays created
            const localContent = await fs.readFile(historyPath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 0);
        });

        it('should handle corrupted remote file gracefully', async () => {
            // Setup: Valid local, corrupted remote
            const localHistory = [
                { timestamp: '2024-01-01T10:00:00Z', message: 'Local post', platforms: ['mastodon'], results: [] }
            ];
            await fs.writeFile(historyPath, JSON.stringify(localHistory, null, 2));
            await fs.writeFile(remoteHistoryPath, 'corrupted json{{{');

            // Perform sync (should not throw)
            await performSync();

            // Verify: Remote is fixed with local data
            const remoteContent = await fs.readFile(remoteHistoryPath, 'utf8');
            const remoteData = JSON.parse(remoteContent);
            assert.strictEqual(remoteData.length, 1);
        });

        it('should maintain sort order after sync', async () => {
            // Setup: Unsorted data
            const history = [
                { timestamp: '2024-01-03T10:00:00Z', message: 'Post 3', platforms: ['mastodon'], results: [] },
                { timestamp: '2024-01-01T10:00:00Z', message: 'Post 1', platforms: ['twitter'], results: [] },
                { timestamp: '2024-01-02T10:00:00Z', message: 'Post 2', platforms: ['bluesky'], results: [] }
            ];
            await fs.writeFile(historyPath, JSON.stringify(history, null, 2));

            // Perform sync
            await performSync();

            // Verify: Data is sorted
            const localContent = await fs.readFile(historyPath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData[0].message, 'Post 1');
            assert.strictEqual(localData[1].message, 'Post 2');
            assert.strictEqual(localData[2].message, 'Post 3');
        });

        it('should deduplicate items with same ID', async () => {
            // Setup: Same item in both local and remote
            const scheduled = [
                { id: 'sch1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] }
            ];
            await fs.writeFile(schedulePath, JSON.stringify(scheduled, null, 2));
            await fs.writeFile(remoteSchedulePath, JSON.stringify(scheduled, null, 2));

            // Perform sync
            await performSync();

            // Verify: No duplicates
            const localContent = await fs.readFile(schedulePath, 'utf8');
            const localData = JSON.parse(localContent);
            assert.strictEqual(localData.length, 1);
        });
    });

    describe('Deletion Tracking File Sync', () => {
        it('should create deleted-ids.json in sync dir if missing', async () => {
            // Setup: Only local has deletions
            await trackDeletedId('history', '2024-01-01T10:00:00Z');

            // Perform sync
            await performSync();

            // Verify: Remote deleted-ids.json exists
            const remoteDeletedContent = await fs.readFile(remoteDeletedIdsPath, 'utf8');
            const remoteDeleted = JSON.parse(remoteDeletedContent);
            assert(remoteDeleted.history.includes('2024-01-01T10:00:00Z'));
        });

        it('should merge deleted-ids.json from both locations', async () => {
            // Setup: Different deletions in each location
            await fs.writeFile(deletedIdsPath, JSON.stringify({ 
                history: ['ts1'], 
                notifications: [], 
                scheduled: [] 
            }, null, 2));
            
            await fs.writeFile(remoteDeletedIdsPath, JSON.stringify({ 
                history: ['ts2'], 
                notifications: ['n1'], 
                scheduled: [] 
            }, null, 2));

            // Perform sync
            await performSync();

            // Verify: Both locations have merged deletions
            const localDeletedContent = await fs.readFile(deletedIdsPath, 'utf8');
            const localDeleted = JSON.parse(localDeletedContent);
            
            assert(localDeleted.history.includes('ts1'));
            assert(localDeleted.history.includes('ts2'));
            assert(localDeleted.notifications.includes('n1'));

            const remoteDeletedContent = await fs.readFile(remoteDeletedIdsPath, 'utf8');
            const remoteDeleted = JSON.parse(remoteDeletedContent);
            assert.deepStrictEqual(localDeleted, remoteDeleted);
        });
    });
});

// Run tests
if (require.main === module) {
    testRunner.run();
}
