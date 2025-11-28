# SocialSox WordPress Plugin Concept

## Overview
A companion WordPress plugin for SocialSox that enables server-side scheduling of social media posts using WordPress's built-in WP Cron system. This solves the "always-on machine" issue for local Electron apps by offloading scheduling to users' WordPress sites.

## Key Features
- **Scheduling via WP Cron**: Posts are stored in WP and sent at scheduled times via Cron jobs.
- **Credential Import**: Users export creds from SocialSox as JSON and import into WP plugin for seamless setup.
- **Secure Connection**: JWT-based authentication for requests from SocialSox to WP.

## Implementation Steps
1. **Plugin Structure**: Main file, REST API endpoints, admin settings, Cron handlers.
2. **SocialSox Integration**: Add export/import UI, JWT generation, API client.
3. **Security**: JWT verification, HTTPS enforcement, encrypted creds.
4. **Testing**: End-to-end scheduling, error handling.

## Security
- JWT tokens for auth (short-lived, signed with shared secret).
- Encrypted JSON exports with user password.
- WP options for secure storage.

## Effort & Feasibility
- **Difficulty**: Moderate (WP experience helps).
- **Time**: 2-4 weeks MVP.
- **Cost**: Free (WP hosting assumed).
- **Ease for Users**: High (familiar WP install + import).

## Next Steps
- Prototype plugin core.
- Test JWT flow.

*Note: This is a scoping document. Implementation requires WP dev skills.*