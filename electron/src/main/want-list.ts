// Want-list export: PDF + Markdown.
//
// PDF is rendered by an offscreen BrowserWindow that loads a generated HTML
// page and calls webContents.printToPDF. No external PDF library — Electron
// already ships Chromium and that's the cleanest way to get a styled,
// paginated, printable result.
//
// Markdown is just string assembly.

import { BrowserWindow, dialog } from 'electron';
import { writeFileSync } from 'node:fs';
import type { Stamp } from '@shared/types.js';
import type { DB } from './db/connection.js';
import { listAlbums } from './db/repositories/albums.js';
import { listCollections } from './db/repositories/collections.js';
import { listCountries } from './db/repositories/countries.js';
import { listSeries } from './db/repositories/series.js';
import { listStamps } from './db/repositories/stamps.js';
import { getAllSettings } from './db/repositories/settings.js';

export interface WantListOptions {
  /** Filter to a specific country, or null for all */
  countryId: number | null;
  /** Include series column */
  includeSeries: boolean;
  /** Include a Notes column for jotting prices etc. */
  includeBudgetColumn: boolean;
  /** Include a custom title */
  title: string;
  /** Optional subtitle (e.g. "For PIPEX 2026") */
  subtitle: string;
}

interface WantedRow {
  catalogNumber: string;
  displayCatalog: string;
  yearStart: number | null;
  yearEnd: number | null;
  denomination: string;
  color: string;
  notes: string;
  countryName: string;
  seriesName: string;
}

/** Collect every Wanted stamp, optionally scoped to a country. */
function collectRows(db: DB, opts: WantListOptions): WantedRow[] {
  const stamps = listStamps(db);
  const albums = listAlbums(db);
  const collections = listCollections(db);
  const countries = listCountries(db);
  const series = listSeries(db);

  const albumsById = new Map(albums.map((a) => [a.id, a]));
  const collectionsById = new Map(collections.map((c) => [c.id, c]));
  const countriesById = new Map(countries.map((c) => [c.id, c]));
  const seriesById = new Map(series.map((s) => [s.id, s]));

  const out: WantedRow[] = [];
  for (const s of stamps) {
    if (s.collectionStatusRaw !== 'wanted') continue;

    const album = albumsById.get(s.albumId);
    const collection = album ? collectionsById.get(album.collectionId) : null;
    const effectiveCountryId = collection?.countryId ?? s.countryId ?? null;
    if (opts.countryId != null && effectiveCountryId !== opts.countryId) continue;

    const country = effectiveCountryId != null ? countriesById.get(effectiveCountryId) : null;
    const prefix =
      country && collection ? country.catalogPrefixes[collection.catalogSystemRaw] : null;
    const displayCatalog = prefix ? `${prefix} ${s.catalogNumber}` : s.catalogNumber;
    const seriesName = s.seriesId != null ? seriesById.get(s.seriesId)?.name ?? '' : '';

    out.push({
      catalogNumber: s.catalogNumber,
      displayCatalog,
      yearStart: s.yearStart,
      yearEnd: s.yearEnd,
      denomination: s.denomination,
      color: s.color,
      notes: s.notes,
      countryName: country?.name ?? '',
      seriesName,
    });
  }
  return out;
}

const naturalCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

