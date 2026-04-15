import { useEffect, useState } from 'react';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import { catalogSystems } from '@shared/display';
import type { Collection } from '@shared/types';
import { useCountries, useUpdateCollection } from '@renderer/lib/api';

interface Props {
  collection: Collection | null;
  onClose: () => void;
}

export function EditCollectionDialog({ collection, onClose }: Props) {
  const { data: countries = [] } = useCountries();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [catalogSystemRaw, setCatalogSystem] = useState('scott');
  const [countryId, setCountryId] = useState<string>('');
  const update = useUpdateCollection();

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description);
      setCatalogSystem(collection.catalogSystemRaw);
      setCountryId(collection.countryId != null ? String(collection.countryId) : '');
    }
  }, [collection]);

  const submit = async () => {
    if (!collection) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    await update.mutateAsync({
      id: collection.id,
      patch: {
        name: trimmed,
        description: description.trim(),
        catalogSystemRaw,
        countryId: countryId ? Number(countryId) : null,
      },
    });
    onClose();
  };

  return (
    <Dialog
      open={collection !== null}
      onClose={onClose}
      title="Edit Collection"
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
      <Field label="Catalog System">
        <Select value={catalogSystemRaw} onChange={(e) => setCatalogSystem(e.target.value)}>
          {catalogSystems.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Country" hint="Leave empty for a worldwide collection">
        <Select value={countryId} onChange={(e) => setCountryId(e.target.value)}>
          <option value="">— None (worldwide) —</option>
          {countries.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
    </Dialog>
  );
}
