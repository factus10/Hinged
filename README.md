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

Open the downloaded `.dmg` and drag **Hinged.app** to your Applications
folder. Double-click to launch — Hinged is signed with an Apple Developer
ID and notarized, so macOS will open it without warnings.

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
  Additions, Trading Stock, Trash.
- **Bulk editing** — multi-select with ⌘/Ctrl+click, ⇧+click, and ⌘A.
  Right-click for status / condition / move-to-album / delete in one step.
- **Quick add** — type a catalog number, year, denomination, hit Enter.
  Stamps fly into your album as fast as you can type.
- **Keyboard navigation** — arrow keys move through the stamp list, Enter
  jumps to edit, Delete trashes, ⌘C copies selected rows as TSV, Escape
  clears.
- **Trash with restore** — deleted stamps go to a Trash smart collection
  for safekeeping until you empty it.
- **Auto-backup on launch** — point Hinged at a folder and it writes a
  timestamped backup every time you start the app, keeping the most
  recent N.
- **Image attachments** — drag and drop or pick an image for each stamp.
- **Gap analysis** — pick a country and year range, see your completion
  percentage and the catalog-number gaps in your collection.
- **Smart CSV import** — column-mapping wizard accepts any CSV layout,
  with auto-detection of common header names. Paste tab-separated data
  from Excel or Numbers directly into the stamp list.
- **CSV / TSV export** — file export for the current view, plus ⌘C
  copies selected rows in spreadsheet-pasteable form.
- **Community templates** — `.hinged-template.json` files let collectors
  share catalog scaffolding (numbers, years, denominations, colors) for
  any catalog range. Hinged ships zero templates; the format is a tool
  for the community to use as it sees fit.
- **Trading stock** — per-stamp `quantity` and `tradeable` flag, plus a
  Trading Stock smart collection that surfaces duplicates and items
  marked for trade.
- **Series** — assign each stamp to a series (Famous Americans, Prexies,
  Series of 1857–61, Machin definitives) and filter by it from the
  toolbar. Series carry their own metadata (description, country, year
  range), are managed under Tools → Series, and round-trip through
  backups, CSV, and shared templates.
- **Cert / provenance** — optional cert number, issuing body, and cert
  date per stamp. Collapsed by default in the detail pane; auto-opens
  for stamps that have any cert info.
- **Sidebar progress badges** — small "owned / total" badges next to
  each collection and album showing tracked-stamp completion at a glance.
- **Timeline filter** — toolbar toggle for a year-range filter with a
  small histogram of stamps per year.
- **Statistics dashboard** — Tools → Statistics. Counts, completion
  percentages, range, spending totals, by-decade chart, top countries
  and series with dual-fill bars showing owned vs tracked.
- **Want-list export** — Tools → Print Want List. Generates a printable
  PDF or shareable Markdown grouped by country, with optional Series
  and Budget columns. Take to your next stamp show.
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

GPL v3 — see [LICENSE](LICENSE). Forks and derivative works must be
distributed under the same license, with source available.
