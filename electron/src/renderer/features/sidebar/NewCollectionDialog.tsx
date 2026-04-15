import { useState, useEffect } from 'react';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import { catalogSystems } from '@shared/display';
import { useCountries, useCreateCollection, useSettings } from '@renderer/lib/api';
import { useSelection } from '@renderer/state/selection';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NewCollectionDialog({ open, onClose }: Props) {
  const { data: countries = [] } = useCountries();
  const { data: settings } = useSettings();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [catalogSystemRaw, setCatalogSystem] = useState('scott');
  const [countryId, setCountryId] = useState<string>('');
  const createCollection = useCreateCollection();
  const { setSelection } = useSelection();

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      // Apply default catalog from settings when it's a built-in one.
      const raw = settings?.defaultCatalogSystemRaw ?? 'builtin:scott';
      if (raw.startsWith('builtin:')) {
        setCatalogSystem(raw.slice('builtin:'.length));
      } else {
        setCatalogSystem('scott');
      }
      setCountryId('');
    }
  }, [open, settings]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = await createCollection.mutateAsync({
      name: trimmed,
      description: description.trim(),
      catalogSystemRaw,
      countryId: countryId ? Number(countryId) : null,
    });
    setSelection({ type: 'collection', id: created.id });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Collection"
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
          placeholder="US Classics"
        />
      </Field>
      <Field label="Description">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
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
