# Security Policy

## Supported Versions

We take security seriously. This section outlines how we handle security vulnerabilities in SocialSox.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in SocialSox, please help us by reporting it responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities by emailing the maintainer directly at andre@learnoutlive.com or through private channels.

### What to Include

When reporting a security vulnerability, please include:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Any suggested fixes or mitigations

### Our Response Process

1. **Acknowledgment**: We'll acknowledge receipt of your report within 48 hours
2. **Investigation**: We'll investigate the issue and determine its severity
3. **Fix Development**: We'll develop and test a fix
4. **Disclosure**: We'll coordinate disclosure with you to ensure the issue is resolved before public disclosure

### Security Considerations

SocialSox stores API credentials locally on the user's device. While we take precautions to secure this data:

- Credentials are stored in Electron's localStorage
- No data is transmitted to external servers (except the social media APIs themselves)
- Users should use app-specific passwords where available
- Anyone with physical access to the device can potentially access stored credentials

We recommend:
- Using dedicated app passwords for each platform
- Regularly rotating API credentials
- Not sharing your SocialSox installation across multiple users

## Responsible Disclosure

We kindly ask that you:
- Give us reasonable time to fix the issue before public disclosure
- Avoid accessing or modifying user data
- Respect user privacy

Thank you for helping keep SocialSox and its users secure!