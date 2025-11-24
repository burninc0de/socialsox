# 🧦 SocialSox

A simple, local Electron app for posting short messages to Mastodon, Twitter, and Bluesky simultaneously.

## Features

- 📝 Post to multiple platforms at once
- 🔒 All credentials stored locally
- 🎨 Clean, modern interface
- 🔄 Toggle platforms on/off
- 📊 Character counter
- ✅ Per-platform status feedback
- 🖥️ Desktop app - no browser or server needed!

## Quick Start

### Option 1: Run as Electron App (Recommended)

```bash
npm install
npm start
```

### Option 2: Run as Web App

```bash
# Using Python:
python3 server.py

# Or using Node.js:
node server.js
```

Then open http://localhost:8000/ in your browser.

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

⚠️ **Important**: Due to Twitter's OAuth 1.0a requirements, direct posting from the browser is not secure. Twitter posting requires a backend server to handle authentication securely.

**Option 1 - Skip Twitter**: Just use Mastodon and Bluesky (deselect Twitter in the app).

**Option 2 - Set up a backend**: Create a simple Node.js/Python server that handles Twitter OAuth. This requires:
- Twitter Developer Account
- App with API keys (API Key, API Secret, Access Token, Access Token Secret)
- A backend proxy server (not included in this simple app)

### Enter Credentials & Post

Click "⚙️ API Credentials" to expand the settings section and enter your credentials. They're stored locally.

Then select platforms, type your message, and click "Post to Selected Platforms"!

## Security Notes

- ✅ Everything runs locally in your browser
- ✅ Credentials are stored in localStorage (browser only)
- ✅ No external servers involved (except the social media APIs)
- ⚠️ Anyone with access to your computer can potentially read localStorage
- ⚠️ Use app-specific passwords where available (like Bluesky's app passwords)

## Limitations

- Twitter requires a backend server for secure OAuth
- No image/media upload support
- No thread/reply support
- Character limits not enforced per platform (280 chars is typical)
- CORS may block some requests (use browser extensions if needed)

## Troubleshooting

**CORS Errors**: Make sure you're using the local server (`python3 server.py` or `node server.js`) and accessing via http://localhost:8000/

**Instance URL Errors**: Use only the domain (e.g., `https://mastodon.social`), not your profile URL (e.g., NOT `https://mastodon.social/@username`)

**Mastodon Errors**: Make sure your instance URL is correct and includes `https://`

**Bluesky Errors**: Use your full handle including the domain (e.g., `user.bsky.social`)

## License

Free to use and modify as needed!
