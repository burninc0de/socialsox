# SocialSox Sync Test Suite

Comprehensive test suite for the sync logic in SocialSox.

## Core Principle

**The sync directory is the SINGLE SOURCE OF TRUTH**

All sync logic revolves around this principle. Remote (sync directory) data takes precedence over local data when conflicts occur.

## Running Tests

```bash
# Run all tests
npm test

# Watch mode (requires nodemon)
npm run test:watch
```

## Test Coverage

### Basic Sync Operations
- ✓ Creating remote files from local on first sync
- ✓ Pulling remote data to local on first sync  
- ✓ Merging local and remote items without duplicates

### Remote as Source of Truth
- ✓ Preferring remote data when same ID exists in both
- ✓ Removing items from local that were deleted from remote

### Deletion Tracking
- ✓ Tracking local deletion and propagating to remote
- ✓ Merging deletions from multiple machines
- ✓ Preventing deleted items from reappearing

### Multi-Machine Scenarios
- ✓ Handling two machines adding different items
- ✓ Handling Machine A deleting, Machine B syncing
- ✓ Handling simultaneous additions and deletions

### Edge Cases
- ✓ Handling empty local and remote
- ✓ Handling corrupted remote file gracefully
- ✓ Maintaining sort order after sync
- ✓ Deduplicating items with same ID

### Deletion Tracking File Sync
- ✓ Creating deleted-ids.json in sync dir if missing
- ✓ Merging deleted-ids.json from both locations

## Test Architecture

The test suite uses a custom minimal test runner (`test-runner.js`) that provides:
- `describe()` - Test suite grouping
- `it()` - Individual test cases
- `beforeEach()` - Setup before each test
- `afterEach()` - Cleanup after each test

Tests use temporary directories in the OS temp folder to avoid polluting the workspace.

## Sync Logic Overview

### Data Flow

```
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   Machine A  │        │  Sync Dir    │        │   Machine B  │
│   (Local)    │◄──────►│ (Source of   │◄──────►│   (Local)    │
│              │  Sync  │   Truth)     │  Sync  │              │
└──────────────┘        └──────────────┘        └──────────────┘
```

### Files Synced

1. **history.json** - Posting history (ID: timestamp)
2. **schedule.json** - Scheduled posts (ID: id)
3. **notifications.json** - Notifications (ID: id)
4. **deleted-ids.json** - Deletion tracking (merged from all machines)
5. **dismissed-ids.json** - Dismissed notification tracking (merged from all machines)

### Sync Algorithm

1. Read local and remote `deleted-ids.json`
2. Read local and remote `dismissed-ids.json`
3. **Merge deletions and dismissals** from both locations
4. For each data file:
   - Read remote data (source of truth)
   - Read local data
   - Filter out deleted items from both
   - Find local-only items (not in remote)
   - Merge: `remote + local-only`
   - **For notifications**: Apply dismissed status from merged dismissed IDs
   - Sort consistently
   - Write to both locations
5. Save merged `deleted-ids.json` to both locations
6. Save merged `dismissed-ids.json` to both locations

### Deletion Tracking

When an item is deleted:
1. Item ID added to local `deleted-ids.json`
2. On next sync:
   - Deletion merged with remote `deleted-ids.json`
   - Item filtered out from all data files
   - All machines eventually see the deletion

### Dismissed Notification Tracking

When a notification is marked as read/dismissed:
1. Notification ID added to local `dismissed-ids.json`
2. On next sync:
   - Dismissal merged with remote `dismissed-ids.json`
   - Dismissed status applied to notification in all data files
   - Notification **remains in file** for stats tracking
   - All machines see the notification as read/dismissed

### Conflict Resolution

When same ID exists in both local and remote with different data:
- **Remote wins** (source of truth principle)
- Local version is overwritten

This ensures consistency across all machines.

## Adding New Tests

```javascript
describe('My New Test Suite', () => {
    beforeEach(async () => {
        // Setup code
    });

    afterEach(async () => {
        // Cleanup code
    });

    it('should do something specific', async () => {
        // Arrange
        const data = setupTestData();
        
        // Act
        await performSync();
        
        // Assert
        assert.strictEqual(result, expected);
    });
});
```

## Test Philosophy

Tests validate:
1. **Correctness**: Does sync produce the right result?
2. **Consistency**: Do all machines end up with same data?
3. **Resilience**: Does it handle edge cases and errors?
4. **Principle adherence**: Is remote truly the source of truth?

Each test is independent and uses isolated temporary directories.
