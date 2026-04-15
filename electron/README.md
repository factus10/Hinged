# Hinged — Electron

Cross-platform rewrite of the native macOS Hinged app, in progress.

## Status

Steps 1–3 of the build plan are in place:

- ✅ Scaffold (electron-vite + React + TypeScript)
- ✅ SQLite schema and repository layer (better-sqlite3)
- ✅ `.hinged` backup import/export, round-trip compatible with the Swift app
- ⏳ UI features (sidebar, stamp list, detail, countries, gap analysis, …)
- ⏳ Image storage IPC surface
- ⏳ Native menus + keyboard shortcuts
- ⏳ CSV import/export

## Develop

```bash
cd electron
npm install
npm run dev
```

First run creates a SQLite DB at the platform-specific userData path:

- macOS: `~/Library/Application Support/Hinged/hinged.db`
- Windows: `%APPDATA%/Hinged/hinged.db`
- Linux: `~/.config/Hinged/hinged.db`

Images live alongside it in an `Images/` subdirectory.

## Test

```bash
npm test
```

The backup tests round-trip a populated DB through the JSON exporter and
importer, and verify the legacy `yearOfIssue` field from older Swift
backups is still accepted.

## Native module rebuild dance

`better-sqlite3` is a native module and must be compiled against the Node
ABI version of whatever runtime is loading it. Electron ships its own Node
ABI, which differs from your system Node. The `pretest`, `posttest`, and
`predev` hooks in `package.json` automatically swap the binary between
builds using `scripts/rebuild-native.mjs`:

- `npm test` → rebuild for system Node → run Vitest → rebuild for Electron
- `npm run dev` → rebuild for Electron → launch app
- `npm run build` → rebuild for Electron → typecheck → build bundles

If you ever see `NODE_MODULE_VERSION` errors, run `npm run rebuild:electron`
or `npm run rebuild:node` manually to realign.

## Package

```bash
npm run dist        # current platform
npm run dist:mac
npm run dist:win
npm run dist:linux
```

CI builds all three platforms on every push via `.github/workflows/electron-build.yml`.

## Importing from the Swift app

1. In the native Swift app, use **File → Export Backup** (`⌘⇧E`).
2. In the Electron app, click **Import (replace)** or **Import (merge)** on
   the home screen and pick the `.hinged` file.

Backups produced by the Electron app should still load cleanly in the
Swift app — the JSON format, key ordering, and date encoding are
preserved to match `src/Models/BackupRestore.swift`.

## Repo layout

```
electron/
├── src/
│   ├── main/         Node / Electron main process (DB, IPC, backup)
│   ├── preload/      contextBridge API surface
│   ├── renderer/     React UI
│   └── shared/       Types + enums shared across processes
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```
