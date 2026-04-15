import { useState } from 'react';
import {
  useCountries,
  useCreateCountry,
  useDeleteCountry,
  useUpdateCountry,
} from '@renderer/lib/api';
import {
  Button,
  Dialog,
  Field,
  Input,
} from '@renderer/components/primitives';
import { catalogSystems } from '@shared/display';
import type { Country } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CountryManagementDialog({ open, onClose }: Props) {
  const { data: countries = [] } = useCountries();
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();
  const deleteCountry = useDeleteCountry();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  const selected = countries.find((c) => c.id === selectedId) ?? null;

  const filtered = search.trim()
    ? countries.filter((c) => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    : countries;

  const onCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const created = await createCountry.mutateAsync({ name: trimmed });
    setSelectedId(created.id);
    setNewName('');
  };

  const onDelete = (c: Country) => {
    if (!confirm(`Delete country "${c.name}"? Stamps referencing it will have their country cleared.`)) return;
    deleteCountry.mutate(c.id);
    if (selectedId === c.id) setSelectedId(null);
  };

  const updateName = (c: Country, name: string) => {
    updateCountry.mutate({ id: c.id, patch: { name } });
  };

  const updatePrefix = (c: Country, sys: string, value: string) => {
    const next = { ...c.catalogPrefixes };
    if (value) next[sys] = value;
    else delete next[sys];
    updateCountry.mutate({ id: c.id, patch: { catalogPrefixes: next } });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Countries"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="country-manager">
        <div className="country-manager-list">
          <Input
            placeholder="Search countries…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="country-list-scroll">
            <ul className="country-list">
              {filtered.map((c) => (
                <li
                  key={c.id}
                  className={selectedId === c.id ? 'selected' : ''}
                  onClick={() => setSelectedId(c.id)}
                >
                  <span>{c.name}</span>
                  <button
                    className="icon-btn"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c);
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="country-manager-new">
            <Input
              placeholder="New country name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void onCreate();
              }}
            />
            <Button onClick={() => void onCreate()} disabled={!newName.trim()}>
              Add
            </Button>
          </div>
        </div>

        <div className="country-manager-detail">
          {!selected ? (
            <div className="empty-state">Select a country to edit its catalog prefixes.</div>
          ) : (
            <>
              <Field label="Name">
                <Input
                  value={selected.name}
                  onChange={(e) => updateName(selected, e.target.value)}
                />
              </Field>
              <div className="country-prefix-heading">Catalog prefixes</div>
              <div className="country-prefix-grid">
                {catalogSystems
                  .filter((s) => s.value !== 'other')
                  .map((s) => (
                    <Field key={s.value} label={s.label}>
                      <Input
                        value={selected.catalogPrefixes[s.value] ?? ''}
                        onChange={(e) => updatePrefix(selected, s.value, e.target.value)}
                        placeholder="—"
                      />
                    </Field>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
