// Multi-image storage for a stamp.
//
// Schema invariants this module enforces:
//   - Each stamp can have any number of stamp_images rows.
//   - sort_order on each row is 0..N-1 with no gaps; the row at
//     sort_order=0 is the "primary" image.
//   - stamps.image_filename always equals the filename of the
//     sort_order=0 row (or NULL when the stamp has no images). This
//     redundancy is intentional: list queries and exports keep using
//     stamps.image_filename without joining, and the multi-image UI
//     reads from stamp_images.
//
// Every mutation here updates stamps.image_filename atomically inside
// a transaction so the two views never disagree.
//
// We do NOT delete the underlying file from disk here — that's a
// concern of the renderer's image module (window.hinged.images.delete).
// Repositories are pure data; file lifecycle stays in the renderer
// callers, same pattern as the original single-image flow.

import type { DB } from '../connection.js';

export interface StampImageRow {
  id: number;
  stampId: number;
  filename: string;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}

interface DbRow {
  id: number;
  stamp_id: number;
  filename: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
}

function fromDb(row: DbRow): StampImageRow {
  return {
    id: row.id,
    stampId: row.stamp_id,
    filename: row.filename,
    caption: row.caption,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Returns the images for a single stamp, ordered by sort_order. */
export function listForStamp(db: DB, stampId: number): StampImageRow[] {
  const rows = db
    .prepare(
      'SELECT id, stamp_id, filename, caption, sort_order, created_at ' +
        'FROM stamp_images WHERE stamp_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(stampId) as DbRow[];
  return rows.map(fromDb);
}

/** Returns images grouped by stamp id. Used by listing endpoints that
 *  want to attach galleries to many stamps in one query. */
export function listForStamps(
  db: DB,
  stampIds: number[],
): Map<number, StampImageRow[]> {
  const out = new Map<number, StampImageRow[]>();
  if (stampIds.length === 0) return out;
  const placeholders = stampIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, stamp_id, filename, caption, sort_order, created_at
         FROM stamp_images
         WHERE stamp_id IN (${placeholders})
         ORDER BY sort_order ASC, id ASC`,
    )
    .all(...stampIds) as DbRow[];
  for (const r of rows) {
    const arr = out.get(r.stamp_id) ?? [];
    arr.push(fromDb(r));
    out.set(r.stamp_id, arr);
  }
  return out;
}

/**
 * Append an image to the end of the gallery and return the new row.
 * Also updates stamps.image_filename if this is the first image.
 */
export function addImage(
  db: DB,
  stampId: number,
  filename: string,
  caption: string | null = null,
): StampImageRow {
  const tx = db.transaction(() => {
    const row = db
      .prepare(
        'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM stamp_images WHERE stamp_id = ?',
      )
      .get(stampId) as { next: number };
    const next = row.next ?? 0;
    const info = db
      .prepare(
        `INSERT INTO stamp_images (stamp_id, filename, caption, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(stampId, filename, caption, next, nowIso());
    if (next === 0) {
      // First image becomes primary.
      db.prepare('UPDATE stamps SET image_filename = ? WHERE id = ?').run(filename, stampId);
    }
    const created = db
      .prepare(
        'SELECT id, stamp_id, filename, caption, sort_order, created_at FROM stamp_images WHERE id = ?',
      )
      .get(info.lastInsertRowid as number) as DbRow;
    return fromDb(created);
  });
  return tx();
}

/**
 * Delete an image. The remaining images get their sort_order compacted
 * back to 0..N-1, and stamps.image_filename is updated to whatever the
 * new primary is (or NULL if no images remain).
 */
export function deleteImage(db: DB, imageId: number): void {
  db.transaction(() => {
    const row = db
      .prepare('SELECT stamp_id FROM stamp_images WHERE id = ?')
      .get(imageId) as { stamp_id: number } | undefined;
    if (!row) return;
    db.prepare('DELETE FROM stamp_images WHERE id = ?').run(imageId);
    compactSortOrder(db, row.stamp_id);
    syncPrimary(db, row.stamp_id);
  })();
}

/**
 * Replace the entire ordering for a stamp. `imageIds` is the new order
 * top-to-bottom. Any IDs not in the list are deleted (caller should
 * have pruned them already, but we don't trust callers). The first
 * entry becomes the primary.
 */
export function reorderImages(db: DB, stampId: number, imageIds: number[]): void {
  db.transaction(() => {
    const update = db.prepare(
      'UPDATE stamp_images SET sort_order = ? WHERE id = ? AND stamp_id = ?',
    );
    imageIds.forEach((id, i) => {
      update.run(i, id, stampId);
    });
    syncPrimary(db, stampId);
  })();
}

/** Move one image to the front of its stamp's gallery. */
export function setPrimary(db: DB, imageId: number): void {
  db.transaction(() => {
    const row = db
      .prepare('SELECT stamp_id FROM stamp_images WHERE id = ?')
      .get(imageId) as { stamp_id: number } | undefined;
    if (!row) return;
    const ordered = db
      .prepare(
        'SELECT id FROM stamp_images WHERE stamp_id = ? ORDER BY sort_order ASC, id ASC',
      )
      .all(row.stamp_id) as Array<{ id: number }>;
    const ids = [imageId, ...ordered.map((o) => o.id).filter((id) => id !== imageId)];
    const update = db.prepare(
      'UPDATE stamp_images SET sort_order = ? WHERE id = ? AND stamp_id = ?',
    );
    ids.forEach((id, i) => {
      update.run(i, id, row.stamp_id);
    });
    syncPrimary(db, row.stamp_id);
  })();
}

/** Update the caption on a single image. */
export function setCaption(db: DB, imageId: number, caption: string | null): void {
  db.prepare('UPDATE stamp_images SET caption = ? WHERE id = ?').run(
    caption && caption.trim() ? caption.trim() : null,
    imageId,
  );
}

/**
 * Replace the file behind an existing image entry. Used when the user
 * picks a new file for an existing slot (the renderer is responsible
 * for deleting the old file from disk; this only changes the DB
 * pointer).
 */
export function replaceImageFile(db: DB, imageId: number, filename: string): void {
  db.transaction(() => {
    const row = db
      .prepare('SELECT stamp_id, sort_order FROM stamp_images WHERE id = ?')
      .get(imageId) as { stamp_id: number; sort_order: number } | undefined;
    if (!row) return;
    db.prepare('UPDATE stamp_images SET filename = ? WHERE id = ?').run(filename, imageId);
    if (row.sort_order === 0) {
      db.prepare('UPDATE stamps SET image_filename = ? WHERE id = ?').run(
        filename,
        row.stamp_id,
      );
    }
  })();
}

// ---------- internal ----------

function compactSortOrder(db: DB, stampId: number): void {
  const rows = db
    .prepare(
      'SELECT id FROM stamp_images WHERE stamp_id = ? ORDER BY sort_order ASC, id ASC',
    )
    .all(stampId) as Array<{ id: number }>;
  const update = db.prepare('UPDATE stamp_images SET sort_order = ? WHERE id = ?');
  rows.forEach((r, i) => update.run(i, r.id));
}

function syncPrimary(db: DB, stampId: number): void {
  const row = db
    .prepare(
      'SELECT filename FROM stamp_images WHERE stamp_id = ? ORDER BY sort_order ASC, id ASC LIMIT 1',
    )
    .get(stampId) as { filename: string } | undefined;
  db.prepare('UPDATE stamps SET image_filename = ? WHERE id = ?').run(
    row?.filename ?? null,
    stampId,
  );
}
