// In-app search window.
//
// Opens a small, sandboxed BrowserWindow that loads a search URL (typically
// Google) inside Hinged itself, so users can keep cataloguing without
// alt-tabbing to a separate browser. The window:
//   - is its own BrowserWindow with no Node integration, contextIsolation on,
//     and sandbox on. It is *only* meant for displaying remote web content.
//   - uses a real Chrome user-agent so Google doesn't reject the request as
//     "unusual traffic" (Electron's default UA contains "Electron/<version>",
//     which Google flags).
//   - reuses a persistent session so cookies/preferences survive across
//     openings. The session is separate from the main window's so any
//     login state Hinged itself might have isn't shared with Google.
//   - opens external links and target=_blank navigations in the OS default
//     browser instead of stacking up Electron windows.
//
// We intentionally do NOT add a paste-back toolbar here yet — that's a
// follow-up. For now the in-app window is just a focused browser tab; the
// user copies what they want and pastes back into Hinged with Cmd+V / Ctrl+V.

import { app, BrowserWindow, session, shell } from 'electron';

// A modern Chrome on macOS UA. The exact version is less important than
// not advertising "Electron".
const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// Singleton: only one in-app search window at a time. Reusing it makes the
// "Search Google" button feel like flipping to a familiar pane rather than
// piling up windows.
let current: BrowserWindow | null = null;

export function openSearchWindow(url: string): void {
  if (current && !current.isDestroyed()) {
    void current.webContents.loadURL(url);
    if (current.isMinimized()) current.restore();
    current.focus();
    return;
  }

  // Dedicated persistent session so cookies + preferences survive across
  // window opens. 'persist:hinged-search' is created on first use.
  const partition = 'persist:hinged-search';
  const sess = session.fromPartition(partition);
  sess.setUserAgent(CHROME_UA);

  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    title: 'Search — Hinged',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      partition,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // No preload — this window only displays third-party web content.
    },
  });

  // Belt-and-braces: Electron's default UA still wins on the very first
  // request unless we override on the webContents too.
  win.webContents.setUserAgent(CHROME_UA);

  // target=_blank / window.open inside the search page → OS default browser.
  // Without this the Electron app would stack up popup windows when the
  // user clicks search results that open in new tabs.
  win.webContents.setWindowOpenHandler(({ url: u }) => {
    void shell.openExternal(u);
    return { action: 'deny' };
  });

  // Some pages try to navigate the top-level frame to file:// or other
  // local URLs. Only allow http/https from this window.
  win.webContents.on('will-navigate', (e, navUrl) => {
    if (!/^https?:/i.test(navUrl)) {
      e.preventDefault();
    }
  });

  win.on('ready-to-show', () => {
    win.show();
    if (!app.isPackaged) {
      // Helpful when debugging UA / cookie behaviour.
      // win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  win.on('closed', () => {
    if (current === win) current = null;
  });

  void win.loadURL(url);
  current = win;
}

export function closeSearchWindow(): void {
  if (current && !current.isDestroyed()) {
    current.close();
  }
  current = null;
}
