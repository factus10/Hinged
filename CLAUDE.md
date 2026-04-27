# CLAUDE.md

Project-level guidance for Claude Code working in this repository.

## What this is

Hinged is a free, cross-platform stamp collection manager for macOS,
Windows, and Linux, built with Electron + React + TypeScript +
better-sqlite3. The original native macOS Swift app was rewritten as an
Electron application and the Swift code has been retired.

## Repo layout

```
Hinged/
├── electron/                 The application
│   ├── package.json
│   ├── electron.vite.config.ts
│   ├── electron-builder.yml
│   ├── resources/
│   │   └── icon.png          1024+ source for all platform icons
│   ├── scripts/
│   │   └── rebuild-native.mjs   Swap better-sqlite3 between Node + Electron ABI
│   └── src/
│       ├── main/             Electron main process (Node)
│       │   ├── index.ts          Entry: window, menu, IPC, auto-backup
│       │   ├── menu.ts           Native application menu
│       │   ├── ipc.ts            All ipcMain.handle handlers
│       │   ├── backup.ts         .hinged JSON import/export
│       │   ├── auto-backup.ts    Auto-backup on launch + rotation
│       │   ├── csv.ts            CSV parser/generator (matches Swift app)
│       │   ├── images.ts         Image storage in userData/Images/
│       │   └── db/
│       │       ├── connection.ts     Open + apply schema + migrations
│       │       ├── schema.sql        Idempotent CREATE statements
│       │       ├── seed.ts           Default countries seed
│       │       └── repositories/     One file per entity (CRUD + helpers)
│       ├── preload/
│       │   └── index.ts          Typed contextBridge API: window.hinged.*
│       ├── shared/               Imported by main + renderer
│       │   ├── types.ts          Domain types
│       │   ├── enums.ts          Catalog system, gum, centering, status
│       │   ├── display.ts        Display name / shorthand lookups
│       │   ├── ipc-contract.ts   Channel name constants
│       │   └── backup-schema.ts  Zod schema for .hinged files
│       └── renderer/             React UI
│           ├── App.tsx           Three-pane shell + dialog hosts
│           ├── main.tsx          React + QueryClient bootstrap
│           ├── styles.css        All styles (no Tailwind, no shadcn)
│           ├── components/
│           │   └── primitives.tsx    Button, Input, Select, Field, Dialog
│           ├── lib/
│           │   ├── query.ts          TanStack Query client + key constants
│           │   └── api.ts            Query/mutation hooks for every entity
│           ├── state/
│           │   ├── selection.ts      Sidebar selection + multi-select stamps
│           │   └── dialogs.ts        Which modal is open
│           └── features/             Feature folders
│               ├── sidebar/
│               ├── stamp-list/
│               ├── stamp-detail/
│               ├── countries/
│               ├── gap-analysis/
│               ├── settings/
│               └── help/
├── .github/
│   └── workflows/
│       └── electron-build.yml   3-platform build matrix + release on tag
├── scripts/
│   └── release.sh               Local helper for cutting tagged releases
└── LICENSE
```

## Architecture notes

**Three processes:** Electron splits into main (Node), preload (sandboxed
context bridge), and renderer (React in a Chromium window). The renderer
**never** touches the database or filesystem directly — every operation
goes through `window.hinged.*` which is defined in
[preload/index.ts](electron/src/preload/index.ts) and handled in
[main/ipc.ts](electron/src/main/ipc.ts).

**Database:** better-sqlite3 (synchronous), opened once at startup. All
queries go through repository modules in
[main/db/repositories/](electron/src/main/db/repositories/). Schema is
idempotent (`CREATE TABLE IF NOT EXISTS`) plus a small `runMigrations`
function in `connection.ts` for additive column changes (currently just
`stamps.deleted_at` for the trash feature).

**State:** TanStack Query owns server state (everything loaded via IPC).
Zustand owns ephemeral UI state (selection, which dialog is open). React
local state owns in-progress form drafts.

**Native modules + Electron ABI:** `better-sqlite3` is native and must be
compiled against the runtime that loads it. Electron and system Node have
different ABI versions, so the `pretest`, `posttest`, and `predev` npm
hooks in `electron/package.json` swap the binary between the two via
`scripts/rebuild-native.mjs`. If you ever see a `NODE_MODULE_VERSION`
error, run `npm run rebuild:electron` or `npm run rebuild:node` manually.

