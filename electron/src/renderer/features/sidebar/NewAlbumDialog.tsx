import { useState, useEffect } from 'react';
import { Button, Dialog, Field, Input } from '@renderer/components/primitives';
import type { Collection } from '@shared/types';
import { useCreateAlbum } from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';

interface Props {
  collection: Collection | null;
  onClose: () => void;
}

export function NewAlbumDialog({ collection, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const createAlbum = useCreateAlbum();
  const { setSelection } = useSelection();

  useEffect(() => {
    if (collection) {
      setName('');
      setDescription('');
    }
  }, [collection]);

  const submit = async () => {
    if (!collection) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createAlbum.mutateAsync({
      collectionId: collection.id,
      name: trimmed,
      description: description.trim(),
    });
    setSelection({ type: 'album', id: created.id });
    onClose();
  };

  return (
    <Dialog
      open={collection !== null}
      onClose={onClose}
      title={collection ? `New Album in "${collection.name}"` : 'New Album'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!name.trim()}>
            Create
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="1847-1860"
        />
      </Field>
      <Field label="Description">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </Field>
    </Dialog>
  );
}
