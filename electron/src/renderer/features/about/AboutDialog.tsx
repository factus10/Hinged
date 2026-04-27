import { useEffect, useState } from 'react';
import { Button, Dialog } from '@renderer/components/primitives';
import type { AppInfo } from '@shared/types';
// Small (256x256) variant — the full 2048x2048 source is for electron-builder
// to generate platform icons. Keep the renderer bundle lean.
import iconUrl from '@resources/icon-256.png';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: Props) {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    void window.hinged.app.getInfo().then(setInfo);
    void window.hinged.diag.dbPath().then(setDbPath);
  }, [open]);

  // Reset the "Copied" indicator when the dialog re-opens
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  const copyDiagnostics = async () => {
    if (!info) return;
    const text = [
      `Hinged ${info.version}`,
      `Platform: ${info.platform} (${info.arch})`,
      `Electron: ${info.electronVersion}`,
      `Chrome: ${info.chromeVersion}`,
      `Node: ${info.nodeVersion}`,
      `Database: ${dbPath ?? '(unknown)'}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About Hinged"
      footer={
        <>
          <Button onClick={() => void copyDiagnostics()} disabled={!info}>
            {copied ? 'Copied!' : 'Copy diagnostics'}
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="about-hero">
        <img src={iconUrl} alt="" className="about-icon" />
        <div className="about-headline">
          <h2 className="about-name">Hinged</h2>
          <div className="about-tagline subtle">
            A free, cross-platform stamp collection manager
          </div>
          {info && (
            <div className="about-version">
              Version <strong>{info.version}</strong>
            </div>
          )}
        </div>
      </div>

      <p className="about-blurb">
        Hinged is a desktop app for cataloguing stamp collections. Your data
        lives on your computer — no online account, no cloud upload, no
        subscription. The full source code is on GitHub under the GNU GPL v3
        license.
      </p>

      <div className="about-meta">
        <div>
          <span className="about-label">Author</span>
          <span>David Anderson</span>
        </div>
        <div>
          <span className="about-label">License</span>
          <span>
            GPL v3 ·{' '}
            <a href="https://github.com/factus10/Hinged/blob/main/LICENSE" target="_blank" rel="noreferrer">
              View license
            </a>
          </span>
        </div>
        <div>
          <span className="about-label">Source</span>
          <span>
            <a href="https://github.com/factus10/Hinged" target="_blank" rel="noreferrer">
              github.com/factus10/Hinged
            </a>
          </span>
        </div>
        <div>
          <span className="about-label">Website</span>
          <span>
            <a href="https://hinged-stamps.com" target="_blank" rel="noreferrer">
              hinged-stamps.com
            </a>
          </span>
        </div>
        <div>
          <span className="about-label">Issues &amp; feedback</span>
          <span>
            <a href="https://github.com/factus10/Hinged/issues" target="_blank" rel="noreferrer">
              Report a bug or request a feature
            </a>
          </span>
        </div>
      </div>

      {info && (
        <details className="about-build-info">
          <summary>Build &amp; runtime details</summary>
          <dl>
            <dt>Platform</dt>
            <dd>{info.platform} ({info.arch})</dd>
            <dt>Electron</dt>
            <dd className="mono">{info.electronVersion}</dd>
            <dt>Chrome</dt>
            <dd className="mono">{info.chromeVersion}</dd>
            <dt>Node</dt>
            <dd className="mono">{info.nodeVersion}</dd>
            {dbPath && (
              <>
                <dt>Database</dt>
                <dd className="mono small" style={{ wordBreak: 'break-all' }}>
                  {dbPath}
                </dd>
              </>
            )}
          </dl>
          <p className="subtle small" style={{ marginTop: '0.5rem' }}>
            Click <strong>Copy diagnostics</strong> below to put this info
            on your clipboard, ready to paste into a bug report.
          </p>
        </details>
      )}

      <p className="about-credit subtle small">
        Built with Electron, React, TypeScript, and better-sqlite3. Stamp
        icon engraved with care. © 2026 David Anderson.
      </p>
    </Dialog>
  );
}
