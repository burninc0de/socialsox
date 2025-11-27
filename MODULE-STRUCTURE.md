# Module Structure

## Visual Overview

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                         │
│                 (loads app.js as module)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                       app.js                            │
│              (389 lines - Coordinator)                  │
│  • Imports all modules                                  │
│  • Sets up event listeners                              │
│  • Main postToAll() function                            │
│  • Exposes functions globally for HTML                  │
└──────┬──────────────────────────────────────────────────┘
       │
       │  imports from
       │
       ▼
┌────────────────────────────────────────────────────────────┐
│                   src/modules/                             │
└────────────────────────────────────────────────────────────┘
       │
       ├─► storage.js (240 lines)
       │   ├─ saveCredentials()
       │   ├─ loadCredentials()
       │   ├─ exportCredentials()
       │   └─ importCredentials()
       │
       ├─► platforms.js (243 lines)
       │   ├─ postToMastodon()
       │   ├─ postToTwitter()
       │   └─ postToBluesky()
       │
       ├─► notifications.js (614 lines) ⭐ largest
       │   ├─ startNotificationPolling()
       │   ├─ loadNotifications()
       │   ├─ loadPlatformNotifications()
       │   ├─ fetchMastodonNotifications()
       │   ├─ fetchTwitterNotifications()
       │   ├─ fetchBlueskyNotifications()
       │   ├─ displayNotifications()
       │   ├─ markAsSeen()
       │   ├─ markAllAsRead()
       │   └─ clearNotificationsCache()
       │
       ├─► ui.js (83 lines)
       │   ├─ showStatus()
       │   ├─ showToast()
       │   ├─ updateCharCount()
       │   ├─ switchTab()
       │   └─ toggleCollapsible()
       │
       ├─► history.js (67 lines)
       │   ├─ loadHistory()
       │   ├─ saveHistory()
       │   ├─ addHistoryEntry()
       │   ├─ displayHistory()
       │   └─ clearHistory()
       │
       └─► imageUpload.js (86 lines)
           ├─ setupImageUpload()
           ├─ removeImage()
           └─ getSelectedImage()
```

## Module Responsibilities

### 🗄️ storage.js
**Purpose**: Handle all credential and settings persistence
- Encrypts sensitive credentials
- Migrates from old storage format
- Handles import/export functionality

### 🌐 platforms.js
**Purpose**: Social media platform posting logic
- Separate function for each platform
- Image upload handling per platform
- Rich text features (Bluesky facets, hashtags)

### 🔔 notifications.js
**Purpose**: Notification fetching, polling, and display
- Platform-specific fetch functions
- Automatic polling with configurable intervals
- Notification caching and management
- Rich notification display with context

### 🎨 ui.js
**Purpose**: UI helper functions
- Status and toast messages
- Character counting
- Tab switching
- Collapsible sections

### 📜 history.js
**Purpose**: Posting history management
- localStorage-based history
- Display formatting
- History limit (100 entries)

### 🖼️ imageUpload.js
**Purpose**: Image handling
- Drag-and-drop support
- Clipboard paste support
- Image validation and preview
- File size checking

## Data Flow Example: Posting to Platforms

```
User clicks "Post" button
      │
      ▼
app.js: postToAll()
      │
      ├─► imageUpload.js: getSelectedImage()
      │
      ├─► platforms.js: postToMastodon()
      ├─► platforms.js: postToTwitter()
      ├─► platforms.js: postToBluesky()
      │
      ├─► ui.js: showStatus()
      │
      └─► history.js: addHistoryEntry()
```

## Benefits of This Structure

### Before (Monolithic)
```
app.js (1,827 lines)
└─ All code in one file
   ├─ Hard to find specific functions
   ├─ Merge conflicts likely
   └─ Difficult to test in isolation
```

### After (Modular)
```
app.js (389 lines) + 6 modules
└─ Organized by feature
   ├─ Easy to locate code
   ├─ Reduced merge conflicts
   ├─ Testable modules
   └─ Clear responsibilities
```

## Key Design Decisions

1. **ES6 Modules**: Used native JavaScript modules for clean imports/exports
2. **Global Functions**: Exposed necessary functions via `window` for HTML onclick handlers
3. **No Breaking Changes**: All functions maintain same signatures
4. **Single Responsibility**: Each module handles one specific concern
5. **Minimal Dependencies**: Modules are loosely coupled

