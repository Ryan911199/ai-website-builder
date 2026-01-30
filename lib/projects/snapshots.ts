import { db } from '../db';
import { snapshots } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

/**
 * Create a new snapshot for a project
 * @param projectId - The project ID
 * @param files - Object mapping file paths to content
 * @param messageId - Optional message ID that triggered this snapshot
 * @returns The created snapshot
 */
export async function createSnapshot(
  projectId: string,
  files: Record<string, string>,
  messageId?: string
): Promise<Snapshot> {
  const id = nanoid();
  const now = new Date();

  const result = await db
    .insert(snapshots)
    .values({
      id,
      projectId,
      files: JSON.stringify(files),
      messageId,
      createdAt: now,
    })
    .returning();

  if (!result[0]) {
    throw new Error('Failed to create snapshot');
  }

  return result[0];
}

/**
 * Get a snapshot by ID
 * @param snapshotId - The snapshot ID
 * @returns The snapshot with parsed files, or null if not found
 */
export async function getSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const result = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, snapshotId))
    .limit(1);

  return result[0] || null;
}

/**
 * List all snapshots for a project, sorted by creation date (newest first)
 * @param projectId - The project ID
 * @returns Array of snapshots sorted by createdAt descending
 */
export async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const result = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.projectId, projectId))
    .orderBy(desc(snapshots.createdAt));

  return result;
}

/**
 * Delete a snapshot
 * @param snapshotId - The snapshot ID
 */
export async function deleteSnapshot(snapshotId: string): Promise<void> {
  await db.delete(snapshots).where(eq(snapshots.id, snapshotId));
}
