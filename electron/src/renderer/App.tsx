import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from './features/sidebar/Sidebar';
import { StampList } from './features/stamp-list/StampList';
import { StampDetail } from './features/stamp-detail/StampDetail';
import { NewCollectionDialog } from './features/sidebar/NewCollectionDialog';
import { NewAlbumDialog } from './features/sidebar/NewAlbumDialog';
import { EditCollectionDialog } from './features/sidebar/EditCollectionDialog';
import { EditAlbumDialog } from './features/sidebar/EditAlbumDialog';
import { CountryManagementDialog } from './features/countries/CountryManagementDialog';
import { GapAnalysisDialog } from './features/gap-analysis/GapAnalysisDialog';
import { SettingsDialog } from './features/settings/SettingsDialog';
import { HelpDialog } from './features/help/HelpDialog';
import { ApplyTemplateDialog } from './features/templates/ApplyTemplateDialog';
import { CsvImportDialog } from './features/csv/CsvImportDialog';
import { SeriesManagementDialog } from './features/series/SeriesManagementDialog';
import { BulkAssignSeriesDialog } from './features/series/BulkAssignSeriesDialog';
import { StatisticsDialog } from './features/statistics/StatisticsDialog';
import type { CsvImportResult, ImportResult } from '@shared/types';
import { qk } from './lib/query';
import { useDialogs } from './state/dialogs';
import { useSelection } from './state/selection';
import { useCollections } from './lib/api';

export function App() {
  const qc = useQueryClient();
  const [flash, setFlash] = useState<string | null>(null);
  const dialogs = useDialogs();
  const { selection } = useSelection();
  const { data: collections = [] } = useCollections();

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    const invalidateAll = () => {
      void qc.invalidateQueries({ queryKey: qk.countries });
      void qc.invalidateQueries({ queryKey: qk.collections });
      void qc.invalidateQueries({ queryKey: qk.albums });
      void qc.invalidateQueries({ queryKey: qk.stamps });
    };
    const offImported = window.hinged.events.onBackupImported(({ result }) => {
      invalidateAll();
      setFlash(summarizeBackup(result));
    });
    const offExported = window.hinged.events.onBackupExported(({ path }) => {
      setFlash(`Exported to ${path}`);
    });
    const offCsvIn = window.hinged.events.onCsvImported(({ result }) => {
      invalidateAll();
      setFlash(summarizeCsv(result));
    });
    const offCsvOut = window.hinged.events.onCsvExported(({ path, count }) => {
      setFlash(`Exported ${count} stamp${count === 1 ? '' : 's'} to ${path}`);
    });
    return () => {
      offImported();
      offExported();
      offCsvIn();
      offCsvOut();
    };
  }, [qc]);

  // Menu → dialog wiring
  useEffect(() => {
    const offs: Array<() => void> = [
      window.hinged.events.onShowNewCollection(() => dialogs.openNewCollection()),
      window.hinged.events.onShowNewAlbum(() => {
        // Menu-triggered new album: pick the collection matching the current
        // selection when possible, otherwise the first collection.
        let target = collections[0] ?? null;
        if (selection.type === 'collection') {
          target = collections.find((c) => c.id === selection.id) ?? target;
        } else if (selection.type === 'album') {
          // Walk back to the album's parent
          target = collections.find((c) => c.id === /* parent */ -1) ?? target;
        }
        if (!target) {
          alert('Create a collection first.');
          return;
        }
        dialogs.openNewAlbum(target);
      }),
      window.hinged.events.onShowSettings(() => dialogs.openSettings()),
      window.hinged.events.onShowCountryManagement(() => dialogs.openCountryManagement()),
      window.hinged.events.onShowSeriesManagement(() => dialogs.openSeriesManagement()),
      window.hinged.events.onShowGapAnalysis(() => dialogs.openGapAnalysis()),
      window.hinged.events.onShowStatistics(() => dialogs.openStatistics()),
      window.hinged.events.onShowHelp(() => dialogs.openHelp()),
      window.hinged.events.onApplyTemplate(async () => {
        const res = await window.hinged.templates.peek();
        if (res.ok) dialogs.openApplyTemplate({ preview: res.preview, rawJson: res.rawJson });
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [dialogs, collections, selection]);

  return (
    <div className="shell">
      <header className="app-header" aria-hidden />
      {flash && <div className="flash">{flash}</div>}
      <main className="three-pane">
        <Sidebar />
        <StampList />
        <StampDetail />
      </main>

      {/* Dialog hosts */}
      <NewCollectionDialog
        open={dialogs.showNewCollection}
        onClose={() => dialogs.closeAll()}
      />
      <NewAlbumDialog
        collection={dialogs.newAlbumForCollection}
        onClose={() => dialogs.closeAll()}
      />
      <EditCollectionDialog
        collection={dialogs.editCollection}
        onClose={() => dialogs.closeAll()}
      />
      <EditAlbumDialog album={dialogs.editAlbum} onClose={() => dialogs.closeAll()} />
      <CountryManagementDialog
        open={dialogs.showCountryManagement}
        onClose={() => dialogs.closeAll()}
      />
      <GapAnalysisDialog
        open={dialogs.showGapAnalysis}
        onClose={() => dialogs.closeAll()}
      />
      <SettingsDialog open={dialogs.showSettings} onClose={() => dialogs.closeAll()} />
      <HelpDialog open={dialogs.showHelp} onClose={() => dialogs.closeAll()} />
      <ApplyTemplateDialog
        pending={dialogs.pendingTemplate}
        onClose={() => dialogs.closeAll()}
      />
      <CsvImportDialog
        pending={dialogs.pendingCsvImport}
        onClose={() => dialogs.closeAll()}
      />
      <SeriesManagementDialog
        open={dialogs.showSeriesManagement}
        onClose={() => dialogs.closeAll()}
      />
      <BulkAssignSeriesDialog
        stampIds={dialogs.bulkAssignSeriesIds}
        onClose={() => dialogs.closeAll()}
      />
      <StatisticsDialog
        open={dialogs.showStatistics}
        onClose={() => dialogs.closeAll()}
      />
    </div>
  );
}

function summarizeBackup(r: ImportResult): string {
  const parts: string[] = [];
  if (r.collectionsImported) parts.push(`${r.collectionsImported} collection(s)`);
  if (r.albumsImported) parts.push(`${r.albumsImported} album(s)`);
  if (r.stampsImported) parts.push(`${r.stampsImported} stamp(s)`);
  if (r.countriesImported) parts.push(`${r.countriesImported} country/countries`);
  return parts.length ? `Imported ${parts.join(', ')}` : 'No data imported';
}

function summarizeCsv(r: CsvImportResult): string {
  const parts: string[] = [];
  if (r.imported) parts.push(`${r.imported} imported`);
  if (r.updated) parts.push(`${r.updated} updated`);
  if (r.skipped) parts.push(`${r.skipped} skipped`);
  return parts.length ? `CSV: ${parts.join(', ')}` : 'CSV: nothing to import';
}
