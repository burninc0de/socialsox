# SocialSox - Agent Notes

Compact, verified guidance for working in this repo. Prefer executable sources over prose.

## Commands

- Dev: `npm run dev` – Vite dev server on port 5173 + Electron via vite-plugin-electron. README describes auto launch.
- Build: `npm run build` – `npx vite build && electron-builder --publish=never`. Output to `dist/`.
- Run built app: `npm start` – `electron .`. Debug built app with `DEBUG=1`.
- Tests: `npm test` runs `node test/sync.test.js`. Custom runner, no Jest.
  - Single file: `node test/sync.test.js`, `node test/sync-scenario.test.js`, `node test/sync-idempotent.test.js`
  - Watch: `npm run test:watch` – nodemon
- Linting/formatting: none configured.

## Architecture

- Vanilla ES6+ JavaScript. No TypeScript, no React.
- Electron main: `main.js`, preload: `preload.js`, renderer entry: `app.js`
- Modules in `src/modules/`. Pattern: `actions.js`, `api.js`, `render.js`, `index.js` for feature tabs e.g. `src/modules/home/`
- Renderer exposes globals via `window.*`. UI helpers attach to `window` for global access.
- UI stack: Tailwind CSS bundled, Lucide icons bundled – import only essential icons to keep bundle small.
- Vite config: dev server port 5173, build outDir `dist-vite`.

## Data & Storage

- User data path: `app.getPath('userData')`
  - Windows: `%APPDATA%\socialsox\`
  - macOS: `~/Library/Application Support/socialsox/`
  - Linux: `~/.config/socialsox/`
- Files: `notifications.json`, `history.json`, `window-config.json`, `schedule.json`, `sync-settings.json`, `deleted-ids.json`, `dismissed-ids.json`, `external-links-setting.json`, `bluesky-debug.json`
- Credentials encrypted via Electron `safeStorage`. Fallback in `main.js`: AES-256-GCM with machine-derived key if safeStorage unavailable. IPC: `encrypt-credentials` / `decrypt-credentials`.
- JSON persistence uses `JSON.stringify(data, null, 2)` for readable files.

## Sync

- Sync directory is source of truth. Remote wins on conflict.
- Synced files: `history.json`, `notifications.json`, `schedule.json`, `deleted-ids.json`, `dismissed-ids.json`
- Deletions tracked in `deleted-ids.json`, merged bidirectionally. Dismissed notifications tracked separately.
- Manual sync IPC: `manualSync(syncDirPath)`. Sync logic in `src/modules/sync.js` and `main.js` `manual-sync` handler.
- Tests in `test/` validate remote source of truth, deletion propagation, idempotency.

## Environment Quirks

- Linux: main.js forces `password-store=gnome-libsecret` if desktop env not recognized.
- Tray icon: `tray-mac.png` on darwin, `tray.png` otherwise. Path resolved for packaged vs dev.
- Window bounds persisted to `window-config.json`.
- External links setting toggles `shell.openExternal` vs in-app BrowserWindow.
- `DEBUG` env opens DevTools in main window.

## Conventions

- Feature code in `src/modules/`, clear separation API / render / actions / utilities.
- No wildcard imports. ES6 named imports/exports.
- Custom test runner with `describe/it/beforeEach/afterEach`. Tests use temp dirs, mock external APIs.
- Commit messages: verb first, subject <50 chars.
