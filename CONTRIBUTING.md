# Contributing to SocialSox

Thank you for your interest in contributing to SocialSox! This document provides guidelines and information for contributors.

## How to Contribute

### Reporting Bugs
- Use the [bug report template](.github/ISSUE_TEMPLATE/bug-report.md)
- Include detailed steps to reproduce
- Provide environment information (OS, app version, etc.)
- Include screenshots if applicable

### Suggesting Features
- Use the [feature request template](.github/ISSUE_TEMPLATE/feature-request.md)
- Clearly describe the problem and proposed solution
- Consider alternative approaches

### Contributing Code

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make your changes** following the coding standards
5. **Test your changes** thoroughly
6. **Commit your changes** with clear, descriptive messages
7. **Push to your fork** and **create a pull request**

### Development Setup

See the [README.md](README.md) for detailed development setup instructions.

### Coding Standards

- Follow existing code style and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions small and focused
- Test your changes

### Commit Messages

Use clear, descriptive commit messages:
- Start with a verb (Add, Fix, Update, etc.)
- Keep the first line under 50 characters
- Provide more detail in the body if needed

Example:
```
Fix Twitter API rate limiting issue

- Handle 429 responses gracefully
- Add exponential backoff for retries
- Update error messages for better user feedback
```

## Testing

- Test on all supported platforms (Windows, macOS, Linux)
- Verify API integrations work correctly
- Test edge cases and error conditions
- Ensure existing functionality still works

## Pull Request Process

1. Ensure your PR follows the [PR template](.github/PULL_REQUEST_TEMPLATE.md)
2. Link any related issues
3. Request review from maintainers
4. Address any feedback or requested changes
5. Once approved, your PR will be merged

## Areas for Contribution

- Bug fixes and stability improvements
- New platform integrations
- UI/UX enhancements
- Documentation improvements
- Performance optimizations
- Test coverage

## Questions?

If you have questions about contributing, feel free to:
- Open a [question issue](.github/ISSUE_TEMPLATE/question.md)
- Check existing issues and discussions
- Review the documentation

Thank you for contributing to SocialSox! 🎉