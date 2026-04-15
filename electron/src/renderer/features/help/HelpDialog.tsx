import { useState } from 'react';
import { Button, Dialog } from '@renderer/components/primitives';

interface Topic {
  id: string;
  title: string;
  body: React.ReactNode;
}

const TOPICS: Topic[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    body: (
      <>
        <p>
          Hinged organizes your stamp collection into <strong>Collections</strong> (a catalog
          system like Scott or Michel, optionally tied to a country) that contain{' '}
          <strong>Albums</strong>, which in turn contain individual <strong>Stamps</strong>.
        </p>
        <p>
          To get started, create a new collection with <kbd>⌘⇧N</kbd>, add an album inside it,
          select the album, and use the <strong>+ Stamp</strong> button to add stamps. Click a
          stamp in the list to edit its fields in the right pane. Changes save automatically
          when you tab out of a field or pick a new value.
        </p>
      </>
    ),
  },
  {
    id: 'collections',
    title: 'Collections',
    body: (
      <>
        <p>
          A collection groups albums under a single catalog system. Typical uses: "US Classics
          (Scott)", "German Reich (Michel)", "Japan (Sakura)".
        </p>
        <p>
          If you set a country on a collection, that country&apos;s catalog prefix for the chosen
          catalog system is prepended to every stamp&apos;s display number automatically. Leave
          the country empty for worldwide collections.
        </p>
        <p>
          Double-click a collection in the sidebar (or click the gear icon) to rename it,
          change catalog system, or swap its country.
        </p>
      </>
    ),
  },
  {
    id: 'albums',
    title: 'Albums',
    body: (
      <>
        <p>
          Albums are subdivisions of a collection — usually by era or theme: "1847–1860",
          "Airmail", "Commemoratives". You can add a new album from the + button that appears
          on a collection row.
        </p>
        <p>Double-click an album to rename it.</p>
      </>
    ),
  },
  {
    id: 'stamps',
    title: 'Stamps',
    body: (
      <>
        <p>
          Each stamp tracks a catalog number, year(s), denomination, color, perforation,
          watermark, gum condition, centering grade, collection status, notes, purchase price,
          and source. Changes autosave.
        </p>
        <p>
          Catalog numbers sort naturally: 1, 2, 10, 435, 435a, 435b, C1, C2, C10. Alpha
          suffixes and catalog prefixes are handled correctly.
        </p>
        <p>
          You can attach an image to a stamp from the detail pane. The image is copied into
          your app data folder so backups and syncing stay self-contained.
        </p>
      </>
    ),
  },
  {
    id: 'smart-collections',
    title: 'Smart Collections',
    body: (
      <>
        <p>
          The four smart collections at the top of the sidebar show filtered views across every
          collection and album:
        </p>
        <ul>
          <li><strong>All Owned</strong> — every stamp marked Owned</li>
          <li><strong>Want List</strong> — every stamp marked Wanted</li>
          <li><strong>Not Collecting</strong> — every stamp you&apos;ve marked as outside your scope</li>
          <li><strong>Recent Additions</strong> — stamps created in the last 30 days</li>
        </ul>
      </>
    ),
  },
  {
    id: 'import-export',
    title: 'Import &amp; Export',
    body: (
      <>
        <p>
          Hinged uses two file formats:
        </p>
        <ul>
          <li>
            <strong>.hinged backups</strong> — complete snapshots of every collection, album,
            stamp, country, and image. Use <kbd>File → Export Backup</kbd> (<kbd>⌘⇧E</kbd>).
            Import with merge (keeps existing data) or replace (wipes first).
          </li>
          <li>
            <strong>.csv files</strong> — spreadsheet exchange for stamps only. Export the
            current view via <kbd>File → Export CSV</kbd>. Import into a selected album via{' '}
            <kbd>File → Import CSV into Selected Album</kbd>. The column order matches the
            native Swift app.
          </li>
        </ul>
        <p>
          Both formats are bidirectionally compatible with the original macOS Swift app, so you
          can move data between the two freely.
        </p>
      </>
    ),
  },
  {
    id: 'gap-analysis',
    title: 'Gap Analysis',
    body: (
      <>
        <p>
          <kbd>Tools → Gap Analysis</kbd> helps you see how close to complete a country&apos;s
          collection is. Pick a country and year range, and you&apos;ll see counts of owned vs
          wanted, a completion percentage, and any catalog-number gaps between your lowest and
          highest entries that aren&apos;t accounted for.
        </p>
      </>
    ),
  },
  {
    id: 'countries',
    title: 'Countries',
    body: (
      <>
        <p>
          <kbd>Tools → Countries</kbd> manages the list of countries and their per-catalog-system
          prefixes. When you set a prefix like <code>US</code> for Scott on the United States,
          every stamp in a US/Scott collection is displayed as <code>US 123</code> instead of
          just <code>123</code>.
        </p>
      </>
    ),
  },
  {
    id: 'settings',
    title: 'Settings',
    body: (
      <>
        <p>
          <kbd>Tools → Settings</kbd> (<kbd>⌘,</kbd>) sets the defaults used when adding new
          stamps — catalog system, status, gum condition, centering, and currency symbol.
        </p>
        <p>
          Custom catalog systems can also be managed here. They&apos;re useful for specialized
          or regional catalogs that aren&apos;t in the built-in list.
        </p>
      </>
    ),
  },
  {
    id: 'shortcuts',
    title: 'Keyboard Shortcuts',
    body: (
      <>
        <table className="shortcut-table">
          <tbody>
            <tr><td><kbd>⌘⇧N</kbd></td><td>New Collection</td></tr>
            <tr><td><kbd>⌘⌥N</kbd></td><td>New Album</td></tr>
            <tr><td><kbd>⌘⇧E</kbd></td><td>Export Backup</td></tr>
            <tr><td><kbd>⌘,</kbd></td><td>Settings</td></tr>
            <tr><td><kbd>⌘?</kbd></td><td>Help</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HelpDialog({ open, onClose }: Props) {
  const [topicId, setTopicId] = useState<string>(TOPICS[0]!.id);
  const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0]!;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Hinged Help"
      footer={<Button variant="primary" onClick={onClose}>Close</Button>}
    >
      <div className="help-layout">
        <ul className="help-topics">
          {TOPICS.map((t) => (
            <li
              key={t.id}
              className={t.id === topicId ? 'selected' : ''}
              onClick={() => setTopicId(t.id)}
            >
              {t.title}
            </li>
          ))}
        </ul>
        <div className="help-content">
          <h3>{topic.title}</h3>
          {topic.body}
        </div>
      </div>
    </Dialog>
  );
}
