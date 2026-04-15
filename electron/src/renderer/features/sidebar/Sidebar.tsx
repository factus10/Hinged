import { useMemo } from 'react';
import {
  useAlbums,
  useCollections,
  useCountries,
  useDeleteAlbum,
  useDeleteCollection,
} from '@renderer/lib/api';
import { useSelection, type Selection } from '@renderer/state/selection';
import { useDialogs } from '@renderer/state/dialogs';
import type { Album, Collection } from '@shared/types';
import { catalogSystemLabel } from '@shared/display';
import { Button } from '@renderer/components/primitives';

const SMART_ITEMS: Array<{
  kind: 'allOwned' | 'wantList' | 'notCollecting' | 'recentAdditions' | 'trash';
  label: string;
}> = [
  { kind: 'allOwned', label: 'All Owned' },
  { kind: 'wantList', label: 'Want List' },
  { kind: 'notCollecting', label: 'Not Collecting' },
  { kind: 'recentAdditions', label: 'Recent Additions' },
  { kind: 'trash', label: 'Trash' },
];

function isSelected(sel: Selection, target: Selection): boolean {
  if (sel.type !== target.type) return false;
  if (sel.type === 'smart' && target.type === 'smart') return sel.kind === target.kind;
  if (sel.type === 'collection' && target.type === 'collection') return sel.id === target.id;
  if (sel.type === 'album' && target.type === 'album') return sel.id === target.id;
  return sel.type === 'none';
}

export function Sidebar() {
  const { selection, setSelection } = useSelection();
  const { data: collections = [] } = useCollections();
  const { data: albums = [] } = useAlbums();
  const { data: countries = [] } = useCountries();
  const deleteCollection = useDeleteCollection();
  const deleteAlbum = useDeleteAlbum();
  const dialogs = useDialogs();

  const albumsByCollection = useMemo(() => {
    const m = new Map<number, Album[]>();
    for (const a of albums) {
      const arr = m.get(a.collectionId) ?? [];
      arr.push(a);
      m.set(a.collectionId, arr);
    }
    return m;
  }, [albums]);

  const countriesById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of countries) m.set(c.id, c.name);
    return m;
  }, [countries]);

  const onDeleteCollection = (c: Collection) => {
    const albumCount = albumsByCollection.get(c.id)?.length ?? 0;
    const msg =
      albumCount > 0
        ? `Delete "${c.name}" and its ${albumCount} album${albumCount === 1 ? '' : 's'} (and all stamps inside)?`
        : `Delete "${c.name}"?`;
    if (!confirm(msg)) return;
    deleteCollection.mutate(c.id);
    if (selection.type === 'collection' && selection.id === c.id) {
      setSelection({ type: 'none' });
    }
  };

  const onDeleteAlbum = (a: Album) => {
    if (!confirm(`Delete album "${a.name}" and all stamps inside?`)) return;
    deleteAlbum.mutate(a.id);
    if (selection.type === 'album' && selection.id === a.id) {
      setSelection({ type: 'none' });
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Smart Collections</span>
        </div>
        <ul className="sidebar-list">
          {SMART_ITEMS.map((item) => {
            const sel: Selection = { type: 'smart', kind: item.kind };
            return (
              <li
                key={item.kind}
                className={isSelected(selection, sel) ? 'selected' : ''}
                onClick={() => setSelection(sel)}
              >
                <span className="sidebar-item-label">{item.label}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>Collections</span>
          <Button variant="ghost" onClick={dialogs.openNewCollection} title="New Collection (⌘⇧N)">
            +
          </Button>
        </div>
        <ul className="sidebar-list">
          {collections.length === 0 && (
            <li className="sidebar-empty">No collections yet</li>
          )}
          {collections.map((c) => {
            const collSel: Selection = { type: 'collection', id: c.id };
            const cAlbums = albumsByCollection.get(c.id) ?? [];
            const countryName = c.countryId != null ? countriesById.get(c.countryId) : undefined;
            return (
              <li key={c.id} className="sidebar-collection-group">
                <div
                  className={`sidebar-collection ${isSelected(selection, collSel) ? 'selected' : ''}`}
                  onClick={() => setSelection(collSel)}
                  onDoubleClick={() => dialogs.openEditCollection(c)}
                >
                  <div className="sidebar-item-main">
                    <span className="sidebar-item-label">{c.name}</span>
                    <span className="sidebar-item-sub">
                      {catalogSystemLabel[c.catalogSystemRaw] ?? c.catalogSystemRaw}
                      {countryName ? ` • ${countryName}` : ''}
                    </span>
                  </div>
                  <div className="sidebar-item-actions">
                    <button
                      className="icon-btn"
                      title="Edit Collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        dialogs.openEditCollection(c);
                      }}
                    >
                      ⚙
                    </button>
                    <button
                      className="icon-btn"
                      title="New Album"
                      onClick={(e) => {
                        e.stopPropagation();
                        dialogs.openNewAlbum(c);
                      }}
                    >
                      +
                    </button>
                    <button
                      className="icon-btn"
                      title="Delete Collection"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCollection(c);
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                {cAlbums.length > 0 && (
                  <ul className="sidebar-album-list">
                    {cAlbums.map((a) => {
                      const albSel: Selection = { type: 'album', id: a.id };
                      return (
                        <li
                          key={a.id}
                          className={`sidebar-album ${isSelected(selection, albSel) ? 'selected' : ''}`}
                          onClick={() => setSelection(albSel)}
                          onDoubleClick={() => dialogs.openEditAlbum(a)}
                        >
                          <span className="sidebar-item-label">{a.name}</span>
                          <div className="sidebar-item-actions">
                            <button
                              className="icon-btn"
                              title="Edit Album"
                              onClick={(e) => {
                                e.stopPropagation();
                                dialogs.openEditAlbum(a);
                              }}
                            >
                              ⚙
                            </button>
                            <button
                              className="icon-btn"
                              title="Delete Album"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteAlbum(a);
                              }}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