**Preload sandbox:** Sandboxed renderers in Electron require CommonJS
preload scripts even when the file extension is `.mjs`. The
`electron.vite.config.ts` preload section forces `format: 'cjs'` and
`entryFileNames: '[name].js'` because of this. Don't change it.

**React deduping:** The renderer config sets `resolve.dedupe: ['react',
'react-dom']` and pre-bundles them via `optimizeDeps.include`. Without
this, vite's dep pre-bundler creates two pre-bundled chunks each
containing their own React copy and every hook call throws "Invalid hook
call".

## Data storage

User data lives in Electron's `userData` path:

| Platform | Path |
| --- | --- |
| macOS  | `~/Library/Application Support/Hinged/` |
| Windows | `%APPDATA%\Hinged\` |
| Linux  | `~/.config/Hinged/` |

Inside: `hinged.db` (SQLite WAL mode) and `Images/` (one file per stamp,
UUID-named).

**Important**: dev (`npm run dev`) uses a *lowercase* `hinged/` userData
folder because the package.json `name` is lowercase, while packaged
builds use the capitalized `Hinged/` from `productName`. They're
intentionally split so dev experiments don't touch real data.

## Code signing (macOS only)

The packaged macOS build is signed with a Developer ID Application
certificate and notarized via Apple's notarytool. Configuration lives
in [electron-builder.yml](electron/electron-builder.yml):

- `mac.hardenedRuntime: true`
- `mac.notarize: true`
- `mac.entitlements` / `mac.entitlementsInherit` point at plists in
  `resources/`

CI provides the signing identity and notarization credentials via
secrets in [.github/workflows/electron-build.yml](.github/workflows/electron-build.yml):

- `MAC_CERT_P12_BASE64` → exported as `CSC_LINK`
- `MAC_CERT_PASSWORD` → exported as `CSC_KEY_PASSWORD`
- `APPLE_API_KEY_BASE64` → decoded into a `.p8` file at
  `$RUNNER_TEMP/appstoreconnect/AuthKey.p8` and pointed at by
  `APPLE_API_KEY`
- `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`

Local builds without these env vars produce an unsigned bundle and
electron-builder will print a warning, but the build still succeeds.
**Don't add `identity: null` back to the yml** — that explicitly
disables signing even when the env vars are present.

Windows and Linux are not signed. The Windows binary triggers a
SmartScreen warning on first launch.

## Common commands

```bash
# Develop
cd electron
npm install         # postinstall rebuilds better-sqlite3 for Electron
npm run dev         # launches the app with HMR

# Test
npm test            # vitest run, currently covers backup round-trip
npm run typecheck   # both tsconfig.node.json and tsconfig.web.json

# Build / package
npm run build       # produce out/ bundles only
npm run pack        # build + electron-builder --dir (no installer)
npm run dist:mac    # build a .dmg
npm run dist:win    # build a Windows installer
npm run dist:linux  # build .AppImage + .deb

# Release
./scripts/release.sh 0.2.0
# Bumps electron/package.json, commits, tags, pushes; CI builds all three
# platforms and publishes a GitHub Release.
```

## Backup file format

`.hinged` files are JSON, version 1, structurally identical to the
original Swift app's format (sorted keys, ISO-8601 dates without
fractional seconds, base64-embedded image data). The Zod schema in
[shared/backup-schema.ts](electron/src/shared/backup-schema.ts) is
the source of truth and accepts the legacy `yearOfIssue` field from
older Swift backups.

## Testing notes

Only `backup.test.ts` exists right now. It covers:

1. Full round-trip: populate DB → export → re-parse → restore into fresh
   DB → verify counts and field values.
2. Legacy `yearOfIssue` field is mapped to `yearStart`.
3. Merge mode dedupes countries by case-insensitive name.

The test file inlines `schema.sql` via `readFileSync` because vitest
doesn't go through electron-vite's `?raw` import resolution. If the
schema changes, the test still works as long as `schema.sql` is on disk.

## Things to be careful about

- **Native module rebuilds.** Don't edit `package.json` scripts that
  involve `rebuild:node` / `rebuild:electron` without understanding the
  ABI dance.
- **Schema migrations.** Use `runMigrations` in `connection.ts`. Don't
  put `CREATE INDEX ON new_column` in `schema.sql` — `CREATE TABLE IF
  NOT EXISTS` is a no-op on existing DBs and the index would fail.
- **Backup compatibility.** Don't change the `.hinged` JSON format. Any
  shipped change has to bump `BACKUP_VERSION` and stay
  forward-compatible with version 1.
- **Sandbox preload.** Stays CJS. See above.
