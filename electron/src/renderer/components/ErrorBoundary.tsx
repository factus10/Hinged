// Top-level React error boundary.
//
// Without this, an uncaught error anywhere in the React tree unmounts the
// whole app and leaves the user staring at a blank white window with no
// indication of what happened. This component catches such errors at the
// top of the tree and renders a friendly fallback panel instead, with
// buttons to reload, attempt recovery, or copy a diagnostic report for a
// bug report.
//
// The fallback UI is intentionally minimal:
//   - no React Query (it might be the thing that crashed)
//   - no Zustand stores (same reason)
//   - just plain HTML + useState + a couple of IPC calls
//   - imports only the most basic primitives so the surface area for a
//     secondary crash is small.

import { Component, type ErrorInfo, type ReactNode, useState } from 'react';
import type { AppInfo } from '@shared/types';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: unknown;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo): void {
    // Bubbles to the main process via the renderer-console-message
    // forwarder we already wire up in dev mode.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Fallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
          onReload={this.reload}
        />
      );
    }
    return this.props.children;
  }
}

// ---------- Fallback UI ----------

interface FallbackProps {
  error: unknown;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
}

function Fallback({ error, errorInfo, onReset, onReload }: FallbackProps) {
  const [copied, setCopied] = useState(false);

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;

  const copyReport = async (): Promise<void> => {
    let appInfo: AppInfo | null = null;
    try {
      // Optional chain: if window.hinged isn't available (extremely unlikely
      // since preload runs before React), fall back to platform-less report.
      appInfo = (await window?.hinged?.app?.getInfo?.()) ?? null;
    } catch {
      appInfo = null;
    }

    const lines: string[] = [
      'Hinged crash report',
      '===================',
      '',
      `Time:        ${new Date().toISOString()}`,
    ];
    if (appInfo) {
      lines.push(`Version:     ${appInfo.version}`);
      lines.push(`Platform:    ${appInfo.platform} (${appInfo.arch})`);
      lines.push(`Electron:    ${appInfo.electronVersion}`);
      lines.push(`Chrome:      ${appInfo.chromeVersion}`);
      lines.push(`Node:        ${appInfo.nodeVersion}`);
    } else {
      lines.push(`User-Agent:  ${navigator.userAgent}`);
    }
    lines.push('');
    lines.push('Error:');
    lines.push(message);
    if (stack) {
      lines.push('');
      lines.push('Stack:');
      lines.push(stack);
    }
    if (errorInfo?.componentStack) {
      lines.push('');
      lines.push('Component stack:');
      lines.push(errorInfo.componentStack);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // No clipboard — show the text inline instead so the user can copy
      // it manually. Fall through to leaving copied=false.
    }
  };

  return (
    <div className="error-boundary">
      <div className="error-boundary-card">
        <div className="error-boundary-symbol">⚠︎</div>
        <h1>Something went wrong</h1>
        <p>
          Hinged ran into an unexpected error and had to stop the part of the
          window you were using. Your data is safe — it lives on disk and
          wasn&apos;t affected by this.
        </p>

        <div className="error-boundary-message">
          <strong>Error:</strong>{' '}
          <code>{message || '(no message)'}</code>
        </div>

        <div className="error-boundary-actions">
          <button className="btn btn-primary" type="button" onClick={onReload}>
            Reload App
          </button>
          <button className="btn" type="button" onClick={onReset}>
            Try to recover
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => void copyReport()}
          >
            {copied ? 'Copied!' : 'Copy details'}
          </button>
        </div>

        <p className="error-boundary-help subtle small">
          If this keeps happening, please{' '}
          <a
            href="https://github.com/factus10/Hinged/issues"
            target="_blank"
            rel="noreferrer"
          >
            open an issue on GitHub
          </a>
          {' '}and paste the copied details into the report. Click <em>Reload App</em> to
          start fresh, or <em>Try to recover</em> to clear the error in
          place — that may work or may show the error again immediately,
          depending on the cause.
        </p>

        {(stack || errorInfo?.componentStack) && (
          <details className="error-boundary-details">
            <summary>Technical details</summary>
            {stack && (
              <>
                <div className="error-boundary-section-label">Stack</div>
                <pre>{stack}</pre>
              </>
            )}
            {errorInfo?.componentStack && (
              <>
                <div className="error-boundary-section-label">Component stack</div>
                <pre>{errorInfo.componentStack}</pre>
              </>
            )}
          </details>
        )}
      </div>
    </div>
  );
}
