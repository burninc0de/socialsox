# 🧦 SocialSox

A simple, local Electron app for posting short messages to Mastodon, Twitter, and Bluesky simultaneously.

## Features

- 📝 Post to multiple platforms at once
- 🔒 All credentials stored locally
- 🎨 Clean, modern interface with native dark mode support
- 🔄 Toggle platforms on/off
- 📊 Character counter
- ✅ Per-platform status feedback
- 📤📥 Export/Import credentials for portability
- 🖥️ Desktop app - no browser or server needed!
- 📦 Cross-platform distributable builds
- 📋 Tabbed interface: Post, History, Settings
- 🖼️ Image upload support
- 📜 Posting history with status tracking
- 🎛️ Dedicated settings tab for API configuration
- 🌙 Custom dark scrollbars and theme

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
4. Select permissions: `write:statuses`
5. Click "Submit"
6. Copy your **instance URL** (just the domain like `https://mastodon.social`, NOT your profile URL)
7. Copy your **access token** from the application page

#### Bluesky

1. Log in to Bluesky
2. Go to Settings → App Passwords
3. Create a new app password
4. Use your handle (e.g., `username.bsky.social`) and the app password

#### Twitter

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a project and app (or use existing)
3. **IMPORTANT: Configure OAuth 1.0a permissions:**
   - Click on your app → **Settings** tab
   - Scroll to "User authentication settings"
   - Click **"Set up"** or **"Edit"**
   - Enable **OAuth 1.0a**
   - Set **App permissions** to **"Read and Write"** (not just "Read")
   - For **Callback URL**: Enter `http://127.0.0.1` (not actually used, but required by Twitter)
   - For **Website URL**: Enter any valid URL like `https://github.com/yourusername/socialsox` or just `http://localhost:8000`
   - Click **Save**
   
   > **Note**: We're using OAuth 1.0a with your own Access Tokens (not the 3-legged OAuth flow), so the callback URL won't actually be used. Twitter just requires these fields to be filled in.
4. Go to **"Keys and Tokens"** tab
5. **Regenerate** your Access Token and Access Token Secret (important after changing permissions!)
6. Copy all 4 credentials:
   - **API Key** (also called Consumer Key)
   - **API Secret** (also called Consumer Secret)
   - **Access Token** (newly regenerated)
   - **Access Token Secret** (newly regenerated)

### Enter Credentials & Post

Use the **Settings** tab to configure your API credentials. They're stored locally in the app.

**Portability**: Use the "📤 Export Credentials" button to save your credentials to a JSON file for backup or transfer to another device. Use "📥 Import Credentials" to load them back.

Switch to the **Post** tab to:
- Select platforms to post to
- Type your message (with character counter)
- Upload an image (drag & drop or click)
- Click "Post to Selected Platforms"!

Check the **History** tab to view your past posts and their status.

## Security Notes

- ✅ Everything runs locally on your computer
- ✅ Credentials are stored in localStorage (Electron app storage)
- ✅ Twitter OAuth handled securely in Electron backend
- ✅ No external servers involved (except the social media APIs)
- ⚠️ Anyone with access to your computer can potentially read localStorage
- ⚠️ Use app-specific passwords where available (like Bluesky's app passwords)

## Limitations

- No multiple image support (single image only)
- No thread/reply support
- Character limits: Twitter 280 chars, Mastodon 500+ (varies by instance), Bluesky 300 chars
- Image size limit: 5MB
- Image format support: PNG, JPG, GIF, WebP

## Troubleshooting

**App won't start or icons don't load**: Try running with debug console: `DEBUG=1 ./SocialSox.exe` (Windows) or `DEBUG=1 ./SocialSox` (Linux/Mac) to see error messages.

**Twitter Errors**: 
- **"oauth1 app permissions" error**: Your app isn't configured correctly
  1. Go to your app's **Settings** → "User authentication settings" 
  2. Enable **OAuth 1.0a** with **"Read and Write"** permissions
  3. Go to **"Keys and Tokens"** tab
  4. **Regenerate** your Access Token and Access Token Secret (critical!)
  5. Use the new tokens in SocialSox
- Make sure you have all 4 credentials entered correctly
- Old tokens won't work after changing permissions - you must regenerate them

**Instance URL Errors**: Use only the domain (e.g., `https://mastodon.social`), not your profile URL (e.g., NOT `https://mastodon.social/@username`)

**Mastodon Errors**: Make sure your instance URL is correct and includes `https://`

**Bluesky Errors**: Use your full handle including the domain (e.g., `user.bsky.social`)

**Image Upload Issues**: Ensure your image is under 5MB and in a supported format (PNG, JPG, GIF, WebP)

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
git clone <repository-url>
cd socialsox
npm install
```

### Development Commands

```bash
# Start the Vite dev server (for hot-reloading the web app)
npm run dev

# Launch the Electron app (loads from Vite dev server in dev mode)
npm start

# For full development: Run both commands above in separate terminals
# Terminal 1: npm run dev
# Terminal 2: npm start
# This gives you live updates in the Electron window

# Build for production
npm run build
```

### Debugging Built App

To run the built app with developer console:

- Windows: `DEBUG=1 && dist\win-unpacked\SocialSox.exe`
- Linux/Mac: `DEBUG=1 ./dist/win-unpacked/SocialSox`

## License

Free to use and modify as needed!