/** Group rows by country, preserving sort within each group. */
function groupByCountry(rows: WantedRow[]): Map<string, WantedRow[]> {
  const groups = new Map<string, WantedRow[]>();
  for (const r of rows) {
    const key = r.countryName || '(No country)';
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  // Sort each group by catalog number, naturally.
  for (const arr of groups.values()) {
    arr.sort((a, b) => naturalCollator.compare(a.catalogNumber, b.catalogNumber));
  }
  // Return groups in alphabetic order
  return new Map([...groups.entries()].sort((a, b) => naturalCollator.compare(a[0], b[0])));
}

function displayYear(r: WantedRow): string {
  if (r.yearStart == null) return '';
  if (r.yearEnd != null && r.yearEnd !== r.yearStart) return `${r.yearStart}–${r.yearEnd}`;
  return String(r.yearStart);
}

// ---------- HTML template ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtml(rows: WantedRow[], opts: WantListOptions): string {
  const groups = groupByCountry(rows);
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tables: string[] = [];
  for (const [country, items] of groups) {
    const headers = [
      '<th>Catalog #</th>',
      '<th>Year</th>',
      '<th>Denomination</th>',
      '<th>Color</th>',
    ];
    if (opts.includeSeries) headers.push('<th>Series</th>');
    headers.push('<th>Notes</th>');
    if (opts.includeBudgetColumn) headers.push('<th class="budget">Budget</th>');

    const rowsHtml = items
      .map((r) => {
        const cells = [
          `<td class="mono">${escapeHtml(r.displayCatalog)}</td>`,
          `<td>${escapeHtml(displayYear(r))}</td>`,
          `<td>${escapeHtml(r.denomination)}</td>`,
          `<td>${escapeHtml(r.color)}</td>`,
        ];
        if (opts.includeSeries) cells.push(`<td>${escapeHtml(r.seriesName)}</td>`);
        cells.push(`<td>${escapeHtml(r.notes)}</td>`);
        if (opts.includeBudgetColumn) cells.push('<td class="budget"></td>');
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('\n');

    tables.push(`
      <h2>${escapeHtml(country)} <span class="count">(${items.length})</span></h2>
      <table>
        <thead><tr>${headers.join('')}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(opts.title)}</title>
  <style>
    @page { size: letter; margin: 0.75in; }
    @media print { body { font-size: 10pt; } }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      margin: 0;
    }
    header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 8pt;
      margin-bottom: 16pt;
    }
    h1 {
      font-size: 18pt;
      margin: 0 0 4pt;
      letter-spacing: -0.01em;
    }
    .subtitle {
      font-size: 10pt;
      color: #666;
      margin: 0;
    }
    .meta {
      font-size: 8pt;
      color: #888;
      margin-top: 4pt;
    }
    h2 {
      font-size: 12pt;
      margin: 16pt 0 6pt;
      page-break-after: avoid;
      border-bottom: 1px solid #ccc;
      padding-bottom: 2pt;
    }
    h2 .count {
      font-weight: 400;
      color: #888;
      font-size: 9pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      page-break-inside: auto;
      font-size: 9.5pt;
    }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th {
      text-align: left;
      font-weight: 600;
      padding: 4pt 6pt 4pt 0;
      border-bottom: 1px solid #1a1a1a;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td {
      padding: 3pt 6pt 3pt 0;
      vertical-align: top;
      border-bottom: 0.5pt solid #e0e0e0;
    }
    .mono {
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    }
    .budget {
      width: 0.9in;
      border-bottom-style: solid;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(opts.title)}</h1>
    ${opts.subtitle ? `<p class="subtitle">${escapeHtml(opts.subtitle)}</p>` : ''}
    <p class="meta">
      ${rows.length} stamp${rows.length === 1 ? '' : 's'} · printed ${escapeHtml(today)}
    </p>
  </header>
  ${tables.join('\n')}
</body>
</html>`;
}

// ---------- Markdown ----------

function buildMarkdown(rows: WantedRow[], opts: WantListOptions): string {
  const groups = groupByCountry(rows);
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const lines: string[] = [];
  lines.push(`# ${opts.title}`);
  lines.push('');
  if (opts.subtitle) {
    lines.push(`*${opts.subtitle}*`);
    lines.push('');
  }
  lines.push(`*${rows.length} stamps · ${today}*`);
  lines.push('');

  for (const [country, items] of groups) {
    lines.push(`## ${country} (${items.length})`);
    lines.push('');
    const headers: string[] = ['Catalog #', 'Year', 'Denomination', 'Color'];
    if (opts.includeSeries) headers.push('Series');
    headers.push('Notes');
    if (opts.includeBudgetColumn) headers.push('Budget');
    lines.push(`| ${headers.join(' | ')} |`);
    lines.push(`|${headers.map(() => '---').join('|')}|`);
    for (const r of items) {
      const cells: string[] = [
        r.displayCatalog,
        displayYear(r),
        r.denomination,
        r.color,
      ];
      if (opts.includeSeries) cells.push(r.seriesName);
      cells.push(r.notes.replace(/\|/g, '\\|'));
      if (opts.includeBudgetColumn) cells.push('');
      lines.push(`| ${cells.join(' | ')} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---------- Public API ----------

export interface WantListExportResult {
  ok: boolean;
  path?: string;
  count?: number;
  error?: string;
}

export async function exportWantListPdf(
  db: DB,
  win: BrowserWindow | null,
  opts: WantListOptions,
): Promise<WantListExportResult> {
  const rows = collectRows(db, opts);
  if (rows.length === 0) return { ok: false, error: 'No wanted stamps match.' };

  const save = win
    ? await dialog.showSaveDialog(win, {
        title: 'Save Want List',
        defaultPath: `${opts.title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      })
    : await dialog.showSaveDialog({
        title: 'Save Want List',
        defaultPath: `${opts.title.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
  if (save.canceled || !save.filePath) return { ok: false };

  const html = buildHtml(rows, opts);

  // Render HTML in an offscreen window and print to PDF.
  const printWin = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true, sandbox: true, javascript: false },
  });
  try {
    await printWin.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(html),
    );
    const buf = await printWin.webContents.printToPDF({
      pageSize: 'Letter',
      printBackground: true,
      margins: { top: 0.75, bottom: 0.75, left: 0.75, right: 0.75 },
    });
    writeFileSync(save.filePath, buf);
  } finally {
    printWin.close();
  }
  // Use settings to keep things tidy (eslint silence on unused export)
  void getAllSettings;
  return { ok: true, path: save.filePath, count: rows.length };
}

export async function exportWantListMarkdown(
  db: DB,
  win: BrowserWindow | null,
  opts: WantListOptions,
): Promise<WantListExportResult> {
  const rows = collectRows(db, opts);
  if (rows.length === 0) return { ok: false, error: 'No wanted stamps match.' };

  const save = win
    ? await dialog.showSaveDialog(win, {
        title: 'Save Want List',
        defaultPath: `${opts.title.replace(/[/\\?%*:|"<>]/g, '_')}.md`,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      })
    : await dialog.showSaveDialog({
        title: 'Save Want List',
        defaultPath: `${opts.title.replace(/[/\\?%*:|"<>]/g, '_')}.md`,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'txt'] }],
      });
  if (save.canceled || !save.filePath) return { ok: false };

  const text = buildMarkdown(rows, opts);
  writeFileSync(save.filePath, text, 'utf8');
  return { ok: true, path: save.filePath, count: rows.length };
}

/** Stamp type re-export so the renderer can size collections of rows. */
export type { Stamp };
