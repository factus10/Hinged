import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, Field, Select } from '@renderer/components/primitives';
import type {
  CsvDuplicateAction,
  CsvFieldMapping,
  CsvMappableField,
} from '@shared/types';
import { qk } from '@renderer/lib/query';
import type { PendingCsvImport } from '@renderer/state/dialogs';

interface Props {
  pending: PendingCsvImport | null;
  onClose: () => void;
}

// Same list as CSV_MAPPABLE_FIELDS in @shared/types but typed for the iteration
// (importing the runtime constant from a type file would be a circular reuse).
const FIELDS: ReadonlyArray<{ key: CsvMappableField; label: string; required?: boolean }> = [
  { key: 'catalogNumber', label: 'Catalog Number', required: true },
  { key: 'country', label: 'Country' },
  { key: 'year', label: 'Year' },
  { key: 'denomination', label: 'Denomination' },
  { key: 'color', label: 'Color' },
  { key: 'gumCondition', label: 'Gum Condition' },
  { key: 'centeringGrade', label: 'Centering Grade' },
  { key: 'status', label: 'Status' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'tradeable', label: 'Tradeable' },
  { key: 'series', label: 'Series' },
  { key: 'notes', label: 'Notes' },
  { key: 'perforationGauge', label: 'Perforation' },
  { key: 'watermark', label: 'Watermark' },
  { key: 'purchasePrice', label: 'Purchase Price' },
  { key: 'purchaseDate', label: 'Purchase Date' },
  { key: 'acquisitionSource', label: 'Source' },
];

export function CsvImportDialog({ pending, onClose }: Props) {
  const qc = useQueryClient();

  const [mapping, setMapping] = useState<CsvFieldMapping>({ fields: {} });
  const [duplicateAction, setDuplicateAction] = useState<CsvDuplicateAction>('skip');
  const [hasHeader, setHasHeader] = useState(true);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    setMapping(pending.preview.guessedMapping);
    setHasHeader(true);
    setBusy(false);
    setFlash(null);
  }, [pending?.preview.text]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pending) return null;

  const setField = (field: CsvMappableField, idx: number | null) => {
    setMapping((prev) => ({ fields: { ...prev.fields, [field]: idx } }));
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const result = await window.hinged.csv.importWithMapping({
        albumId: pending.albumId,
        text: pending.preview.text,
        mapping,
        delimiter: pending.preview.delimiter,
        duplicateAction,
        hasHeader,
      });
      void qc.invalidateQueries({ queryKey: qk.stamps });
      void qc.invalidateQueries({ queryKey: qk.countries });
      const parts: string[] = [];
      if (result.imported) parts.push(`${result.imported} imported`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (result.skipped) parts.push(`${result.skipped} skipped`);
      setFlash(parts.length ? `CSV: ${parts.join(', ')}` : 'No rows imported');
      setTimeout(() => onClose(), 900);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const headers = pending.preview.headers;

  return (
    <Dialog
      open={pending !== null}
      onClose={onClose}
      title={
        pending.preview.source === 'clipboard'
          ? `Import pasted data into "${pending.albumName}"`
          : `Import CSV into "${pending.albumName}"`
      }
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void onImport()}
            disabled={busy || mapping.fields.catalogNumber == null}
          >
            {busy ? 'Importing…' : 'Import'}
          </Button>
        </>
      }
    >
      <div className="csv-import-summary subtle small">
        {pending.preview.totalRows} row{pending.preview.totalRows === 1 ? '' : 's'}
        {' · '}
        {pending.preview.delimiter === '\t' ? 'tab-separated' : 'comma-separated'}
        {pending.preview.path && ` · ${pending.preview.path.split('/').pop()}`}
      </div>

      <Field label="Source has a header row">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
          />
          <span className="subtle small">First row contains column names (skipped on import)</span>
        </label>
      </Field>

      <div className="settings-section-header" style={{ marginTop: '0.5rem' }}>
        Map columns
      </div>
      <div className="csv-mapping-grid">
        {FIELDS.map((f) => {
          const current = mapping.fields[f.key];
          return (
            <div key={f.key} className="csv-map-row">
              <span className="csv-map-label">
                {f.label}
                {f.required && <span style={{ color: 'var(--danger)' }}> *</span>}
              </span>
              <Select
                value={current == null ? '' : String(current)}
                onChange={(e) =>
                  setField(f.key, e.target.value === '' ? null : Number(e.target.value))
                }
              >
                <option value="">— Skip —</option>
                {headers.map((h, i) => (
                  <option key={i} value={i}>
                    {h || `Column ${i + 1}`}
                  </option>
                ))}
              </Select>
            </div>
          );
        })}
      </div>

      <div className="settings-section-header" style={{ marginTop: '0.5rem' }}>
        Duplicate handling
      </div>
      <Field
        label="If a row has a catalog number that already exists in this album"
        hint={
          duplicateAction === 'updateOnly'
            ? 'Rows whose catalog number is NOT in this album will be ignored — nothing new is created.'
            : duplicateAction === 'update'
              ? 'Only the columns you mapped will overwrite existing data. Unmapped fields are preserved.'
              : undefined
        }
      >
        <Select
          value={duplicateAction}
          onChange={(e) => setDuplicateAction(e.target.value as CsvDuplicateAction)}
        >
          <option value="skip">Skip duplicates</option>
          <option value="update">Update existing entries (and create new for unmatched)</option>
          <option value="updateOnly">Update existing only (ignore unmatched)</option>
          <option value="createNew">Create new entries (allow duplicates)</option>
        </Select>
      </Field>

      {flash && (
        <p
          className="small"
          style={{
            marginTop: '0.5rem',
            color: flash.startsWith('CSV') ? 'var(--owned)' : 'var(--danger)',
          }}
        >
          {flash}
        </p>
      )}
    </Dialog>
  );
}
