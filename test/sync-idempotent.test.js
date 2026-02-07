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

// Test: Multiple syncs in a row should be idempotent (safe)

describe('Idempotent Sync Behavior', () => {
    let testDir, machineALocal, machineBLocal, syncDir;
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

        let localDeletedIds = { history: [], notifications: [], scheduled: [] };
        try { localDeletedIds = JSON.parse(await fs.readFile(machinePaths.deletedIds, 'utf8')); } catch (e) {}

        let remoteDeletedIds = { history: [], notifications: [], scheduled: [] };
        try { remoteDeletedIds = JSON.parse(await fs.readFile(syncPaths.deletedIds, 'utf8')); } catch (e) {}

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
        try { deletedIds = JSON.parse(await fs.readFile(machinePaths.deletedIds, 'utf8')); } catch (e) {}
        
        if (!deletedIds[type]) deletedIds[type] = [];
        const idString = String(id);
        if (!deletedIds[type].includes(idString)) {
            deletedIds[type].push(idString);
            await fs.writeFile(machinePaths.deletedIds, JSON.stringify(deletedIds, null, 2));
        }
    }

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'socialsox-idempotent-'));
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

    it('Running sync multiple times should not corrupt data', async () => {
        console.log('\n  📝 Starting idempotency test...\n');

        // Setup initial state
        const initialSchedule = [
            { id: 'post1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
            { id: 'post2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] }
        ];

        await fs.writeFile(machineAPaths.schedule, JSON.stringify(initialSchedule, null, 2));
        await fs.writeFile(machineBPaths.schedule, JSON.stringify(initialSchedule, null, 2));

        console.log('  Step 1: Initial state - both machines have 2 scheduled posts\n');

        // Machine A deletes post1
        await deleteItem(machineAPaths, 'scheduled', 'post1');
        const updatedSchedule = initialSchedule.filter(p => p.id !== 'post1');
        await fs.writeFile(machineAPaths.schedule, JSON.stringify(updatedSchedule, null, 2));

        console.log('  Step 2: Machine A deletes post1');
        console.log('    Machine A: 1 scheduled post (post2)');
        console.log('    Machine B: 2 scheduled posts (post1, post2)\n');

        // Machine A syncs
        await syncMachine(machineAPaths);
        console.log('  Step 3: Machine A syncs to cloud ✓');
        
        let syncSchedule = JSON.parse(await fs.readFile(syncPaths.schedule, 'utf8'));
        console.log(`    Cloud now has: ${syncSchedule.length} scheduled post(s)\n`);

        // Machine B syncs FIRST TIME - gets the deletion
        console.log('  Step 4: Machine B syncs (1st time) - cloud has new data');
        await syncMachine(machineBPaths);
        
        let machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        console.log(`    Machine B now has: ${machineBSchedule.length} scheduled post(s) ✓\n`);
        
        assert.strictEqual(machineBSchedule.length, 1, 'After first sync, Machine B should have 1 post');
        assert.strictEqual(machineBSchedule[0].id, 'post2');

        // IMPORTANT: Machine B syncs AGAIN immediately (user clicks sync button again)
        console.log('  Step 5: Machine B syncs AGAIN (2nd time) - testing idempotency');
        await syncMachine(machineBPaths);
        
        machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        syncSchedule = JSON.parse(await fs.readFile(syncPaths.schedule, 'utf8'));
        console.log(`    Machine B still has: ${machineBSchedule.length} scheduled post(s) ✓`);
        console.log(`    Cloud still has: ${syncSchedule.length} scheduled post(s) ✓\n`);

        assert.strictEqual(machineBSchedule.length, 1, 'After second sync, Machine B should still have 1 post');
        assert.strictEqual(machineBSchedule[0].id, 'post2', 'Should still be post2');
        assert.strictEqual(syncSchedule.length, 1, 'Cloud should still have 1 post');

        // Machine B syncs a THIRD time
        console.log('  Step 6: Machine B syncs THIRD time - still safe');
        await syncMachine(machineBPaths);
        
        machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        console.log(`    Machine B still has: ${machineBSchedule.length} scheduled post(s) ✓\n`);

        assert.strictEqual(machineBSchedule.length, 1, 'After third sync, Machine B should still have 1 post');

        console.log('  ✅ SUCCESS: Multiple syncs are safe and idempotent!\n');
        console.log('  Summary:');
        console.log('    • Sync 1: Pulled deletion from cloud ✓');
        console.log('    • Sync 2: No corruption, data unchanged ✓');
        console.log('    • Sync 3: Still safe, no data loss ✓');
    });

    it('Machine B syncing before cloud update, then again after update', async () => {
        console.log('\n  📝 Testing sync timing scenario...\n');

        const initialSchedule = [
            { id: 'post1', scheduledTime: '2024-12-25T10:00:00Z', message: 'Post 1', platforms: ['mastodon'] },
            { id: 'post2', scheduledTime: '2024-12-26T10:00:00Z', message: 'Post 2', platforms: ['twitter'] },
            { id: 'post3', scheduledTime: '2024-12-27T10:00:00Z', message: 'Post 3', platforms: ['bluesky'] }
        ];

        await fs.writeFile(machineAPaths.schedule, JSON.stringify(initialSchedule, null, 2));
        await fs.writeFile(machineBPaths.schedule, JSON.stringify(initialSchedule, null, 2));
        
        // Initially sync to populate cloud
        await syncMachine(machineAPaths);

        console.log('  Step 1: Both machines and cloud have 3 scheduled posts\n');

        // Machine A makes changes locally but DOESN'T sync yet
        console.log('  Step 2: Machine A deletes post1 and post2 (but NOT synced yet)');
        await deleteItem(machineAPaths, 'scheduled', 'post1');
        await deleteItem(machineAPaths, 'scheduled', 'post2');
        const updatedSchedule = initialSchedule.filter(p => p.id !== 'post1' && p.id !== 'post2');
        await fs.writeFile(machineAPaths.schedule, JSON.stringify(updatedSchedule, null, 2));
        console.log('    Machine A: 1 scheduled post (locally)');
        console.log('    Cloud: Still has 3 scheduled posts (not updated yet)\n');

        // Machine B syncs - cloud doesn't have new data yet
        console.log('  Step 3: Machine B syncs (cloud still has old data)');
        await syncMachine(machineBPaths);
        
        let machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        console.log(`    Machine B has: ${machineBSchedule.length} scheduled posts (unchanged) ✓\n`);
        
        assert.strictEqual(machineBSchedule.length, 3, 'Machine B should still have all 3 posts');

        // Now Machine A syncs
        console.log('  Step 4: Machine A finally syncs to cloud');
        await syncMachine(machineAPaths);
        
        let syncSchedule = JSON.parse(await fs.readFile(syncPaths.schedule, 'utf8'));
        console.log(`    Cloud now has: ${syncSchedule.length} scheduled post(s) (updated!) ✓\n`);
        
        assert.strictEqual(syncSchedule.length, 1, 'Cloud should now have 1 post');

        // Machine B syncs AGAIN - now cloud has the new data
        console.log('  Step 5: Machine B syncs again (cloud now has new data)');
        await syncMachine(machineBPaths);
        
        machineBSchedule = JSON.parse(await fs.readFile(machineBPaths.schedule, 'utf8'));
        console.log(`    Machine B now has: ${machineBSchedule.length} scheduled post(s) (synced!) ✓\n`);
        
        assert.strictEqual(machineBSchedule.length, 1, 'Machine B should now have 1 post');
        assert.strictEqual(machineBSchedule[0].id, 'post3');

        console.log('  ✅ SUCCESS: Syncing before and after cloud update works correctly!\n');
        console.log('  Summary:');
        console.log('    • First sync: Cloud had old data, no changes made ✓');
        console.log('    • Machine A synced: Cloud updated ✓');
        console.log('    • Second sync: Machine B got latest changes ✓');
    });
});

if (require.main === module) {
    testRunner.run();
}
