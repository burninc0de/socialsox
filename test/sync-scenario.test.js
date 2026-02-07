const fs = require('fs').promises;
const path = require('path');
const assert = require('assert');
const os = require('os');

// Import test runner
const testRunner = require('./test-runner');
global.describe = testRunner.describe;
global.it = testRunner.it;
global.beforeEach = testRunner.beforeEach;
global.afterEach = testRunner.afterEach;

// Test: "Whatever state Machine A has, Machine B gets after sync"

describe('Real World Sync Scenario', () => {
    let testDir;
    let machineALocal, machineBLocal, syncDir;
    let machineAPaths, machineBPaths, syncPaths;

    async function setupMachine(machineDir) {
        return {
            history: path.join(machineDir, 'history.json'),
            schedule: path.join(machineDir, 'schedule.json'),
            notifications: path.join(machineDir, 'notifications.json'),
            deletedIds: path.join(machineDir, 'deleted-ids.json')
        };
    }

    async function syncMachine(machinePaths) {
        const files = [
            { local: machinePaths.history, remote: syncPaths.history, idField: 'timestamp', sortField: 'timestamp', deletedKey: 'history' },
            { local: machinePaths.schedule, remote: syncPaths.schedule, idField: 'id', sortField: 'scheduledTime', deletedKey: 'scheduled' },
            { local: machinePaths.notifications, remote: syncPaths.notifications, idField: 'id', sortField: 'timestamp', deletedKey: 'notifications' }
        ];

        // Read local deleted IDs
        let localDeletedIds = { history: [], notifications: [], scheduled: [] };
        try {
            localDeletedIds = JSON.parse(await fs.readFile(machinePaths.deletedIds, 'utf8'));
        } catch (e) {}

        // Read remote deleted IDs
        let remoteDeletedIds = { history: [], notifications: [], scheduled: [] };
        try {
            remoteDeletedIds = JSON.parse(await fs.readFile(syncPaths.deletedIds, 'utf8'));
        } catch (e) {}

        // Merge deletions
        const mergedDeletedIds = {
            history: [...new Set([...(localDeletedIds.history || []), ...(remoteDeletedIds.history || [])])],
            notifications: [...new Set([...(localDeletedIds.notifications || []), ...(remoteDeletedIds.notifications || [])])],
            scheduled: [...new Set([...(localDeletedIds.scheduled || []), ...(remoteDeletedIds.scheduled || [])])]
        };

        for (const file of files) {
            let remoteData = [];
            try { remoteData = JSON.parse(await fs.readFile(file.remote, 'utf8')); } catch (e) {}

            let localData = [];
            try { localData = JSON.parse(await fs.readFile(file.local, 'utf8')); } catch (e) {}

            const deleted = new Set(mergedDeletedIds[file.deletedKey] || []);
            remoteData = remoteData.filter(item => !deleted.has(String(item[file.idField])));
            localData = localData.filter(item => !deleted.has(String(item[file.idField])));

            const remoteIds = new Set(remoteData.map(item => item[file.idField]));
            const localOnlyItems = localData.filter(item => !remoteIds.has(item[file.idField]));

            const mergedData = [...remoteData, ...localOnlyItems];
            mergedData.sort((a, b) => {
                const aVal = a[file.sortField], bVal = b[file.sortField];
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            });

            await fs.writeFile(file.local, JSON.stringify(mergedData, null, 2));
            await fs.writeFile(file.remote, JSON.stringify(mergedData, null, 2));
        }

        const mergedDeletedContent = JSON.stringify(mergedDeletedIds, null, 2);
        await fs.writeFile(machinePaths.deletedIds, mergedDeletedContent);
        await fs.writeFile(syncPaths.deletedIds, mergedDeletedContent);
    }

    async function deleteItem(machinePaths, type, id) {
        let deletedIds = { history: [], notifications: [], scheduled: [] };
        try {
            deletedIds = JSON.parse(await fs.readFile(machinePaths.deletedIds, 'utf8'));
        } catch (e) {}
        
        if (!deletedIds[type]) deletedIds[type] = [];
        const idString = String(id);
        if (!deletedIds[type].includes(idString)) {
            deletedIds[type].push(idString);
            await fs.writeFile(machinePaths.deletedIds, JSON.stringify(deletedIds, null, 2));
        }
    }

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'socialsox-scenario-'));
        machineALocal = path.join(testDir, 'machineA');
        machineBLocal = path.join(testDir, 'machineB');
        syncDir = path.join(testDir, 'sync');

        await fs.mkdir(machineALocal, { recursive: true });
        await fs.mkdir(machineBLocal, { recursive: true });
        await fs.mkdir(syncDir, { recursive: true });

        machineAPaths = await setupMachine(machineALocal);
        machineBPaths = await setupMachine(machineBLocal);
        syncPaths = await setupMachine(syncDir);
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    it('Machine B gets exact state from Machine A after sync (including deletions)', async () => {
        console.log('\n  📝 Starting scenario...\n');

        // ====== INITIAL STATE ======
        console.log('  Step 1: Both machines start with same data');
        const initialSchedule = [
            { id: 'post1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Christmas post', platforms: ['mastodon'] },
            { id: 'post2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Boxing day post', platforms: ['twitter'] },
            { id: 'post3', scheduledTime: '2024-12-27T10:00:00Z', message: 'Post-holiday post', platforms: ['bluesky'] }
        ];
        const initialHistory = [
            { timestamp: '2024-12-01T10:00:00Z', message: 'Old post 1', platforms: ['mastodon'], results: [] },
            { timestamp: '2024-12-02T10:00:00Z', message: 'Old post 2', platforms: ['twitter'], results: [] }
        ];

        await fs.writeFile(machineAPaths.schedule, JSON.stringify(initialSchedule, null, 2));
        await fs.writeFile(machineBPaths.schedule, JSON.stringify(initialSchedule, null, 2));
        await fs.writeFile(machineAPaths.history, JSON.stringify(initialHistory, null, 2));
        await fs.writeFile(machineBPaths.history, JSON.stringify(initialHistory, null, 2));

        console.log('    Machine A: 3 scheduled, 2 history');
        console.log('    Machine B: 3 scheduled, 2 history\n');

        // ====== MACHINE A MAKES CHANGES ======
        console.log('  Step 2: Machine A deletes post1 and post2 from schedule');
        await deleteItem(machineAPaths, 'scheduled', 'post1');
        await deleteItem(machineAPaths, 'scheduled', 'post2');
        
        // Update Machine A's schedule file (simulating user deletion)
        const machineASchedule = initialSchedule.filter(p => p.id !== 'post1' && p.id !== 'post2');
        await fs.writeFile(machineAPaths.schedule, JSON.stringify(machineASchedule, null, 2));

        console.log('  Step 3: Machine A adds new history entry');
        const updatedHistory = [...initialHistory, {
            timestamp: '2024-12-03T10:00:00Z',
            message: 'New post from Machine A',
            platforms: ['mastodon', 'twitter'],
            results: []
        }];
        await fs.writeFile(machineAPaths.history, JSON.stringify(updatedHistory, null, 2));

        console.log('    Machine A now has: 1 scheduled, 3 history');
        console.log('    Machine B still has: 3 scheduled, 2 history\n');

        // ====== MACHINE A SYNCS ======
        console.log('  Step 4: Machine A syncs to cloud');
        await syncMachine(machineAPaths);
        console.log('    ✓ Sync complete\n');

        // ====== VERIFY SYNC DIR ======
        const syncSchedule = JSON.parse(await fs.readFile(syncPaths.schedule, 'utf8'));
        const syncHistory = JSON.parse(await fs.readFile(syncPaths.history, 'utf8'));
        const syncDeleted = JSON.parse(await fs.readFile(syncPaths.deletedIds, 'utf8'));

        console.log('  Step 5: Verify sync directory state');
        console.log(`    Sync dir has: ${syncSchedule.length} scheduled, ${syncHistory.length} history`);
        console.log(`    Deletions tracked: ${syncDeleted.scheduled.join(', ')}\n`);

        assert.strictEqual(syncSchedule.length, 1);
        assert.strictEqual(syncSchedule[0].id, 'post3');
        assert.strictEqual(syncHistory.length, 3);
        assert(syncDeleted.scheduled.includes('post1'));
        assert(syncDeleted.scheduled.includes('post2'));

        // ====== MACHINE B SYNCS ======
        console.log('  Step 6: Machine B syncs from cloud');
        await syncMachine(machineBPaths);
        console.log('    ✓ Sync complete\n');

        // ====== VERIFY MACHINE B MATCHES MACHINE A ======
        const machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        const machineBHistory = JSON.parse(await fs.readFile(machineBPaths.history, 'utf8'));
        const machineBDeleted = JSON.parse(await fs.readFile(machineBPaths.deletedIds, 'utf8'));

        console.log('  Step 7: Verify Machine B has exact state from Machine A');
        console.log(`    Machine B now has: ${machineBSchedule.length} scheduled, ${machineBHistory.length} history`);
        console.log(`    Machine B deletions: ${machineBDeleted.scheduled.join(', ')}\n`);

        // Assert Machine B matches Machine A exactly
        assert.strictEqual(machineBSchedule.length, 1, 'Machine B should have 1 scheduled post');
        assert.strictEqual(machineBSchedule[0].id, 'post3', 'Machine B should only have post3');
        assert.strictEqual(machineBHistory.length, 3, 'Machine B should have 3 history entries');
        assert(machineBHistory.some(h => h.timestamp === '2024-12-03T10:00:00Z'), 'Machine B should have new history from A');
        assert(machineBDeleted.scheduled.includes('post1'), 'Machine B should know post1 was deleted');
        assert(machineBDeleted.scheduled.includes('post2'), 'Machine B should know post2 was deleted');

        console.log('  ✅ SUCCESS: Machine B has exact state from Machine A (including deletions)!\n');
        console.log('  Summary:');
        console.log('    • post1 and post2: Deleted on Machine A → Deleted on Machine B ✓');
        console.log('    • post3: Kept on Machine A → Kept on Machine B ✓');
        console.log('    • New history: Added on Machine A → Added on Machine B ✓');
    });
});

if (require.main === module) {
    testRunner.run();
}
