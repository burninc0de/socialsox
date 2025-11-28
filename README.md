# <img src="appicon.png" alt="🧦" width="32" /> SocialSox

A simple, local Electron app for posting short messages to Mastodon, X (aka Twitter), and Bluesky simultaneously.

## Features

- 📝 Post to single or multiple platforms
- 🖥️ Cross-platform desktop app - no browser or server needed!
- 🎨 Clean, modern interface with native dark mode support
- 🖼️ Image upload support
- 📊 Character counter
- ✅ Per-platform status feedback
- 🔔 Get notifications on replies, likes, reposts
- 📜 Posting history with status tracking
- ⚙️ Customize tray icon, window decorations and more
- 🔒 Credentials securely encrypted using Electron's safeStorage
- 📥 Export/Import credentials for portability

## Screenshots

### Message Composition
![Compose a message with platform selection and character counter](screenshots/message-compose.png)

### Posting with Images
![Compose messages with image uploads](screenshots/message-with-image.png)

### Posting History
![View your posting history with status tracking](screenshots/history-tab.png)

### Settings & Credentials
![Configure API credentials and app settings](screenshots/settings-tab-2.png)

### Notifications
![Monitor notifications from connected platforms](screenshots/notifications-tab.png)

## Project Notes

> [!NOTE]
> **This is a small focused vanilla JavaScript project with Tailwind and Lucide Icons** built for a simple need. [Read the blog post about how and why I built it](https://andreklein.net/i-built-my-own-damn-crossposter-because-2025-social-media-is-a-fragmented-hellscape/). It may benefit from refactoring to React/TypeScript in the future.

> [!TIP]
> **Minimalist by design** - I have no plans to turn this into a super-app with endless features. For more advanced social media management tools, check out [Postiz](https://github.com/gitroomhq/postiz-app).

> [!IMPORTANT]
> **Current implementation details:**
> - Tailwind CSS and Lucide icons are bundled with the app
> - Only essential Lucide icons are imported to minimize bundle size
> - Tested on Linux (Arch CachyOS) and Windows 11
> - Mac builds need testing

## Project Structure

The application follows a modular architecture to keep code organized and maintainable. The core functionality is split into separate modules located in the `src/modules/` directory:

```
src/
├── modules/
│   ├── history.js          # Handles posting history and status tracking
│   ├── imageUpload.js      # Manages image upload functionality
│   ├── notifications.js    # Handles platform notifications
│   ├── platforms.js        # Contains platform-specific API integrations
│   ├── storage.js          # Manages secure credential storage
│   └── ui.js               # UI-related utilities and helpers
```

This modular approach allows for easy maintenance and future extensions.

## Quick Start

### Option 1: Run as Electron App (Recommended)

```bash
npm install
npm start
```

For development (with hot-reload):
```bash
# Terminal 1: Start Vite dev server
npm run dev

# Terminal 2: Launch Electron app
npm start
```

### Option 2: Build Distributable Packages

```bash
npm run build
```

This creates platform-specific packages in the `dist/` folder:
- **Linux**: `.AppImage` file
- **macOS**: `.dmg` file  
- **Windows**: `.exe` installer

## Setup

### Get Your API Credentials

#### Mastodon

1. Log in to your Mastodon instance (e.g., mastodon.social)
2. Go to Settings → Development → New Application
3. Give it a name (e.g., "SocialSox")
4. Select permissions: `read:notifications`, `write:media`, `write:statuses`
5. Click "Submit"
6. Copy your **instance URL** (just the domain like `https://mastodon.social`, NOT your profile URL)
7. Copy your **access token** from the application page

#### Bluesky

1. Log in to Bluesky
2. Go to Settings → App Passwords
3. Create a new app password
4. Use your handle (e.g., `username.bsky.social`) and the app password

#### X

1. Go to [X Developer Portal](https://developer.X.com/en/portal/dashboard)
2. Create a project and app (or use existing)
3. **IMPORTANT: Configure OAuth 1.0a permissions:**
   - Click on your app → **Settings** tab
   - Scroll to "User authentication settings"
   - Click **"Set up"** or **"Edit"**
   - Enable **OAuth 1.0a** by choosing "Web App, Automated App or Bot"
   - Set **App permissions** to **"Read and Write"** (not just "Read")
   - For **Callback URL**: Enter your GitHub repository URL (e.g., `https://github.com/yourusername/socialsox`) or any valid URL - it's not actually used but required by X
   - For **Website URL**: Enter the same GitHub repository URL or any valid URL like `https://github.com/yourusername/socialsox`
   - Click **Save**
   
   > **Note**: We're using OAuth 1.0a with your own Access Tokens (not the 3-legged OAuth flow), so the callback URL won't actually be used. X just requires these fields to be filled in.
4. Go to **"Keys and Tokens"** tab
5. **Regenerate** your Access Token and Access Token Secret (important after changing permissions!)
6. Copy all 4 credentials:
   - **API Key** (also called Consumer Key)
   - **API Secret** (also called Consumer Secret)
   - **Access Token** (newly regenerated)
   - **Access Token Secret** (newly regenerated)

### Enter Credentials & Post

Use the **Settings** tab to configure your API credentials. They're encrypted locally using Electron's safeStorage for security.

**Portability**: Use the "📤 Export Credentials" button to save your credentials to a JSON file for backup or transfer to another device. Use "📥 Import Credentials" to load them back.

Switch to the **Post** tab to:
- Select platforms to post to
- Type your message (with character counter)
- Upload an image (drag & drop or click)
- Click "Post to Selected Platforms"!

Check the **History** tab to view your past posts and their status.

## Security Notes

> [!NOTE]
> **Security Features:**
> - ✅ Everything runs locally on your computer
> - ✅ Credentials are encrypted using Electron's safeStorage (OS-level encryption)
> - ✅ Settings stored securely in localStorage
> - ✅ X OAuth handled securely in Electron backend
> - ✅ No external servers involved (except the social media APIs)

> [!WARNING]
> **Security Considerations:**
> - ⚠️ SafeStorage encryption requires your OS to have a password/login set up
> - ⚠️ If safeStorage is unavailable, credentials fall back to encrypted localStorage
> - ⚠️ Use app-specific passwords where available (like Bluesky's app passwords)

For security-related concerns, please see our [Security Policy](SECURITY.md).

## Limitations

> [!CAUTION]
> **Current Limitations:**
> - No multiple image support (single image only)
> - No thread/reply support
> - Character limits: X 280 chars, Mastodon 500+ (varies by instance), Bluesky 300 chars
> - Image size limit: 5MB
> - Image format support: PNG, JPG, GIF, WebP

## Troubleshooting

**App won't start or icons don't load**: Try running with debug console: `DEBUG=1 ./SocialSox.exe` (Windows) or `DEBUG=1 ./SocialSox` (Linux/Mac) to see error messages.

> [!IMPORTANT]
> **X Errors**:
> - **"oauth1 app permissions" error**: Your app isn't configured correctly
>   1. Go to your app's **Settings** → "User authentication settings"
>   2. Enable **OAuth 1.0a** with **"Read and Write"** permissions
>   3. Go to **"Keys and Tokens"** tab
>   4. **Regenerate** your Access Token and Access Token Secret (critical!)
>   5. Use the new tokens in SocialSox
> - Make sure you have all 4 credentials entered correctly
> - Old tokens won't work after changing permissions - you must regenerate them

> [!TIP]
> **Common Configuration Issues**:
> - **Instance URL Errors**: Use only the domain (e.g., `https://mastodon.social`), not your profile URL
> - **Mastodon Errors**: Make sure your instance URL is correct and includes `https://`
> - **Bluesky Errors**: Use your full handle including the domain (e.g., `user.bsky.social`)
> - **Image Upload Issues**: Ensure your image is under 5MB and in a supported format (PNG, JPG, GIF, WebP)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone https://github.com/burninc0de/socialsox.git
cd socialsox
npm install
```

### Development Commands

```bash
# Start the Vite dev server (for hot-reloading the web app)
npm run dev

# Launch the Electron app (loads from Vite dev server in dev mode)
npm start

# Build for production
npm run build
```

### Debugging Built App

To run the built app with developer console:

- Windows: `DEBUG=1 && dist\win-unpacked\SocialSox.exe`
- Linux/Mac: `DEBUG=1 ./dist/win-unpacked/SocialSox`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on the process for submitting pull requests.
