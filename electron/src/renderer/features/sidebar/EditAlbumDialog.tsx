import { useEffect, useState } from 'react';
import { Button, Dialog, Field, Input } from '@renderer/components/primitives';
import type { Album } from '@shared/types';
import { useUpdateAlbum } from '@renderer/lib/api';

interface Props {
  album: Album | null;
  onClose: () => void;
}

export function EditAlbumDialog({ album, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const update = useUpdateAlbum();

  useEffect(() => {
    if (album) {
      setName(album.name);
      setDescription(album.description);
    }
  }, [album]);

  const submit = async () => {
    if (!album) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await update.mutateAsync({
      id: album.id,
      patch: { name: trimmed, description: description.trim() },
    });
    onClose();
  };

  return (
    <Dialog
      open={album !== null}
      onClose={onClose}
      title="Edit Album"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!name.trim()}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Description">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
    </Dialog>
  );
}
