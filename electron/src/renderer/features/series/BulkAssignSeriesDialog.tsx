import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dialog } from '@renderer/components/primitives';
import { SeriesPicker } from '@renderer/components/SeriesPicker';
import { useBulkUpdateStamps } from '@renderer/lib/api';
import { qk } from '@renderer/lib/query';

interface Props {
  /** Stamp ids to assign. Null/empty closes the dialog. */
  stampIds: number[] | null;
  /** Optional country to default newly-created series to. */
  defaultCountryId?: number | null;
  onClose: () => void;
}

export function BulkAssignSeriesDialog({
  stampIds,
  defaultCountryId,
  onClose,
}: Props) {
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const bulkUpdate = useBulkUpdateStamps();
  const qc = useQueryClient();

  const open = stampIds != null && stampIds.length > 0;

  const onApply = async () => {
    if (!stampIds) return;
    setBusy(true);
    try {
      await bulkUpdate.mutateAsync({ ids: stampIds, patch: { seriesId } });
      void qc.invalidateQueries({ queryKey: qk.stamps });
      setFlash(
        seriesId == null
          ? `Cleared series for ${stampIds.length} stamps`
          : `Assigned series to ${stampIds.length} stamps`,
      );
      setTimeout(onClose, 700);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        stampIds
          ? `Assign series to ${stampIds.length} stamp${stampIds.length === 1 ? '' : 's'}`
          : 'Assign series'
      }
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void onApply()} disabled={busy}>
            {busy ? 'Applying…' : 'Apply'}
          </Button>
        </>
      }
    >
      <p className="subtle small" style={{ marginBottom: '0.6rem' }}>
        Pick an existing series, or type a new name to create one.
        Leave it on <em>(none)</em> and click Apply to clear the series for the
        selected stamps.
      </p>

      <SeriesPicker
        value={seriesId}
        onChange={setSeriesId}
        defaultCountryId={defaultCountryId ?? null}
      />

      {flash && (
        <p
          className="small"
          style={{
            marginTop: '0.6rem',
            color: flash.startsWith('Assigned') || flash.startsWith('Cleared')
              ? 'var(--owned)'
              : 'var(--danger)',
          }}
        >
          {flash}
        </p>
      )}
    </Dialog>
  );
}
