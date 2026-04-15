# Hinged

A free, cross-platform stamp collection manager for macOS, Windows, and Linux.

Built with Electron, React, TypeScript, and SQLite. Designed to make life
easier for stamp collectors — new and experienced — without locking your
data into a proprietary format.

## Download

Grab the latest release for your platform from the
[Releases page](https://github.com/factus10/Hinged/releases).

| Platform | File |
| --- | --- |
| macOS  | `Hinged-x.y.z-universal.dmg` (works on Apple Silicon and Intel) |
| Windows | `Hinged Setup x.y.z.exe` |
| Linux | `Hinged-x.y.z.AppImage` or `hinged_x.y.z_amd64.deb` |

### Installing on macOS

The binaries are unsigned (no Apple Developer ID), so the first time you
launch Hinged macOS will warn that it can't verify the developer.

1. Open the downloaded `.dmg` and drag **Hinged.app** to your Applications folder
2. **Right-click** (or Control-click) **Hinged.app** in Applications and pick **Open**
3. macOS will show *"Apple cannot verify the developer of Hinged"* —
   click **Open** in that dialog
4. Hinged launches. You only need to do this once; subsequent launches
   work normally

If you skipped the right-click and just double-clicked, you may instead
see *"Hinged is damaged and can't be opened"*. The app is not actually
damaged — that message is macOS Gatekeeper refusing to run an
unrecognized download. The fix is a one-time Terminal command to remove
the "downloaded from the internet" quarantine flag:

```bash
xattr -cr /Applications/Hinged.app
```

After running that, double-click as normal.

### Installing on Windows

Run the `.exe` installer. Windows SmartScreen will warn that the
publisher is unknown. Click **More info → Run anyway** to proceed.

### Installing on Linux

Either:

- Make the `.AppImage` executable (`chmod +x Hinged-*.AppImage`) and
  double-click to run, or
- Install the `.deb` with `sudo apt install ./hinged_*.deb`

## Features

- **Three-pane layout** — collections / albums tree on the left, filterable
  stamp list in the middle, full editing form on the right.
- **Catalog systems** — Scott, Stanley Gibbons, Michel, Yvert et Tellier,
  Sakura, Facit, plus your own custom catalogs.
- **Country prefixes** — display catalog numbers with the right per-country
  prefix automatically (e.g. `US 1` instead of just `1`).
- **Smart collections** — All Owned, Want List, Not Collecting, Recent
  Additions, Trash.
- **Bulk editing** — multi-select with ⌘/Ctrl+click, ⇧+click, and ⌘A.
  Right-click for status / condition / move-to-album / delete in one step.
- **Quick add** — type a catalog number, year, denomination, hit Enter.
  Stamps fly into your album as fast as you can type.
- **Keyboard navigation** — arrow keys move through the stamp list, Enter
  jumps to edit, Delete trashes, Escape clears.
- **Trash with restore** — deleted stamps go to a Trash smart collection
  for safekeeping until you empty it.
- **Auto-backup on launch** — point Hinged at a folder and it writes a
  timestamped backup every time you start the app, keeping the most
  recent N.
- **Image attachments** — drag and drop or pick an image for each stamp.
- **Gap analysis** — pick a country and year range, see your completion
  percentage and the catalog-number gaps in your collection.
- **CSV import & export** — flexible CSV in/out so you can move data
  between Hinged and any spreadsheet.
- **Backup & restore** — `.hinged` JSON backup files are bidirectionally
  compatible with the original macOS Swift app.
- **Native menus and shortcuts** — ⌘⇧N new collection, ⌘⌥N new album,
  ⌘⇧E export backup, ⌘, settings, ⌘? help.

## Where your data lives

| Platform | Path |
| --- | --- |
| macOS  | `~/Library/Application Support/Hinged/` |
| Windows | `%APPDATA%\Hinged\` |
| Linux  | `~/.config/Hinged/` |

Inside that folder:

```
Hinged/
├── hinged.db    SQLite database
└── Images/      Stamp image files
```

The database file is the only thing that matters for your collection. Copy
it somewhere safe and you have a full snapshot. Or use **File → Export
Backup** for a portable JSON file.

## Building from source

Requires Node.js 20+ and npm.

```bash
git clone https://github.com/factus10/Hinged.git
cd Hinged/electron
npm install
npm run dev
```

To build distributables locally:

```bash
npm run dist          # current platform
npm run dist:mac      # macOS .dmg
npm run dist:win      # Windows .exe
npm run dist:linux    # Linux .AppImage + .deb
```

## License

MIT — see [LICENSE](LICENSE).
