import { useEffect, useState } from 'react';
import {
  useCountries,
  useCreateSeries,
  useDeleteSeries,
  useSeriesWithCounts,
  useUpdateSeries,
} from '@renderer/lib/api';
import {
  Button,
  Dialog,
  Field,
  Input,
  Select,
} from '@renderer/components/primitives';
import type { SeriesWithCount } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SeriesManagementDialog({ open, onClose }: Props) {
  const { data: series = [] } = useSeriesWithCounts();
  const { data: countries = [] } = useCountries();
  const createSeries = useCreateSeries();
  const updateSeries = useUpdateSeries();
  const deleteSeries = useDeleteSeries();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');

  // Editor draft state — keeps live edits responsive
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftCountryId, setDraftCountryId] = useState<string>('');
  const [draftYearStart, setDraftYearStart] = useState<string>('');
  const [draftYearEnd, setDraftYearEnd] = useState<string>('');

  const selected = series.find((s) => s.id === selectedId) ?? null;

  // Hydrate draft when selection changes
  useEffect(() => {
    if (selected) {
      setDraftName(selected.name);
      setDraftDescription(selected.description);
      setDraftCountryId(selected.countryId != null ? String(selected.countryId) : '');
      setDraftYearStart(selected.yearStart != null ? String(selected.yearStart) : '');
      setDraftYearEnd(selected.yearEnd != null ? String(selected.yearEnd) : '');
    } else {
      setDraftName('');
      setDraftDescription('');
      setDraftCountryId('');
      setDraftYearStart('');
      setDraftYearEnd('');
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered: SeriesWithCount[] = search.trim()
    ? series.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()))
    : series;

  const commit = (patch: Parameters<typeof updateSeries.mutate>[0]['patch']) => {
    if (!selected) return;
    updateSeries.mutate({ id: selected.id, patch });
  };

  const onCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const created = await createSeries.mutateAsync({ name: trimmed });
    setSelectedId(created.id);
    setNewName('');
  };

  const onDelete = (s: SeriesWithCount) => {
    const inUse = s.stampCount > 0;
    const msg = inUse
      ? `Delete series "${s.name}"? ${s.stampCount} stamp${s.stampCount === 1 ? '' : 's'} will have its series cleared (the stamps stay in your collection).`
      : `Delete series "${s.name}"?`;
    if (!confirm(msg)) return;
    deleteSeries.mutate(s.id);
    if (selectedId === s.id) setSelectedId(null);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Series"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="series-manager">
        <div className="series-manager-list">
          <Input
            placeholder="Search series…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="series-list-scroll">
            {filtered.length === 0 ? (
              <div className="empty-state subtle small" style={{ padding: '1.2rem 0.5rem' }}>
                No series yet.
              </div>
            ) : (
              <ul className="series-list">
                {filtered.map((s) => (
                  <li
                    key={s.id}
                    className={selectedId === s.id ? 'selected' : ''}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <span className="series-name">{s.name}</span>
                    <span className="series-count subtle small">
                      {s.stampCount} stamp{s.stampCount === 1 ? '' : 's'}
                    </span>
                    <button
                      className="icon-btn"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(s);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="series-manager-new">
            <Input
              placeholder="New series name"
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

        <div className="series-manager-detail">
          {!selected ? (
            <div className="empty-state">Select a series to edit its details.</div>
          ) : (
            <>
              <Field label="Name">
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    if (draftName.trim() && draftName !== selected.name) {
                      commit({ name: draftName.trim() });
                    }
                  }}
                />
              </Field>

              <Field label="Description" hint="Free text — historical notes, context, etc.">
                <Input
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  onBlur={() => {
                    if (draftDescription !== selected.description) {
                      commit({ description: draftDescription });
                    }
                  }}
                />
              </Field>

              <Field label="Country" hint="Most series are tied to a country">
                <Select
                  value={draftCountryId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDraftCountryId(v);
                    commit({ countryId: v ? Number(v) : null });
                  }}
                >
                  <option value="">— No country —</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="series-year-row">
                <Field label="Year start">
                  <Input
                    type="number"
                    value={draftYearStart}
                    onChange={(e) => setDraftYearStart(e.target.value)}
                    onBlur={() => {
                      const n = draftYearStart ? Number(draftYearStart) : null;
                      if (n !== selected.yearStart) {
                        commit({ yearStart: n });
                      }
                    }}
                  />
                </Field>
                <Field label="Year end">
                  <Input
                    type="number"
                    value={draftYearEnd}
                    onChange={(e) => setDraftYearEnd(e.target.value)}
                    onBlur={() => {
                      const n = draftYearEnd ? Number(draftYearEnd) : null;
                      if (n !== selected.yearEnd) {
                        commit({ yearEnd: n });
                      }
                    }}
                  />
                </Field>
              </div>

              <p className="subtle small" style={{ marginTop: '0.5rem' }}>
                {selected.stampCount} stamp{selected.stampCount === 1 ? '' : 's'} currently
                assigned to this series.
              </p>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}
