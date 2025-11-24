# Development Setup

## Vite with Hot Module Replacement (HMR)

This project is configured to use Vite for development with full Electron support and Hot Module Replacement.

### Development Commands

```bash
# Start development mode with Vite + Electron + HMR
npm run dev

# Start Electron app directly (production mode)
npm start

# Start Electron with logging
npm run electron:dev

# Build for production
npm run build

# Create distributable
npm run dist
```

### How It Works

- **Vite Dev Server**: Runs on `http://localhost:5173` and serves the frontend with HMR
- **Electron Process**: Automatically starts and loads the Vite dev server
- **Hot Module Replacement**: Changes to HTML, CSS (Tailwind), and JavaScript are instantly reflected without full page reload
- **Main Process**: Changes to `main.js` or `preload.js` automatically rebuild and restart Electron

### Development Workflow

1. Run `npm run dev`
2. Electron window opens automatically
3. Make changes to:
   - `index.html` - Updates instantly
   - `app.js` - Updates instantly with HMR
   - `main.js` or `preload.js` - Rebuilds and restarts Electron
   - Tailwind classes - Updates instantly

### Build Output

- **Development**: `dist-electron/` - Compiled main and preload scripts
- **Production**: `dist/` - Final Electron app build
- **Vite Build**: `dist-vite/` - Vite production build (not used for Electron packaging)

### Important Notes

- The Electron build process is completely unaffected by Vite
- `npm start` runs the production Electron app without Vite
- Dev dependencies are automatically excluded from production builds
- Window controls (minimize, maximize, close) only work in Electron, not in browser
