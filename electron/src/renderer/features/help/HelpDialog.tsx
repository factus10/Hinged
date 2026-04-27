import { useEffect, useRef, useState } from 'react';
import { Button, Dialog } from '@renderer/components/primitives';

interface Topic {
  id: string;
  title: string;
  body: React.ReactNode;
}

// Tiny helpers used in topic bodies for consistency.
const Tip = ({ children }: { children: React.ReactNode }) => (
  <div className="help-tip">
    <span className="label">Tip</span>
    {children}
  </div>
);
const Warn = ({ children }: { children: React.ReactNode }) => (
  <div className="help-warning">
    <span className="label">Heads up</span>
    {children}
  </div>
);

const TOPICS: Topic[] = [
  // ---------- Welcome ----------
  {
    id: 'welcome',
    title: 'Welcome to Hinged',
    body: (
      <>
        <p>
          Hinged is a desktop app that helps you keep track of a stamp collection.
          You can record what you own, what you want, what each stamp looks like
          and where you bought it, and then search and browse your collection any
          way you like. Hinged was built by a stamp collector, for stamp
          collectors. It is free, open-source, and works the same on Mac,
          Windows, and Linux computers.
        </p>
        <p>
          This help system is here to walk you through everything Hinged can
          do, in plain language and at a pace that suits you. The topics on
          the left are arranged from the most basic (getting around the window,
          adding your first stamp) through to advanced features (templates,
          gap analysis). You don&apos;t need to read them in order. Click any
          topic that catches your eye.
        </p>
        <Tip>
          You can re-open this help window any time with <kbd>⌘?</kbd> on a
          Mac or <kbd>F1</kbd> on Windows / Linux. There is no quiz at the
          end.
        </Tip>
        <p>
          A few principles to keep in mind from the start:
        </p>
        <ul>
          <li><strong>Your data lives on your computer.</strong> Hinged never sends your collection anywhere. There is no online account.</li>
          <li><strong>Edits save automatically.</strong> When you change something in the right-hand pane, you don&apos;t need to click a Save button.</li>
          <li><strong>Deleted stamps go to a Trash list, not into the void.</strong> If you remove a stamp by mistake, you can usually get it back.</li>
          <li><strong>Backups are easy.</strong> Hinged can write a timestamped backup of your whole collection each time you start the app — see the <em>Backups and safety</em> topic.</li>
        </ul>
        <p>
          If something in Hinged isn&apos;t obvious, that&apos;s a bug in the
          design and we&apos;d like to fix it. The <em>Getting help and
          reporting issues</em> topic at the very bottom of this list shows
          you how.
        </p>
      </>
    ),
  },

  // ---------- Window orientation ----------
  {
    id: 'window',
    title: 'Getting around the window',
    body: (
      <>
        <p>
          When Hinged opens, the window is divided into three vertical panes
          side by side. Each pane has a clear job:
        </p>
        <h4>The left pane — sidebar</h4>
        <p>
          The narrow left column lists your <strong>Collections</strong> and
          their <strong>Albums</strong>, plus a section at the top called
          <strong> Smart Collections</strong> (more on those later). Clicking
          any item here picks what you want to see in the middle pane.
        </p>
        <h4>The middle pane — stamp list</h4>
        <p>
          The wide middle area shows the stamps that match whatever is
          highlighted in the sidebar. At the top is a toolbar with a search
          box, a status filter, and an <strong>Add Stamp</strong> button.
          Below the toolbar, when an album is selected, you&apos;ll see a
          one-line <em>Quick Add</em> bar for typing in stamps fast.
        </p>
        <h4>The right pane — stamp detail</h4>
        <p>
          When you click a single stamp in the middle pane, every detail of
          that stamp appears in the right column. You can edit any field
          there. Changes save automatically.
        </p>
        <h4>The menu bar</h4>
        <p>
          On macOS the menu bar is at the very top of the screen. On Windows
          and Linux the menus appear inside the Hinged window. The menus you
          care about most are <strong>File</strong> (downloads, exports,
          backups), <strong>Tools</strong> (Countries, Gap Analysis,
          Settings), and <strong>Help</strong>.
        </p>
        <Tip>
          You can resize the panes by dragging the divider lines between them.
          Hinged remembers your preferred sizes the next time you launch.
        </Tip>
      </>
    ),
  },

  // ---------- Concepts ----------
  {
    id: 'concepts',
    title: 'Collections, albums, stamps',
    body: (
      <>
        <p>
          Hinged organizes a collection in a hierarchy with three levels.
          Knowing how they fit together makes the rest of the app much easier
          to navigate.
        </p>

        <h4>Stamps</h4>
        <p>
          A stamp is one entry in your collection — one specific stamp
          identified by its catalog number. It has fields like denomination,
          color, condition, year, and so on.
        </p>

        <h4>Albums</h4>
        <p>
          An album is a folder of stamps that belong together. It works like
          a page or a section in a real-world stamp album. Common ways to
          divide a collection into albums:
        </p>
        <ul>
          <li>By era — <em>&ldquo;1847–1860&rdquo;</em>, <em>&ldquo;Victorian&rdquo;</em>, <em>&ldquo;Modern Commemoratives&rdquo;</em></li>
          <li>By type — <em>&ldquo;Airmail&rdquo;</em>, <em>&ldquo;Postage Due&rdquo;</em>, <em>&ldquo;Officials&rdquo;</em></li>
          <li>By topic — <em>&ldquo;Birds&rdquo;</em>, <em>&ldquo;Locomotives&rdquo;</em></li>
          <li>However you actually think about your collection</li>
        </ul>

        <h4>Collections</h4>
        <p>
          A collection is a top-level grouping that owns one or more albums.
          Each collection has one <strong>catalog system</strong> (Scott,
          Stanley Gibbons, Michel, Yvert et Tellier, Sakura, Facit, or one
          you&apos;ve defined yourself), and optionally one
          <strong>country</strong>. Examples:
        </p>
        <ul>
          <li><em>&ldquo;US Classics (Scott)&rdquo;</em> — country: United States, system: Scott</li>
          <li><em>&ldquo;Worldwide (Michel)&rdquo;</em> — no country, system: Michel</li>
          <li><em>&ldquo;Japan (Sakura)&rdquo;</em> — country: Japan, system: Sakura</li>
        </ul>

        <Tip>
          Setting a country on a collection is what tells Hinged how to
          display catalog numbers. A collection of US Scott stamps with
          country &ldquo;United States&rdquo; will show its stamps as
          <em> US 1, US 2, US 3</em>. Without a country, the same stamps would
          show as <em>1, 2, 3</em>.
        </Tip>

        <h4>Putting them together</h4>
        <p>
          A typical Hinged sidebar looks something like this:
        </p>
        <pre style={{ fontSize: '11.5px', lineHeight: 1.55 }}>{`Collections
├── US Classics (Scott)
│   ├── 1847–1860
│   ├── 1861–1869 (Civil War era)
│   └── Banknotes
├── United Kingdom (SG)
│   ├── Queen Victoria
│   └── King Edward VII
└── Worldwide thematic
    ├── Birds
    └── Trains`}</pre>
      </>
    ),
  },

  // ---------- First collection ----------
  {
    id: 'first-collection',
    title: 'Your first collection (a recipe)',
    body: (
      <>
        <p>
          Here&apos;s a step-by-step walkthrough for setting up a brand-new
          collection. We&apos;ll create a U.S. Scott collection with one
          album for the 1847–1860 era and add a single stamp.
        </p>

        <ol className="help-steps">
          <li>
            <strong>Create the collection.</strong> Click the <strong>+</strong>
            button next to the word <em>Collections</em> in the sidebar. (Or
            press <kbd>⌘⇧N</kbd> on Mac, <kbd>Ctrl+Shift+N</kbd> on
            Windows/Linux.) A small window opens.
          </li>
          <li>
            For <strong>Name</strong>, type something like <em>US Classics</em>.
          </li>
          <li>
            For <strong>Catalog System</strong>, pick <em>Scott</em>.
          </li>
          <li>
            For <strong>Country</strong>, pick <em>United States</em>. (Hinged
            comes pre-loaded with about 180 countries; this list is just a
            convenience — you can edit it any time.)
          </li>
          <li>
            Click <strong>Create</strong>. Your new collection appears in the
            sidebar.
          </li>
        </ol>

        <p>Now we add an album inside it.</p>

        <ol className="help-steps">
          <li>
            Hover your mouse over the <em>US Classics</em> row in the
            sidebar. A few small icons appear on the right side of that row.
            Click the <strong>+</strong> icon. (Or press <kbd>⌘⌥N</kbd> on
            Mac, <kbd>Ctrl+Alt+N</kbd> on Windows/Linux.)
          </li>
          <li>
            Type a name: <em>1847–1860</em>. The dash is just a regular
            hyphen.
          </li>
          <li>
            Click <strong>Create</strong>. The album appears nested under the
            collection in the sidebar, and is selected automatically.
          </li>
        </ol>

        <p>Finally, let&apos;s add one stamp.</p>

        <ol className="help-steps">
          <li>
            Look at the middle pane. Just under the toolbar, there&apos;s a
            small bar that says <em>Add:</em> with three boxes for Catalog
            #, Year, and Denomination. This is the Quick Add bar.
          </li>
          <li>
            Type <code>1</code> in the catalog number box.
          </li>
          <li>
            Press <kbd>Tab</kbd> and type <code>1847</code> for the year.
          </li>
          <li>
            Press <kbd>Tab</kbd> and type <code>5c</code> for the
            denomination.
          </li>
          <li>
            Press <kbd>Enter</kbd>. The stamp is added to the album, the boxes
            clear, and the catalog number box is ready for the next entry.
          </li>
        </ol>

        <p>
          You should now see one stamp in the middle pane, with the catalog
          number displayed as <strong>US 1</strong> (the &ldquo;US&rdquo;
          prefix is added automatically because you set the country on the
          collection).
        </p>

        <Tip>
          Click the stamp once to select it. The right pane now shows every
          field you can set — color, condition, purchase price, notes, an
          image, and so on. Edit anything there and it saves automatically.
        </Tip>

        <p>Repeat with your other stamps. That&apos;s really all there is to it.</p>
      </>
    ),
  },

  // ---------- Adding stamps ----------
  {
    id: 'adding',
    title: 'Adding stamps (five ways)',
    body: (
      <>
        <p>
          Depending on whether you&apos;re entering one stamp or hundreds,
          Hinged offers different ways to get them in. Pick whichever fits
          what you&apos;re doing.
        </p>

        <h4>1. The Quick Add bar — fastest for typing</h4>
        <p>
          When an album is selected, a single-row form appears at the top of
          the stamp list with three boxes: <em>Catalog #</em>, <em>Year</em>,
          and <em>Denomination</em>. Type, press <kbd>Enter</kbd>, the stamp
          is added and the boxes clear for the next one. You can add fifty
          stamps in a minute without touching the mouse.
        </p>
        <p>
          This is the right tool for adding a batch from a price list,
          dealer&apos;s circular, or stamp show purchase.
        </p>

        <h4>2. The + Stamp button — fastest for one-at-a-time</h4>
        <p>
          The <strong>+ Stamp</strong> button at the top right of the stamp
          list adds an empty stamp to the current album and selects it for
          editing. Use this when you want to fill in lots of fields at once
          (color, gum condition, perforation, notes, image) right away.
        </p>

        <h4>3. CSV import — bringing in a spreadsheet</h4>
        <p>
          If you&apos;ve been keeping your collection in a spreadsheet
          (Excel, Numbers, Google Sheets), you can bring it straight into
          Hinged. Select the album you want to import into, then choose
          <strong> File &rarr; Import CSV into Selected Album&hellip;</strong>
          A wizard helps you match your spreadsheet&apos;s columns to
          Hinged&apos;s fields. The <em>Importing from a spreadsheet</em>
          topic walks through this in detail.
        </p>

        <h4>4. Paste from a spreadsheet — drop in a few rows</h4>
        <p>
          For pasting a small block of rows quickly, you don&apos;t need to
          save a CSV file. Highlight some rows in Excel or Numbers, copy
          them with <kbd>⌘C</kbd> / <kbd>Ctrl+C</kbd>, click on the
          stamp-list area in Hinged (anywhere except inside an editing
          field), and press <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd>. The same
          column-mapping wizard opens.
        </p>

        <h4>5. Apply a community template — start from a catalog skeleton</h4>
        <p>
          A template is a file containing the catalog scaffolding for a
          range of stamps — every catalog number, year, denomination, and
          color, but no ownership information. Other collectors share them.
          When you apply one, Hinged creates a new album with every entry
          marked as Wanted, and you flip stamps to Owned as you acquire
          them. See the <em>Templates</em> topic.
        </p>
      </>
    ),
  },

  // ---------- Editing stamps ----------
  {
    id: 'editing',
    title: 'Editing a stamp',
    body: (
      <>
        <p>
          Click any stamp in the middle-pane list once. The right pane fills
          with every field for that stamp. Change anything you like.
        </p>

        <h4>How saving works</h4>
        <p>
          You don&apos;t have to click Save. Hinged commits the change in two
          situations:
        </p>
        <ul>
          <li>For text fields (catalog number, color, notes, etc.) — when you click somewhere else, or when you press <kbd>Tab</kbd> to move to the next field</li>
          <li>For dropdowns and checkboxes — immediately, the moment you change the value</li>
        </ul>

        <h4>The fields, briefly</h4>
        <ul>
          <li><strong>Catalog Number</strong> — the identifier from your collection&apos;s catalog system. The country prefix is added automatically when displayed.</li>
          <li><strong>Status</strong> — Owned, Wanted, or Not Collecting. Drives the smart collections.</li>
          <li><strong>Year Start / Year End</strong> — single year or year range (for stamps issued over multiple years).</li>
          <li><strong>Denomination</strong> — the face value as printed (<code>5c</code>, <code>1d</code>, <code>10pf</code>, etc.).</li>
          <li><strong>Color</strong> — descriptive, free text.</li>
          <li><strong>Perforation</strong> — typed as a decimal, e.g. <code>12.5</code>.</li>
          <li><strong>Watermark</strong> — descriptive, free text.</li>
          <li><strong>Gum Condition</strong> — Mint Never Hinged, Mint Lightly Hinged, Used, etc.</li>
          <li><strong>Centering</strong> — Superb through Space Filler.</li>
          <li><strong>Country</strong> (rarely needed) — overrides the inherited country from the collection. Leave blank in most cases.</li>
          <li><strong>Purchase Price</strong> — what you paid, in whatever currency you set in Settings.</li>
          <li><strong>Purchase Date</strong> — when you acquired it.</li>
          <li><strong>Source</strong> — dealer name, show, eBay seller, etc.</li>
          <li><strong>Quantity</strong> — set above 1 to track duplicates.</li>
          <li><strong>Tradeable</strong> — check this to surface the stamp in the Trading Stock smart collection.</li>
          <li><strong>Notes</strong> — anything else.</li>
          <li><strong>Image</strong> — drag a photo onto the box, or click to pick one.</li>
        </ul>

        <Tip>
          You don&apos;t have to fill in every field. Many stamps don&apos;t
          have a meaningful watermark or perforation, and that&apos;s fine —
          leave them blank.
        </Tip>
      </>
    ),
  },

  // ---------- Bulk operations ----------
  {
    id: 'bulk',
    title: 'Working with many stamps at once',
    body: (
      <>
        <p>
          Hinged is designed so that updating fifty stamps takes about as
          long as updating one. The trick is selection: pick more than one
          stamp at a time, and bulk actions appear.
        </p>

        <h4>Selecting multiple stamps</h4>
        <ul>
          <li><strong>Click</strong> a row to select that single stamp.</li>
          <li><strong>⌘-click</strong> (Mac) or <strong>Ctrl-click</strong> (Windows/Linux) to add or remove a stamp from your selection. Use this to pick non-adjacent rows.</li>
          <li><strong>Shift-click</strong> a row to select a range from the previously-clicked stamp to this one.</li>
          <li><strong>⌘A</strong> / <strong>Ctrl+A</strong> to select every stamp currently visible.</li>
          <li><strong>Escape</strong> to clear the selection.</li>
        </ul>

        <h4>The bulk toolbar</h4>
        <p>
          When more than one stamp is selected, a strip across the top of
          the stamp list appears with the most-used bulk actions:
          <strong> Mark Owned</strong>, <strong>Mark Wanted</strong>,
          <strong> Delete</strong>, <strong>Clear</strong>. Click any one
          and it applies to every selected stamp at once.
        </p>

        <h4>The right-click menu (more actions)</h4>
        <p>
          For more options, right-click any selected row. A small menu
          appears with options to set Status, Gum Condition, Centering,
          Tradeable, or move every selected stamp to a different album.
        </p>

        <h4>Copy as a spreadsheet row</h4>
        <p>
          With one or more rows selected, press <kbd>⌘C</kbd> /
          <kbd> Ctrl+C</kbd>. Hinged copies them to your clipboard as
          tab-separated values. Paste into Excel, Numbers, or any text
          editor and the columns line up.
        </p>

        <Tip>
          The bulk actions only ever affect the stamps you&apos;ve selected.
          If you&apos;re unsure which stamps will be touched, look at the
          highlighted (blue) rows.
        </Tip>
      </>
    ),
  },

  // ---------- Smart collections ----------
  {
    id: 'smart',
    title: 'Smart collections',
    body: (
      <>
        <p>
          The <strong>Smart Collections</strong> section at the top of the
          sidebar shows views that are computed automatically. They cut
          across all your collections and albums. You don&apos;t add or
          remove stamps from them directly — you change tags on stamps and
          the smart collections update themselves.
        </p>

        <h4>The six built-in smart collections</h4>
        <ul>
          <li><strong>All Owned</strong> — every stamp marked Owned.</li>
          <li><strong>Want List</strong> — every stamp marked Wanted. The shopping list to take to your next show.</li>
          <li><strong>Not Collecting</strong> — stamps you&apos;ve looked at and explicitly decided are out of scope. Useful so they don&apos;t keep showing up in lists.</li>
          <li><strong>Recent Additions</strong> — stamps added in the last 30 days. A useful at-a-glance view of what&apos;s new.</li>
          <li><strong>Trading Stock</strong> — duplicates (any stamp with Quantity above 1) and anything you&apos;ve marked Tradeable. Your trade inventory.</li>
          <li><strong>Trash</strong> — stamps you&apos;ve deleted. They sit here until you Empty Trash. See <em>Backups and safety</em>.</li>
        </ul>

        <Tip>
          You can combine a smart collection with the search and status
          filters at the top of the stamp list. For example: pick
          <em> Recent Additions</em>, then type <code>Germany</code> in the
          search box, to see only newly-added German stamps.
        </Tip>
      </>
    ),
  },

  // ---------- Trading & duplicates ----------
  {
    id: 'trading',
    title: 'Tracking duplicates and trades',
    body: (
      <>
        <p>
          Most collectors end up with duplicates — extra copies of the same
          stamp, picked up in mixed lots or accumulated over the years.
          Hinged has two fields for tracking them.
        </p>

        <h4>Quantity</h4>
        <p>
          Every stamp has a <strong>Quantity</strong> field, default 1. Set
          it higher when you have more than one copy. The quantity shows in
          the stamp list&apos;s <em>Qty</em> column, and any stamp with
          quantity above 1 appears in the Trading Stock smart collection.
        </p>

        <h4>Tradeable</h4>
        <p>
          Some stamps you&apos;d rather keep, even if they&apos;re duplicates
          (the second copy is in better condition, sentimental value, etc.).
          To mark a stamp as available for trade, check the
          <strong> Tradeable</strong> checkbox in the detail pane. A small
          ↔ badge appears next to it in the stamp list, and it&apos;s
          included in the Trading Stock smart collection regardless of its
          quantity.
        </p>

        <h4>Sharing your trade list</h4>
        <p>
          To send another collector a list of your tradeable stamps:
        </p>
        <ol className="help-steps">
          <li>Click the <strong>Trading Stock</strong> smart collection in the sidebar.</li>
          <li>Choose <strong>File &rarr; Export CSV (Current View)&hellip;</strong> to write the list as a CSV file.</li>
          <li>Send the file by email, or use <strong>File &rarr; Export Selected Album as Template&hellip;</strong> instead if you want to share a re-importable Hinged file.</li>
        </ol>
      </>
    ),
  },

  // ---------- Templates ----------
  {
    id: 'templates',
    title: 'Templates: sharing catalog scaffolding',
    body: (
      <>
        <p>
          A template is a single file (ending in <code>.hinged-template.json</code>)
          containing the structure of a catalog range — every catalog
          number, year, denomination, color, and country prefix — but
          <em> none</em> of your personal information (no ownership status,
          no condition, no prices, no notes, no images).
        </p>
        <p>
          Templates are meant to be shared between collectors. If one
          collector has carefully catalogued <em>US Scott 1–1000</em>,
          they can export that work as a template and send it to anyone
          else, and that person can apply it to their own Hinged collection.
        </p>

        <h4>Why templates instead of a built-in catalog?</h4>
        <p>
          Catalog data — the contents of a published Scott or Stanley
          Gibbons catalog — is copyrighted by the publisher and licensed
          expensively to commercial software. Hinged ships zero catalog
          data so it can stay free. Templates are how the collector
          community can share its own work safely. The format and the
          tools are open; what goes into any given template is up to the
          person who exports it.
        </p>

        <h4>Applying a template you&apos;ve been given</h4>
        <ol className="help-steps">
          <li>Choose <strong>File &rarr; Apply Template&hellip;</strong></li>
          <li>Pick the template file (it ends in <code>.hinged-template.json</code>).</li>
          <li>
            A small window shows you the template&apos;s name, description,
            stamp count, catalog system, and country. Pick which collection
            to add the new album to (or let Hinged make a new collection
            for you), and adjust the album name if you wish.
          </li>
          <li>Click <strong>Apply</strong>.</li>
        </ol>
        <p>
          Every stamp from the template is added to the new album with
          status <strong>Wanted</strong>. As you acquire stamps, change
          their status to <strong>Owned</strong> and the smart collections
          update automatically.
        </p>

        <h4>Exporting one of your albums as a template</h4>
        <ol className="help-steps">
          <li>Click an album in the sidebar to select it.</li>
          <li>Choose <strong>File &rarr; Export Selected Album as Template&hellip;</strong></li>
          <li>Pick a save location and a filename.</li>
          <li>Send the resulting file to anyone you&apos;d like to share with.</li>
        </ol>
        <Tip>
          The export strips your personal data (status, condition, prices,
          notes, images) automatically, so you can share without leaking
          anything you&apos;d rather keep private.
        </Tip>
      </>
    ),
  },

  // ---------- CSV import ----------
  {
    id: 'csv-import',
    title: 'Importing from a spreadsheet',
    body: (
      <>
        <p>
          If your collection is currently in Excel, Numbers, Google Sheets,
          or any other spreadsheet, Hinged can import it directly. There are
          two ways to bring in spreadsheet data: importing a saved CSV file,
          or pasting from your clipboard.
        </p>

        <h4>Importing a CSV file</h4>
        <ol className="help-steps">
          <li>In your spreadsheet, save the file as CSV. (In Excel: <em>File &rarr; Save As &rarr; CSV</em>. In Numbers: <em>File &rarr; Export To &rarr; CSV</em>.)</li>
          <li>In Hinged, click the album in the sidebar that should receive the stamps.</li>
          <li>Choose <strong>File &rarr; Import CSV into Selected Album&hellip;</strong></li>
          <li>Pick your CSV file. The column-mapping window opens.</li>
        </ol>

        <h4>Pasting directly from a spreadsheet</h4>
        <ol className="help-steps">
          <li>In your spreadsheet, highlight the rows you want to import (including the header row, if you have one).</li>
          <li>Copy them with <kbd>⌘C</kbd> / <kbd>Ctrl+C</kbd>.</li>
          <li>Switch to Hinged. Click an album in the sidebar.</li>
          <li>Click anywhere on the stamp-list area (the middle pane), but not inside one of the input boxes.</li>
          <li>Press <kbd>⌘V</kbd> / <kbd>Ctrl+V</kbd>. The same column-mapping window opens.</li>
        </ol>

        <h4>The column-mapping window</h4>
        <p>
          However your data got in, you&apos;ll now see a window that lists
          every Hinged field on the left, with a dropdown next to each one
          showing the columns it found in your data. For most fields,
          Hinged guesses the right match automatically by reading the
          column name (it understands &ldquo;Catalog #&rdquo;, &ldquo;Cat
          No.&rdquo;, &ldquo;SG #&rdquo;, &ldquo;Year of Issue&rdquo;, and
          many other variants). Look over its guesses and adjust any that
          aren&apos;t right.
        </p>

        <p>The <strong>Catalog Number</strong> field is required. Everything else is optional.</p>

        <h4>Handling duplicates</h4>
        <p>
          If a row has a catalog number that already exists in the album,
          you have three choices:
        </p>
        <ul>
          <li><strong>Skip duplicates</strong> — leave the existing stamp untouched.</li>
          <li><strong>Update existing entries</strong> — overwrite the existing stamp&apos;s fields with the imported row&apos;s.</li>
          <li><strong>Create new entries</strong> — add the imported row as a separate stamp anyway.</li>
        </ul>
        <p>
          Click <strong>Import</strong> and Hinged tells you how many rows
          it imported, updated, and skipped.
        </p>

        <Warn>
          If you&apos;re not sure how the import will go, run a test on a
          small sample first — copy three rows, paste, and import. Check
          they look right, then go back and import the full set.
        </Warn>
      </>
    ),
  },

  // ---------- Exporting & sharing ----------
  {
    id: 'exporting',
    title: 'Exporting and sharing',
    body: (
      <>
        <p>
          Hinged can export your data in several different formats, depending
          on what you want to do with it.
        </p>

        <h4>CSV (for spreadsheets and other apps)</h4>
        <p>
          <strong>File &rarr; Export CSV (Current View)&hellip;</strong>
          writes whatever stamps are currently visible in the middle pane to
          a CSV file. The filtering matters — if a smart collection or
          search is active, only those stamps are exported. To export only
          your wantlist, click <em>Want List</em> in the sidebar first.
        </p>

        <h4>Hinged backup (.hinged file)</h4>
        <p>
          <strong>File &rarr; Export Backup&hellip;</strong> (or <kbd>⌘⇧E</kbd>)
          writes your <em>entire</em> collection — every collection, every
          album, every stamp, every country, every custom catalog, and all
          stamp images — into one big JSON file. This is the format to use
          when:
        </p>
        <ul>
          <li>Moving your collection to a new computer</li>
          <li>Sharing your full library with another collector</li>
          <li>Making a snapshot before a risky change</li>
        </ul>

        <h4>Template (.hinged-template.json)</h4>
        <p>
          <strong>File &rarr; Export Selected Album as Template&hellip;</strong>
          writes one album&apos;s catalog scaffolding without your personal
          data. Use this when you want to share what stamps exist in some
          range, but not what you own. See the <em>Templates</em> topic.
        </p>

        <h4>Copy as TSV (one-off, into the clipboard)</h4>
        <p>
          For quickly grabbing a few rows: select one or more stamps,
          press <kbd>⌘C</kbd> / <kbd>Ctrl+C</kbd>, switch to your
          spreadsheet or notes app, and paste. The columns line up.
        </p>
      </>
    ),
  },

  // ---------- Backups ----------
  {
    id: 'backups',
    title: 'Backups and safety',
    body: (
      <>
        <p>
          Your stamp data lives in a single small database file on your
          computer. Computers fail; files get accidentally deleted; bad
          things sometimes happen. Hinged has three independent layers
          of protection for your collection.
        </p>

        <h4>1. Trash (for accidental stamp deletes)</h4>
        <p>
          When you delete a single stamp, it doesn&apos;t vanish — it moves
          to the <strong>Trash</strong> smart collection in the sidebar.
          Click Trash to see what&apos;s there. To get a stamp back,
          click it and press <strong>Restore</strong>; or select multiple
          and click <strong>Restore (N)</strong> in the toolbar. Stamps
          stay in trash until you click <strong>Empty Trash</strong>.
        </p>
        <Warn>
          Deleting a whole album or collection (with the × button on a
          sidebar item) is permanent and is <em>not</em> sent to Trash.
          You&apos;ll see a warning before the deletion. If you do delete by
          mistake, your most recent backup is the way back.
        </Warn>

        <h4>2. Manual backups (.hinged file)</h4>
        <p>
          Press <kbd>⌘⇧E</kbd> / <kbd>Ctrl+Shift+E</kbd> any time to write
          your full collection to a single JSON file. Keep these somewhere
          safe — a USB stick, an external drive, a Dropbox or iCloud
          folder. To restore, choose <strong>File &rarr; Import Backup
          (Replace)&hellip;</strong> and pick the file.
        </p>

        <h4>3. Automatic backups on launch</h4>
        <p>
          Hinged can write a fresh timestamped backup every time you start
          the app, with no effort on your part. To enable:
        </p>
        <ol className="help-steps">
          <li>Choose <strong>Tools &rarr; Settings&hellip;</strong></li>
          <li>Find the <em>Auto-backup on launch</em> section.</li>
          <li>Click <strong>Choose&hellip;</strong> next to <em>Backup Folder</em> and pick a location. Many people use a Dropbox or iCloud folder so backups sync to the cloud automatically.</li>
          <li>Set <em>Keep last N backups</em> to how many to retain. The default of 5 is fine for most people.</li>
          <li>Quit Hinged.</li>
          <li>Re-open Hinged. Check your backup folder — a fresh file should be there.</li>
        </ol>
        <Tip>
          The auto-backup runs once per launch, so quit and re-open every
          so often if you want frequent snapshots. Power users sometimes
          quit at the end of every cataloguing session to lock in a
          fresh backup.
        </Tip>

        <h4>The data folder itself</h4>
        <p>
          For the absolutely-belt-and-suspenders backup, you can also copy
          the entire Hinged data folder to safe storage:
        </p>
        <ul>
          <li><strong>macOS</strong>: <code>~/Library/Application Support/Hinged/</code></li>
          <li><strong>Windows</strong>: <code>%APPDATA%\Hinged\</code></li>
          <li><strong>Linux</strong>: <code>~/.config/Hinged/</code></li>
        </ul>
        <p>
          Inside is the database (<code>hinged.db</code>) and an
          <code> Images/</code> subfolder. Quit Hinged before copying, and
          the resulting copy is a complete snapshot.
        </p>
      </>
    ),
  },

  // ---------- Search & filter ----------
  {
    id: 'finding',
    title: 'Finding stamps',
    body: (
      <>
        <p>
          As your collection grows, finding a specific stamp becomes
          important. Hinged offers three independent ways to narrow what
          you see, and they combine.
        </p>

        <h4>The sidebar selection</h4>
        <p>
          The first level of filtering is the sidebar. Click a smart
          collection, a regular collection, or an album, and the middle
          pane only shows stamps from there.
        </p>

        <h4>The search box</h4>
        <p>
          The toolbar at the top of the stamp list has a search box. As you
          type, the list shrinks to only stamps whose catalog number,
          denomination, color, watermark, notes, or source contains your
          search text. The search ignores upper and lower case.
        </p>

        <h4>The status filter</h4>
        <p>
          The dropdown next to the search box restricts the list to stamps
          of a single status: Owned, Wanted, or Not Collecting. Use this
          combined with a sidebar selection to answer questions like:
        </p>
        <ul>
          <li>Which Albanian stamps am I looking for? <em>(sidebar: Albania album, status: Wanted)</em></li>
          <li>What recent purchases haven&apos;t I tagged yet? <em>(sidebar: Recent Additions, search: blank, status: blank)</em></li>
        </ul>

        <h4>Sorting</h4>
        <p>
          Catalog numbers always sort naturally:
          1, 2, 3, …, 10, 11, … 99, 100, …, 435, 435a, 435b, …, 999, 1000.
          Letter prefixes (C1, C2, C10, J1) are sorted in their own
          natural sequence. You don&apos;t need to do anything to get
          this — it just works.
        </p>
      </>
    ),
  },

  // ---------- Gap analysis ----------
  {
    id: 'gap',
    title: 'Gap analysis',
    body: (
      <>
        <p>
          Once your collection has grown, gap analysis helps you see what
          you&apos;re missing — both as a number (&ldquo;I&apos;m 47%
          complete&rdquo;) and as specific catalog numbers (&ldquo;I have
          Scott 1–35 and 45–60, but not 36–44&rdquo;).
        </p>

        <h4>Running an analysis</h4>
        <ol className="help-steps">
          <li>Choose <strong>Tools &rarr; Gap Analysis&hellip;</strong></li>
          <li>Pick a <strong>country</strong> from the dropdown.</li>
          <li>
            Adjust the <strong>year range</strong> if you want. Three
            shortcut buttons set common ranges: <em>Classic</em> (1840–1940),
            <em> Modern</em> (1941–2000), <em>Recent</em> (2001–today).
          </li>
          <li>Click <strong>Analyze</strong>.</li>
        </ol>

        <p>The right pane fills with results:</p>
        <ul>
          <li><strong>Owned</strong> — stamps you have, in the chosen country and range.</li>
          <li><strong>Wanted</strong> — stamps marked Wanted.</li>
          <li><strong>Completion</strong> — what percentage of stamps you have versus stamps you&apos;ve tracked (Owned ÷ (Owned + Wanted)).</li>
          <li><strong>Gaps</strong> — catalog numbers that fall <em>between</em> your lowest and highest entries but aren&apos;t in your collection at all. Useful for noticing &ldquo;I have 1–10 and 12–20 but not 11&rdquo;.</li>
        </ul>

        <Tip>
          The gap analysis only knows about stamps you&apos;ve added to
          Hinged. It can&apos;t tell you what catalog numbers <em>exist</em>
          beyond your collection. To see gaps relative to a full catalog
          range, apply a community template covering that range first
          (every catalog entry will be added as Wanted), then run gap
          analysis.
        </Tip>
      </>
    ),
  },

  // ---------- Settings ----------
  {
    id: 'settings',
    title: 'Settings: defaults and customization',
    body: (
      <>
        <p>
          Choose <strong>Tools &rarr; Settings&hellip;</strong> (or press
          <kbd> ⌘,</kbd>) to adjust how Hinged behaves.
        </p>

        <h4>Defaults for new stamps</h4>
        <p>
          When you add a stamp via Quick Add or the + Stamp button, these
          values are filled in automatically:
        </p>
        <ul>
          <li><strong>Default Catalog System</strong> — used when you create a new collection.</li>
          <li><strong>Default Status</strong> — Owned, Wanted, or Not Collecting. If you mostly add stamps you already own, set this to Owned. If you mostly add wantlist entries, set it to Wanted.</li>
          <li><strong>Default Gum Condition</strong> — set this if most of your stamps share a common condition (e.g. Mint Never Hinged).</li>
          <li><strong>Default Centering</strong> — same idea.</li>
          <li><strong>Currency Symbol</strong> — appears in front of purchase prices. Set to whatever you actually pay in.</li>
        </ul>
        <Tip>
          The defaults only affect new stamps. Existing stamps keep the values you&apos;ve already set.
        </Tip>

        <h4>Auto-backup on launch</h4>
        <p>See the <em>Backups and safety</em> topic.</p>

        <h4>Custom catalog systems</h4>
        <p>
          If you use a catalog beyond the six built-in options (e.g. a
          national specialized catalog, or a small-scale specialty list),
          add it here. Type a name, click <strong>Add</strong>, and the new
          system appears in the catalog-system dropdown when you create
          collections.
        </p>
      </>
    ),
  },

  // ---------- Countries ----------
  {
    id: 'countries',
    title: 'Countries and catalog prefixes',
    body: (
      <>
        <p>
          Hinged comes with about 180 countries pre-loaded. Each country
          can have a different prefix per catalog system, which is what
          lets the app display catalog numbers correctly: a U.S. stamp
          under Scott shows up as <code>US 1</code>, while the same
          country under Michel might show as <code>USA 1</code>.
        </p>

        <h4>Editing the country list</h4>
        <ol className="help-steps">
          <li>Choose <strong>Tools &rarr; Countries&hellip;</strong></li>
          <li>The left side lists every country. Search by typing in the box at the top.</li>
          <li>Click a country to select it. Its catalog prefixes for each system show on the right.</li>
          <li>Edit a prefix by clicking in its box and typing. Changes save automatically.</li>
          <li>Add a new country by typing a name in the bottom-left and clicking <strong>Add</strong>.</li>
          <li>Delete a country with the × button next to its name. Stamps that referenced it will have their country cleared but remain in your collection.</li>
        </ol>

        <Tip>
          Don&apos;t worry about getting the prefixes &ldquo;right&rdquo; on the first
          try. They&apos;re purely cosmetic — they affect how catalog numbers
          are displayed, not how data is stored. You can change them any
          time without losing data.
        </Tip>
      </>
    ),
  },

  // ---------- Keyboard shortcuts ----------
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    body: (
      <>
        <p>
          Hinged is faster with the keyboard than the mouse, especially for
          adding and editing lots of stamps. Here&apos;s the full reference.
          On a Mac, <kbd>⌘</kbd> is the Command key (the one with the
          cloverleaf symbol). On Windows/Linux, replace <kbd>⌘</kbd> with
          <kbd> Ctrl</kbd> and <kbd>⌥</kbd> with <kbd>Alt</kbd>.
        </p>

        <h4>App-wide</h4>
        <table className="shortcut-table">
          <tbody>
            <tr><td><kbd>⌘⇧N</kbd></td><td>New collection</td></tr>
            <tr><td><kbd>⌘⌥N</kbd></td><td>New album</td></tr>
            <tr><td><kbd>⌘⇧E</kbd></td><td>Export full backup</td></tr>
            <tr><td><kbd>⌘,</kbd></td><td>Settings</td></tr>
            <tr><td><kbd>⌘?</kbd> / <kbd>F1</kbd></td><td>This help window</td></tr>
            <tr><td><kbd>⌘Q</kbd></td><td>Quit Hinged (Mac)</td></tr>
          </tbody>
        </table>

        <h4>In the stamp list</h4>
        <table className="shortcut-table">
          <tbody>
            <tr><td><kbd>↑</kbd> / <kbd>↓</kbd></td><td>Move selection up / down</td></tr>
            <tr><td><kbd>⌘A</kbd></td><td>Select all visible stamps</td></tr>
            <tr><td><kbd>⌘-click</kbd></td><td>Add or remove a stamp from the selection</td></tr>
            <tr><td><kbd>⇧-click</kbd></td><td>Extend selection to a range</td></tr>
            <tr><td><kbd>Delete</kbd> / <kbd>Backspace</kbd></td><td>Move selected stamps to Trash</td></tr>
            <tr><td><kbd>⌘C</kbd></td><td>Copy selected stamps to the clipboard as TSV</td></tr>
            <tr><td><kbd>⌘V</kbd></td><td>Paste tab-separated data as new stamps (album must be selected)</td></tr>
            <tr><td><kbd>Escape</kbd></td><td>Clear the stamp selection</td></tr>
          </tbody>
        </table>

        <h4>In the Quick Add bar</h4>
        <table className="shortcut-table">
          <tbody>
            <tr><td><kbd>Tab</kbd></td><td>Move to the next field</td></tr>
            <tr><td><kbd>Enter</kbd></td><td>Add the stamp and clear the bar</td></tr>
            <tr><td><kbd>Escape</kbd></td><td>Clear the bar without adding</td></tr>
          </tbody>
        </table>
      </>
    ),
  },

  // ---------- Files on disk ----------
  {
    id: 'files',
    title: 'Where your collection lives on disk',
    body: (
      <>
        <p>
          Some collectors like to know exactly where their data is stored,
          so they can back it up themselves, copy it between computers,
          or just have peace of mind. Here&apos;s the layout.
        </p>

        <h4>The Hinged data folder</h4>
        <ul>
          <li><strong>macOS</strong>: <code>~/Library/Application Support/Hinged/</code></li>
          <li><strong>Windows</strong>: <code>%APPDATA%\Hinged\</code> (typically <code>C:\Users\YOU\AppData\Roaming\Hinged\</code>)</li>
          <li><strong>Linux</strong>: <code>~/.config/Hinged/</code></li>
        </ul>
        <p>
          On macOS, the easiest way to open this folder: in Finder, hold
          <kbd> ⌥</kbd> (Option) while clicking the <em>Go</em> menu, then
          choose <em>Library</em>. Open <em>Application Support</em>, then
          <em> Hinged</em>.
        </p>

        <h4>What&apos;s inside</h4>
        <ul>
          <li><code>hinged.db</code> — the database. This is your collection.</li>
          <li><code>hinged.db-wal</code>, <code>hinged.db-shm</code> — temporary helper files. SQLite manages them; you can ignore them.</li>
          <li><code>Images/</code> — one image file per stamp that has one. Filenames are random unique IDs.</li>
        </ul>

        <h4>Copying or moving your collection</h4>
        <ol className="help-steps">
          <li>Quit Hinged.</li>
          <li>Copy <em>the entire Hinged folder</em> (not just the .db file — the Images folder matters too) to your destination.</li>
          <li>If moving to a new computer, paste it into the same location on that machine and re-launch Hinged.</li>
        </ol>
        <Warn>
          Don&apos;t open Hinged on two computers using the same data folder
          at once (e.g. via cloud sync). It can confuse the database and
          you may lose recent changes. Quit on one machine before opening
          on the other.
        </Warn>

        <h4>The packaged app vs the dev version</h4>
        <p>
          If you&apos;re also running Hinged from source (<code>npm run dev</code>),
          that uses a <em>different</em> folder named <code>hinged</code>
          (lowercase, no &ldquo;H&rdquo;). Dev experiments don&apos;t touch
          your real collection. To move data between the two, export a
          backup from one and import it into the other.
        </p>
      </>
    ),
  },

  // ---------- Troubleshooting ----------
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    body: (
      <>
        <h4>The app won&apos;t open on macOS — &ldquo;damaged&rdquo; warning</h4>
        <p>
          This shouldn&apos;t happen with the current signed and notarized
          builds. If it does, the easiest fix is to right-click Hinged.app
          (instead of double-clicking) and choose <strong>Open</strong> from
          the context menu. Confirm the warning, and macOS won&apos;t bother
          you again.
        </p>

        <h4>The app won&apos;t open on Windows — SmartScreen blocked it</h4>
        <p>
          Click <strong>More info</strong> in the warning, then
          <strong> Run anyway</strong>.
        </p>

        <h4>I deleted a stamp by accident</h4>
        <p>
          Click the <strong>Trash</strong> smart collection in the sidebar.
          Find the stamp, click it, and choose <strong>Restore</strong>.
        </p>

        <h4>I deleted a whole album and want it back</h4>
        <p>
          Album and collection deletions are permanent and aren&apos;t sent
          to Trash. If you have auto-backup enabled, restore the most
          recent backup from your backup folder via <strong>File &rarr;
          Import Backup (Replace)&hellip;</strong>. If not, this is when
          you&apos;ll wish you had — see <em>Backups and safety</em> and
          turn it on.
        </p>

        <h4>My catalog numbers aren&apos;t showing the country prefix</h4>
        <p>
          Two things must be true: the collection that contains the stamp
          must have a country set, and that country must have a prefix for
          the collection&apos;s catalog system. Open <strong>Tools &rarr;
          Countries&hellip;</strong>, find the country, and check that the
          prefix for the relevant catalog system (Scott, Michel, etc.) is
          filled in.
        </p>

        <h4>CSV import didn&apos;t bring in some columns</h4>
        <p>
          The column-mapping window only imports columns you&apos;ve mapped.
          If a field shows <em>— Skip —</em> in the dropdown, that column
          is ignored. Re-run the import and use the dropdowns to map every
          field you want.
        </p>

        <h4>I can&apos;t find a country in the dropdown</h4>
        <p>
          The country list ships with about 180 entries but you can edit
          it. Open <strong>Tools &rarr; Countries&hellip;</strong>, scroll
          (or search), and add the missing country at the bottom-left.
        </p>

        <h4>The stamp list seems empty even though I have stamps</h4>
        <p>
          Check three things, in order:
        </p>
        <ol className="help-steps">
          <li>The sidebar selection — what&apos;s highlighted? If it&apos;s a specific album, the list only shows that album. Click a different item, like <em>All Owned</em>, to see more.</li>
          <li>The search box — is anything typed in it? Clear it.</li>
          <li>The status filter — is it set to a specific status that excludes most of your stamps? Set to <em>All statuses</em>.</li>
        </ol>

        <h4>The auto-backup folder is filling up</h4>
        <p>
          Open <strong>Tools &rarr; Settings&hellip;</strong> and lower the
          <em> Keep last N backups</em> number. Hinged will trim down to
          that count on the next launch.
        </p>

        <h4>None of the above</h4>
        <p>
          See the next topic for how to file a bug report or get in touch.
        </p>
      </>
    ),
  },

  // ---------- Glossary ----------
  {
    id: 'glossary',
    title: 'Glossary',
    body: (
      <>
        <p>Terms used throughout Hinged and this help system.</p>
        <dl className="help-glossary">
          <dt>Album</dt>
          <dd>A subdivision of a collection — like a section in a real-world stamp album. Holds a list of stamps.</dd>

          <dt>Album view</dt>
          <dd>The middle pane of the window, when filtered to one album.</dd>

          <dt>Auto-backup</dt>
          <dd>A timestamped backup of your whole collection, written each time Hinged starts. Configured in Settings.</dd>

          <dt>Backup</dt>
          <dd>A single <code>.hinged</code> file containing your entire collection — all collections, albums, stamps, countries, custom catalogs, and images. Restorable on any machine.</dd>

          <dt>Bulk action</dt>
          <dd>An action applied to many stamps at once after selecting multiple rows.</dd>

          <dt>Catalog system</dt>
          <dd>One of the published philatelic catalogs (Scott, Stanley Gibbons, Michel, Yvert, Sakura, Facit) or a custom one of your own. Determines how catalog numbers are displayed.</dd>

          <dt>Collection</dt>
          <dd>A top-level grouping in the sidebar, anchored to one catalog system and optionally one country. Owns one or more albums.</dd>

          <dt>CSV</dt>
          <dd>Comma-separated values. A plain text format for tabular data, opened by every spreadsheet program. Hinged imports and exports CSV.</dd>

          <dt>Custom catalog</dt>
          <dd>A user-defined catalog system, added in Settings. Behaves like the built-in catalogs but with your own name.</dd>

          <dt>Detail pane</dt>
          <dd>The right column of the window, showing every field of the currently-selected stamp.</dd>

          <dt>Gap analysis</dt>
          <dd>A tool under Tools that shows your completion percentage and missing catalog numbers for a country and year range.</dd>

          <dt>Quick Add bar</dt>
          <dd>The single-line entry form at the top of the stamp list. Lets you add stamps very fast without using a mouse.</dd>

          <dt>Sidebar</dt>
          <dd>The narrow left column of the window, showing smart collections and your Collections / Albums tree.</dd>

          <dt>Smart collection</dt>
          <dd>A view that&apos;s computed automatically based on stamp tags (e.g. All Owned, Want List). You don&apos;t add stamps to smart collections directly.</dd>

          <dt>Stamp list</dt>
          <dd>The middle pane of the window, showing the stamps that match the current sidebar selection and any filters.</dd>

          <dt>Status</dt>
          <dd>Each stamp&apos;s collection status: Owned, Wanted, or Not Collecting.</dd>

          <dt>Template</dt>
          <dd>A <code>.hinged-template.json</code> file containing the catalog scaffolding for a range of stamps (numbers, years, denominations, colors), without ownership data. Meant to be shared between collectors.</dd>

          <dt>Trading Stock</dt>
          <dd>A smart collection showing duplicates (quantity above 1) and stamps marked Tradeable.</dd>

          <dt>Trash</dt>
          <dd>A smart collection holding stamps you&apos;ve deleted. Stamps stay there until you Empty Trash.</dd>

          <dt>TSV</dt>
          <dd>Tab-separated values. Like CSV but using tab characters between columns. The default format when copying from spreadsheets. Hinged accepts both CSV and TSV.</dd>
        </dl>
      </>
    ),
  },

  // ---------- Getting help ----------
  {
    id: 'support',
    title: 'Getting help and reporting issues',
    body: (
      <>
        <p>
          Hinged is a free project maintained by one person (so far), and
          your feedback genuinely shapes the app. There are two ways to
          get help or pass things back.
        </p>

        <h4>For bugs and feature requests</h4>
        <p>
          The fastest path is to <a href="https://github.com/factus10/Hinged/issues">file an issue on GitHub</a>.
          A good bug report includes:
        </p>
        <ul>
          <li>Your operating system (e.g. macOS 14, Windows 11)</li>
          <li>The version of Hinged you&apos;re using (visible in <strong>Hinged → About</strong> on Mac, or <strong>Help → About</strong> on Windows/Linux — coming soon)</li>
          <li>What you were doing when the problem happened</li>
          <li>What you expected vs. what actually happened</li>
        </ul>
        <p>
          For a feature request, the most useful thing you can include is
          the <em>problem</em> you&apos;re trying to solve, not just the
          feature you have in mind. Often there&apos;s a simpler answer
          than the original suggestion.
        </p>

        <h4>For general questions</h4>
        <p>
          You can also email the contact address listed in the
          repository&apos;s <a href="https://github.com/factus10/Hinged/blob/main/LICENSE">LICENSE file</a>. Please be patient — it&apos;s one
          person checking, and replies might take a few days.
        </p>

        <h4>The website</h4>
        <p>
          <a href="https://hinged-stamps.com/">hinged-stamps.com</a> has the
          latest downloads and an FAQ.
        </p>

        <Tip>
          If you find Hinged useful, the most valuable thing you can do is
          tell another stamp collector about it. Word-of-mouth is how a
          small free project finds the people it&apos;s for.
        </Tip>
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
  const contentRef = useRef<HTMLDivElement>(null);

  const topic = TOPICS.find((t) => t.id === topicId) ?? TOPICS[0]!;

  // Reset to top of the content pane every time the topic changes.
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [topicId]);

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
        <div className="help-content" ref={contentRef}>
          <h3>{topic.title}</h3>
          {topic.body}
        </div>
      </div>
    </Dialog>
  );
}
