import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import { catalogSystemLabel } from '@shared/display';
import type { PendingTemplate } from '@renderer/state/dialogs';
import { useCollections } from '@renderer/lib/api';
import { qk } from '@renderer/lib/query';
import { useSelection } from '@renderer/state/selection';

interface Props {
  pending: PendingTemplate | null;
  onClose: () => void;
}

export function ApplyTemplateDialog({ pending, onClose }: Props) {
  const { data: collections = [] } = useCollections();
  const qc = useQueryClient();
  const { setSelection } = useSelection();

  const [collectionChoice, setCollectionChoice] = useState<string>('new');
  const [albumName, setAlbumName] = useState('');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!pending) return;
    setAlbumName(pending.preview.name);
    // Default new-collection name from country + catalog system
    const countryPart = pending.preview.countryName
      ? `${pending.preview.countryName} `
      : '';
    setNewCollectionName(
      `${countryPart}(${catalogSystemLabel[pending.preview.catalogSystemRaw] ?? pending.preview.catalogSystemRaw})`,
    );
    // If at least one collection exists, default to the first
    setCollectionChoice(collections.length > 0 ? String(collections[0]!.id) : 'new');
    setFlash(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.preview.path]);

  if (!pending) return null;

  const onApply = async () => {
    setBusy(true);
    try {
      const targetCollectionId =
        collectionChoice === 'new' ? null : Number(collectionChoice);
      const result = await window.hinged.templates.apply(pending.rawJson, {
        targetCollectionId,
        albumName: albumName.trim() || pending.preview.name,
        newCollectionName: newCollectionName.trim() || undefined,
      });

      // Refresh everything that might have changed
      void qc.invalidateQueries({ queryKey: qk.countries });
      void qc.invalidateQueries({ queryKey: qk.collections });
      void qc.invalidateQueries({ queryKey: qk.albums });
      void qc.invalidateQueries({ queryKey: qk.stamps });

      // Navigate the sidebar to the new album
      setSelection({ type: 'album', id: result.albumId });

      setFlash(`Applied template — ${result.stampsCreated} stamps added`);
      // Brief flash, then close
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setFlash(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={pending !== null}
      onClose={onClose}
      title="Apply Template"
      footer={
        <>
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void onApply()}
            disabled={busy || !albumName.trim()}
          >
            {busy ? 'Applying…' : 'Apply'}
          </Button>
        </>
      }
    >
      <div className="template-summary">
        <div className="template-summary-name">{pending.preview.name}</div>
        {pending.preview.description && (
          <div className="template-summary-desc subtle small">
            {pending.preview.description}
          </div>
        )}
        <div className="template-summary-meta subtle small">
          <span>
            {pending.preview.stampCount} stamp
            {pending.preview.stampCount === 1 ? '' : 's'}
          </span>
          <span>
            ·{' '}
            {catalogSystemLabel[pending.preview.catalogSystemRaw] ??
              pending.preview.catalogSystemRaw}
          </span>
          {pending.preview.countryName && (
            <span>· {pending.preview.countryName}</span>
          )}
          {pending.preview.createdBy && (
            <span>· by {pending.preview.createdBy}</span>
          )}
        </div>
      </div>

      <Field label="Add to Collection">
        <Select
          value={collectionChoice}
          onChange={(e) => setCollectionChoice(e.target.value)}
        >
          <option value="new">— Create new collection —</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {collectionChoice === 'new' && (
        <Field label="New Collection Name">
          <Input
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
        </Field>
      )}

      <Field label="Album Name">
        <Input
          autoFocus
          value={albumName}
          onChange={(e) => setAlbumName(e.target.value)}
        />
      </Field>

      <p className="subtle small" style={{ marginTop: '0.4rem' }}>
        All {pending.preview.stampCount} stamps will be added to the new album with status set to <strong>Wanted</strong>. Mark them <strong>Owned</strong> as you acquire them.
      </p>

      {flash && (
        <p
          className="small"
          style={{ marginTop: '0.6rem', color: flash.startsWith('Applied') ? 'var(--owned)' : 'var(--danger)' }}
        >
          {flash}
        </p>
      )}
    </Dialog>
  );
}
