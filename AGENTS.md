# AGENTS.md - Coding Guidelines for SocialSox

This file contains coding guidelines, build commands, and conventions for agentic coding assistants working on the SocialSox project.

## Build, Lint, and Test Commands

### Development Commands
- **Start development server**: `npm run dev` - Runs Vite dev server with hot-reload and launches Electron app
- **Build for production**: `npm run build` - Builds with Vite and creates distributable packages
- **Run built app**: `npm start` - Launches the built Electron application

### Testing Commands
- **Run all tests**: `npm test` - Executes the main test suite (currently sync tests)
- **Run tests in watch mode**: `npm run test:watch` - Runs tests with file watching using nodemon
- **Run a single test file**: `node test/sync.test.js` - Execute specific test files directly
- **Run specific test files**: `node test/sync-scenario.test.js`, `node test/sync-idempotent.test.js`

### Linting and Formatting
- **No linting configured** - The project currently has no ESLint, Prettier, or other code quality tools
- **Manual code review** - Code quality is maintained through manual review and following established patterns

## Code Style Guidelines

### Language and Framework
- **Vanilla JavaScript** - ES6+ features only, no TypeScript or frameworks like React
- **Modular architecture** - Code organized in `src/modules/` directory with clear separation of concerns
- **Electron + Vite** - Desktop app using Electron for cross-platform support, Vite for fast development builds

### Variable and Function Naming
- **camelCase** for variables, functions, and methods: `userData`, `handleSubmit`, `fetchUserProfile`
- **PascalCase** for constructor functions/classes (if any): `ApiClient`
- **Meaningful names** - Use descriptive names that clearly indicate purpose: `postingHistory` not `data`
- **Boolean prefixes** - Use `is`, `has`, `can`, `should`: `isLoading`, `hasCredentials`, `canPost`

### Declarations and Scoping
- **const** for constants and variables that don't change: `const apiUrl = 'https://api.example.com'`
- **let** for variables that change: `let currentUser = null`
- **Avoid var** - Use modern let/const declarations
- **Block scoping** - Declare variables in appropriate scopes, avoid global pollution

### Imports and Exports
- **ES6 imports/exports** - Use named imports: `import { fetchData, saveData } from './api.js'`
- **Default exports** - Use for main module exports: `export default function App() {}`
- **Import organization** - Group by type: standard library, third-party, local modules
- **No wildcard imports** - Be explicit about what's imported

### Asynchronous Code
- **async/await** - Preferred over Promises/callbacks: `const data = await fetchData()`
- **Proper error handling** - Always wrap async operations in try/catch blocks
- **Avoid callback hell** - Use async/await for sequential operations

### Error Handling
- **Try/catch blocks** - Wrap risky operations: filesystem, network requests, API calls
- **User-friendly errors** - Show meaningful error messages to users via toasts/notifications
- **Graceful degradation** - Handle failures without crashing the app
- **Logging** - Use console.error for debugging, but don't expose sensitive information

### Data Storage and JSON
- **JSON formatting** - Use `JSON.stringify(data, null, 2)` for readable storage files
- **No formatting for cache** - Use `JSON.stringify(data)` for frequently written cache files
- **Safe parsing** - Always wrap JSON.parse in try/catch blocks

### UI and DOM Manipulation
- **Vanilla JavaScript** - Direct DOM manipulation, no jQuery or frameworks
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Lucide icons** - Use bundled Lucide icons for consistent iconography
- **Event handlers** - Attach to `window` object for global functions: `window.handleSubmit = function() {}`
- **Element selection** - Use `document.getElementById()`, `document.querySelector()`

### File Organization
- **Modular structure** - Each feature in separate `src/modules/` files
- **Clear separation** - API calls, rendering, actions, and utilities separated
- **Consistent naming** - `actions.js`, `render.js`, `api.js` pattern for modules

### Comments and Documentation
- **Comment complex logic** - Explain non-obvious algorithms or business logic
- **JSDoc for APIs** - Document public functions and their parameters
- **TODO/FIXME** - Mark areas needing attention, but avoid leaving them long-term
- **No over-commenting** - Don't comment obvious code

### Security Practices
- **Credentials encryption** - Use Electron's safeStorage for sensitive data
- **Input validation** - Validate and sanitize all user inputs
- **No secrets in code** - Never hardcode API keys, tokens, or passwords
- **Secure defaults** - Prefer secure options by default (HTTPS, encrypted storage)

### Performance Considerations
- **Minimal bundle size** - Only import essential Lucide icons
- **Efficient DOM updates** - Minimize reflows and repaints
- **Lazy loading** - Load heavy features only when needed
- **Memory management** - Clean up event listeners and timers

### Testing Guidelines
- **Custom test runner** - Uses simple describe/it/beforeEach/afterEach pattern
- **Integration tests** - Focus on end-to-end functionality rather than unit tests
- **Mock external APIs** - Test logic without hitting real social media APIs
- **Test data management** - Use temporary directories and cleanup in afterEach
- **Comprehensive coverage** - Test happy paths, error cases, and edge conditions

### Commit Message Conventions
- **Clear and descriptive** - Start with verb: "Add", "Fix", "Update", "Refactor"
- **Concise subject** - Keep first line under 50 characters
- **Detailed body** - Explain what and why, not just what changed
- **Link issues** - Reference GitHub issues when applicable

### Platform Compatibility
- **Cross-platform** - Code must work on Windows, macOS, and Linux
- **Electron APIs** - Use platform-agnostic Electron APIs when possible
- **Path handling** - Use `path.join()` and `path.sep` for cross-platform paths
- **File permissions** - Handle permission errors gracefully

### Code Review Checklist
- [ ] Follows established naming conventions
- [ ] Proper error handling and user feedback
- [ ] No console.log statements in production code
- [ ] Tested on target platforms
- [ ] Performance impact considered
- [ ] Security implications reviewed
- [ ] Documentation updated if needed

Remember: This is a focused, minimalist project. Avoid over-engineering or adding unnecessary complexity. When in doubt, look at existing code patterns and maintain consistency with the current codebase.</content>
<parameter name="filePath">/home/zeno/Dev/socialsox/AGENTS.md