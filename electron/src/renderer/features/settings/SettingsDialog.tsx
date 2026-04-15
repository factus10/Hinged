import { useEffect, useState } from 'react';
import {
  useCreateCustomCatalog,
  useCustomCatalogs,
  useDeleteCustomCatalog,
  useSettings,
  useUpdateCustomCatalog,
  useUpdateSettings,
} from '@renderer/lib/api';
import { Button, Dialog, Field, Input, Select } from '@renderer/components/primitives';
import {
  catalogSystems,
  centeringGrades,
  collectionStatuses,
  gumConditions,
} from '@shared/display';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const { data: settings } = useSettings();
  const { data: customCatalogs = [] } = useCustomCatalogs();
  const updateSettings = useUpdateSettings();
  const createCatalog = useCreateCustomCatalog();
  const updateCatalog = useUpdateCustomCatalog();
  const deleteCatalog = useDeleteCustomCatalog();

  const [currency, setCurrency] = useState('$');
  const [newCatalogName, setNewCatalogName] = useState('');

  useEffect(() => {
    if (settings) setCurrency(settings.currencySymbol);
  }, [settings]);

  if (!settings) return null;

  const set = (patch: Partial<typeof settings>) => updateSettings.mutate(patch);

  const createCat = async () => {
    const name = newCatalogName.trim();
    if (!name) return;
    await createCatalog.mutateAsync(name);
    setNewCatalogName('');
  };

  const builtInOptions = catalogSystems.map((c) => ({
    value: `builtin:${c.value}`,
    label: c.label,
  }));
  const customOptions = customCatalogs.map((c) => ({
    value: `custom:${c.name}`,
    label: `${c.name} (custom)`,
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Settings"
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}
    >
      <div className="settings-section-header">Defaults for new stamps</div>

      <Field label="Default Catalog System">
        <Select
          value={settings.defaultCatalogSystemRaw}
          onChange={(e) => set({ defaultCatalogSystemRaw: e.target.value })}
        >
          <optgroup label="Built-in">
            {builtInOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </optgroup>
          {customOptions.length > 0 && (
            <optgroup label="Custom">
              {customOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Field>

      <Field label="Default Status">
        <Select
          value={settings.defaultCollectionStatusRaw}
          onChange={(e) => set({ defaultCollectionStatusRaw: e.target.value })}
        >
          {collectionStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Default Gum Condition">
        <Select
          value={settings.defaultGumConditionRaw}
          onChange={(e) => set({ defaultGumConditionRaw: e.target.value })}
        >
          <option value="">— No default —</option>
          {gumConditions.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Default Centering">
        <Select
          value={settings.defaultCenteringGradeRaw}
          onChange={(e) => set({ defaultCenteringGradeRaw: e.target.value })}
        >
          <option value="">— No default —</option>
          {centeringGrades.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Currency Symbol">
        <Input
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          onBlur={() => set({ currencySymbol: currency })}
        />
      </Field>

      <div className="settings-section-header" style={{ marginTop: '0.75rem' }}>
        Auto-backup on launch
      </div>

      <Field
        label="Backup Folder"
        hint={
          settings.autoBackupDir
            ? 'A timestamped .hinged file is written here each time the app starts.'
            : 'Pick a folder to enable automatic backups on launch.'
        }
      >
        <div className="row">
          <Input
            value={settings.autoBackupDir}
            readOnly
            placeholder="(disabled)"
            onClick={async () => {
              const picked = await window.hinged.dialog.chooseDirectory();
              if (picked != null) set({ autoBackupDir: picked });
            }}
            style={{ cursor: 'pointer' }}
          />
          <Button
            onClick={async () => {
              const picked = await window.hinged.dialog.chooseDirectory();
              if (picked != null) set({ autoBackupDir: picked });
            }}
          >
            Choose…
          </Button>
          {settings.autoBackupDir && (
            <Button onClick={() => set({ autoBackupDir: '' })}>Disable</Button>
          )}
        </div>
      </Field>

      <Field label="Keep last N backups">
        <Input
          type="number"
          min={1}
          value={settings.autoBackupKeep}
          onChange={(e) => set({ autoBackupKeep: e.target.value || '5' })}
        />
      </Field>

      <div className="settings-section-header" style={{ marginTop: '0.75rem' }}>
        Custom catalog systems
      </div>

      {customCatalogs.length === 0 ? (
        <div className="subtle small" style={{ marginBottom: '0.25rem' }}>
          None yet. Custom catalogs are useful for rare specialized catalogs not in the built-in list.
        </div>
      ) : (
        <ul className="custom-catalog-list">
          {customCatalogs.map((c) => (
            <li key={c.id}>
              <Input
                value={c.name}
                onChange={(e) =>
                  updateCatalog.mutate({ id: c.id, name: e.target.value })
                }
              />
              <button
                className="icon-btn"
                title="Delete"
                onClick={() => {
                  if (confirm(`Delete custom catalog "${c.name}"?`)) {
                    deleteCatalog.mutate(c.id);
                  }
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="row" style={{ marginTop: '0.4rem' }}>
        <Input
          placeholder="New custom catalog name"
          value={newCatalogName}
          onChange={(e) => setNewCatalogName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void createCat();
          }}
        />
        <Button onClick={() => void createCat()} disabled={!newCatalogName.trim()}>
          Add
        </Button>
      </div>
    </Dialog>
  );
}
