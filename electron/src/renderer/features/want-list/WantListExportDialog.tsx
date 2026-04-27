import { useEffect, useMemo, useState } from 'react';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import { useCountries, useStamps } from '@renderer/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Format = 'pdf' | 'markdown';

export function WantListExportDialog({ open, onClose }: Props) {
  const { data: countries = [] } = useCountries();
  const { data: stamps = [] } = useStamps();

  const [countryId, setCountryId] = useState<string>('');
  const [format, setFormat] = useState<Format>('pdf');
  const [title, setTitle] = useState('Want List');
  const [subtitle, setSubtitle] = useState('');
  const [includeSeries, setIncludeSeries] = useState(true);
  const [includeBudget, setIncludeBudget] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const wantedCount = useMemo(() => {
    const cid = countryId ? Number(countryId) : null;
    return stamps.filter((s) => {
      if (s.collectionStatusRaw !== 'wanted') return false;
      if (cid != null && s.countryId !== cid) {
        // Note: this check uses just the per-stamp country, not inherited
        // from the collection. Close enough as a preview count.
        return false;
      }
      return true;
    }).length;
  }, [stamps, countryId]);

  useEffect(() => {
    if (open) {
      setTitle('Want List');
      setSubtitle('');
      setCountryId('');
      setIncludeSeries(true);
      setIncludeBudget(true);
      setFormat('pdf');
      setFlash(null);
      setBusy(false);
    }
  }, [open]);

  const onExport = async () => {
    setBusy(true);
    setFlash(null);
    try {
      const opts = {
        countryId: countryId ? Number(countryId) : null,
        includeSeries,
        includeBudgetColumn: includeBudget,
        title: title.trim() || 'Want List',
        subtitle: subtitle.trim(),
      };
      const result =
        format === 'pdf'
          ? await window.hinged.wantList.exportPdf(opts)
          : await window.hinged.wantList.exportMarkdown(opts);
      if (result.ok) {
        setFlash(`Exported ${result.count} stamp${result.count === 1 ? '' : 's'} to ${result.path}`);
        setTimeout(() => onClose(), 1200);
      } else {
        setFlash(result.error ?? 'Export cancelled');
        setBusy(false);
      }
    } catch (err) {
      setFlash(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Print Want List"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void onExport()}
            disabled={busy || wantedCount === 0}
          >
            {busy ? 'Exporting…' : `Export as ${format.toUpperCase()}`}
          </Button>
        </>
      }
    >
      <p className="subtle small">
        Generates a printable list of every stamp marked <strong>Wanted</strong>,
        grouped by country and sorted naturally by catalog number.
      </p>

      <Field label="Country">
        <Select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Format">
        <Select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
          <option value="pdf">PDF (printable)</option>
          <option value="markdown">Markdown (.md)</option>
        </Select>
      </Field>

      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Subtitle" hint="e.g. 'For PIPEX 2026' — optional">
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </Field>

      <Field label="Columns">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeSeries}
            onChange={(e) => setIncludeSeries(e.target.checked)}
          />
          <span className="subtle small">Include Series column</span>
        </label>
      </Field>
      <Field label=" ">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeBudget}
            onChange={(e) => setIncludeBudget(e.target.checked)}
          />
          <span className="subtle small">
            Include Budget column (PDF only — empty cells for handwritten prices at the show)
          </span>
        </label>
      </Field>

      <p className="subtle small" style={{ marginTop: '0.5rem' }}>
        About {wantedCount} wanted stamp{wantedCount === 1 ? '' : 's'} match.
      </p>

      {flash && (
        <p
          className="small"
          style={{
            marginTop: '0.5rem',
            color: flash.startsWith('Exported') ? 'var(--owned)' : 'var(--danger)',
          }}
        >
          {flash}
        </p>
      )}
    </Dialog>
  );
}
